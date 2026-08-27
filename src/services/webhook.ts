import * as crypto from "crypto";
import camelcaseKeys from "camelcase-keys";
import { z } from "zod";
import { fromJson } from "@bufbuild/protobuf";
import {
    ChargeMessageJson,
    ChargeMessageSchema,
    ContractMessageJson,
    ContractMessageSchema,
    MerchantWebhookMessageJson,
    MerchantWebhookMessageSchema,
    UserAccountMessageJson,
    UserAccountMessageSchema,
} from "../lib/proto/api/v1/merchant_webhooks_pb";

// Export webhook message types for external usage
// These types represent the different event payloads that can be received via webhooks
export {
    ChargeMessageJson as Charge,
    ContractMessageJson as Contract,
    UserAccountMessageJson as UserAccount,
} from "../lib/proto/api/v1/merchant_webhooks_pb";

import config from "../lib/config";
import types from "./types";

const parseInputSchema = z.object({
    // Arbitrary JSON data arrived from the webhook.
    data: z.record(z.unknown()),
});

type ParseInput = z.infer<typeof parseInputSchema>;
type ParseOutput =
    | ChargeMessageJson
    | ContractMessageJson
    | UserAccountMessageJson;

const verifyInputSchema = z.object({
    // Arbitrary JSON data arrived from the webhook.
    data: z.record(z.unknown()),

    // Webhook signature header value, in the form "sha256=<hex_digest>"
    signature: z.string(),
});

type VerifyInput = z.infer<typeof verifyInputSchema>;

class InvalidSignatureError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "InvalidSignatureError";
    }
}

// Ignore fields the backend may add in the future so parsing stays
// forward-compatible instead of throwing on unknown keys.
const jsonOptions = { ignoreUnknownFields: true } as const;

// Refund/cancel webhooks arrive as a nested `{ transaction, refund }` wrapper
// rather than a flat ChargeMessage. Flatten the transaction fields onto the
// message and surface the refund `rfd-` id on the flat `refundId` attribute,
// matching the Ruby/PHP SDKs and the field the proto documents for refunds.
function flattenChargeContent(
    content: Record<string, unknown>,
): ChargeMessageJson {
    if (
        content &&
        typeof content.transaction === "object" &&
        content.transaction !== null
    ) {
        const { transaction, refund } = content as {
            transaction: ChargeMessageJson;
            refund?: { id?: string } | null;
        };

        if (refund === undefined || refund === null) {
            return transaction;
        }

        const flattened = { ...transaction, refund } as ChargeMessageJson;

        if (typeof refund === "object" && typeof refund.id === "string") {
            flattened.refundId = refund.id;
        }

        return flattened;
    }

    return content as ChargeMessageJson;
}

function parseMessage(input: ParseInput): ParseOutput {
    parseInputSchema.parse(input);

    // Convert snake_case keys to camelCase for JavaScript conventions
    // Webhook data arrives from Jamm backend in snake_case format.
    // metadata is the merchant's own map, echoed back verbatim -- its keys are data,
    // not protocol field names, so camelCasing them would corrupt them (order_id ->
    // orderId). Refund events nest the charge under `transaction`, hence both paths.
    const message = camelcaseKeys(input.data, {
        deep: true,
        stopPaths: ["content.metadata", "content.transaction.metadata"],
    });

    const content = message.content as MerchantWebhookMessageJson;

    // Remove content property before validation
    // google.protobuf.Any requires @type field which is absent in webhook data
    delete message.content;

    // Every supported event carries a content payload; fail with a clear message
    // instead of protobuf-es's "cannot decode ... from JSON: undefined".
    if (content === undefined || content === null) {
        throw new Error(
            `Webhook payload is missing content (event type: ${message.eventType})`,
        );
    }

    const event = fromJson(
        MerchantWebhookMessageSchema,
        message as MerchantWebhookMessageJson,
        jsonOptions,
    );

    // Route to appropriate message type based on event type
    // Charge-related events
    if (
        [
            types.EventType.REFUND_SUCCEEDED,
            types.EventType.REFUND_FAILED,
            types.EventType.CHARGE_CREATED,
            types.EventType.CHARGE_FAIL,
            types.EventType.CHARGE_UPDATED,
            types.EventType.CHARGE_SUCCESS,
        ].includes(event.eventType)
    ) {
        return fromJson(
            ChargeMessageSchema,
            flattenChargeContent(content as Record<string, unknown>),
            jsonOptions,
        );
    }

    // Contract-related events
    if ([types.EventType.CONTRACT_ACTIVATED].includes(event.eventType)) {
        return fromJson(
            ContractMessageSchema,
            content as ContractMessageJson,
            jsonOptions,
        );
    }

    // User account-related events
    if ([types.EventType.USER_ACCOUNT_DELETED].includes(event.eventType)) {
        return fromJson(
            UserAccountMessageSchema,
            content as UserAccountMessageJson,
            jsonOptions,
        );
    }

    throw new Error(`Unsupported event type: ${message.eventType}`);
}

// `i` points at an opening '"'. Returns the index just past the closing '"'.
function skipStringToken(s: string, i: number): number {
    i++; // opening quote
    while (i < s.length) {
        const c = s[i];
        if (c === "\\") {
            i += 2; // escaped char
            continue;
        }
        if (c === "\"") {
            return i + 1;
        }
        i++;
    }
    throw new Error("Unterminated string in webhook JSON");
}

// `i` points at the first char of a JSON value. Returns the index just past it.
function skipValue(s: string, i: number): number {
    const c = s[i];
    if (c === "\"") {
        return skipStringToken(s, i);
    }
    if (c === "{" || c === "[") {
        let depth = 0;
        while (i < s.length) {
            const ch = s[i];
            if (ch === "\"") {
                i = skipStringToken(s, i);
                continue;
            }
            if (ch === "{" || ch === "[") {
                depth++;
            } else if (ch === "}" || ch === "]") {
                depth--;
                if (depth === 0) {
                    return i + 1;
                }
            }
            i++;
        }
        throw new Error("Unterminated object/array in webhook JSON");
    }
    // primitive (number, true, false, null): read until a delimiter
    while (i < s.length && !",}] \t\n\r".includes(s[i] as string)) {
        i++;
    }
    return i;
}

/**
 * Extracts the top-level `content` value substring from a raw webhook body verbatim,
 * without decoding or re-serializing it, so the exact bytes the backend signed are
 * recovered for HMAC verification.
 */
function extractRawContent(rawBody: string): string {
    let i = 0;
    const n = rawBody.length;
    const isWs = (c: string | undefined) => c === " " || c === "\t" || c === "\n" || c === "\r";

    while (i < n && isWs(rawBody[i])) i++;
    if (rawBody[i] !== "{") {
        throw new Error("Webhook body must be a JSON object");
    }
    i++; // consume '{'

    // Scan every top-level key. Duplicate keys are rejected: JSON.parse keeps the LAST
    // occurrence while this returns the FIRST, so a duplicate `content` could otherwise
    // verify one payload and parse another (signature bypass).
    const seen = new Set<string>();
    let content: string | null = null;
    for (;;) {
        while (i < n && (isWs(rawBody[i]) || rawBody[i] === ",")) i++;
        if (i >= n || rawBody[i] === "}") break;
        if (rawBody[i] !== "\"") {
            throw new Error("Malformed webhook JSON");
        }
        const keyStart = i;
        i = skipStringToken(rawBody, i);
        const key = JSON.parse(rawBody.slice(keyStart, i)) as string;
        if (seen.has(key)) {
            throw new Error(`Duplicate top-level key in webhook body: ${key}`);
        }
        seen.add(key);
        while (i < n && isWs(rawBody[i])) i++;
        if (rawBody[i] !== ":") {
            throw new Error("Malformed webhook JSON");
        }
        i++; // consume ':'
        while (i < n && isWs(rawBody[i])) i++;
        const valueStart = i;
        i = skipValue(rawBody, i);
        if (key === "content") {
            content = rawBody.slice(valueStart, i);
        }
    }
    if (content === null) {
        throw new Error("Webhook body does not contain 'content' field");
    }
    return content;
}

function hmacHex(data: string): string {
    return crypto
        .createHmac("sha256", config.get().clientSecret)
        .update(data)
        .digest("hex");
}

function assertSignature(digestHex: string, signature: string): void {
    const expected = `sha256=${digestHex}`;
    // Validate length before timing-safe comparison to avoid TypeError
    if (Buffer.byteLength(expected) !== Buffer.byteLength(signature)) {
        throw new InvalidSignatureError("Signature length mismatch");
    }
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
        throw new InvalidSignatureError("Digests do not match");
    }
}

export default {
    /**
   * Parse incoming webhook data into typed message objects.
   *
   * IMPORTANT: This function does NOT verify the webhook signature. Prefer
   * `verifyAndParse`, which verifies and parses in one step. If you call `parse`
   * directly, always verify first to ensure authenticity.
   */
    parse: parseMessage,

    /**
   * @deprecated Prefer {@link verifyAndParse}. `verify` re-serializes `data` via
   * `JSON.stringify`, which does not reproduce the backend's HTML-escaping of
   * `&` `<` `>` (Go emits `&` `<` `>`), so it rejects legitimate
   * webhooks whose content contains those ASCII characters.
   *
   * Verify incoming webhook data using an HMAC SHA-256 signature.
   *
   * @throws {Error} If signature verification fails or the SDK is not initialized
   */
    verify: (input: VerifyInput) => {
        verifyInputSchema.parse(input);

        try {
            const json = JSON.stringify(input.data);
            assertSignature(hmacHex(json), input.signature);
        } catch (error: unknown) {
            throw new Error(
                `Jamm webhook verification failed: ${(error as Error).message}`,
            );
        }
    },

    /**
   * Verify the HMAC signature over the exact received bytes and parse, in one step.
   *
   * This is the recommended entry point: verification cannot be accidentally skipped,
   * and it is not broken by JSON re-serialization. The backend signs the raw `content`
   * bytes it transmits (Go's encoder HTML-escapes `&` `<` `>` as `&` `<`
   * `>`); this slices that raw `content` substring out of the body verbatim and
   * HMACs it, rather than re-serializing the parsed object.
   *
   * @param rawBody the raw, unmodified webhook request body string
   * @throws {Error} If the signature is missing/invalid or the SDK is not initialized
   */
    verifyAndParse: (rawBody: string): ParseOutput => {
        if (typeof rawBody !== "string" || rawBody.length === 0) {
            throw new Error(
                "Jamm webhook verification failed: rawBody must be a non-empty string",
            );
        }
        try {
            const parsed = JSON.parse(rawBody) as Record<string, unknown>;
            const signature = parsed.signature;
            if (typeof signature !== "string" || signature.length === 0) {
                throw new InvalidSignatureError(
                    "Webhook body is missing the 'signature' field",
                );
            }
            const rawContent = extractRawContent(rawBody);
            assertSignature(hmacHex(rawContent), signature);
            return parseMessage({ data: parsed });
        } catch (error: unknown) {
            throw new Error(
                `Jamm webhook verification failed: ${(error as Error).message}`,
            );
        }
    },
};
