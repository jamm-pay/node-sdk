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

export default {
    /**
   * Parse incoming webhook data into typed message objects.
   *
   * IMPORTANT: This function does NOT verify the webhook signature.
   * Always call `jamm.webhook.verify()` before parsing to ensure authenticity.
   */
    parse: (input: ParseInput): ParseOutput => {
        parseInputSchema.parse(input);

        // Convert snake_case keys to camelCase for JavaScript conventions
        // Webhook data arrives from Jamm backend in snake_case format
        const message = camelcaseKeys(input.data, {
            deep: true,
        });

        const content = message.content as MerchantWebhookMessageJson;

        // Remove content property before validation
        // google.protobuf.Any requires @type field which is absent in webhook data
        delete message.content;

        const event = fromJson(
            MerchantWebhookMessageSchema,
            message as MerchantWebhookMessageJson,
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
            return fromJson(ChargeMessageSchema, content as ChargeMessageJson);
        }

        // Contract-related events
        if ([types.EventType.CONTRACT_ACTIVATED].includes(event.eventType)) {
            return fromJson(ContractMessageSchema, content as ContractMessageJson);
        }

        // User account-related events
        if ([types.EventType.USER_ACCOUNT_DELETED].includes(event.eventType)) {
            return fromJson(
                UserAccountMessageSchema,
                content as UserAccountMessageJson,
            );
        }

        throw new Error(`Unsupported event type: ${message.eventType}`);
    },

    /**
   * Verify incoming webhook data using HMAC SHA-256 signature.
   *
   * This ensures the webhook originated from Jamm and hasn't been tampered with.
   * Uses the client secret from SDK configuration to validate the signature.
   *
   * Prerequisites:
   * - SDK must be initialized via `jamm.config.init({...})`
   * - Signature must be provided in the format "sha256=<hex_digest>"
   *
   * @throws {Error} If signature verification fails or SDK is not initialized
   */
    verify: (input: VerifyInput) => {
        verifyInputSchema.parse(input);

        try {
            // Serialize webhook data to match the format used for signature generation
            const json = JSON.stringify(input.data);

            // Generate HMAC SHA-256 digest using client secret
            const digest = crypto
                .createHmac("sha256", config.get().clientSecret)
                .update(json)
                .digest("hex");

            const expected = `sha256=${digest}`;

            // Validate length before timing-safe comparison to avoid TypeError
            if (Buffer.byteLength(expected) !== Buffer.byteLength(input.signature)) {
                throw new InvalidSignatureError("Signature length mismatch");
            }

            // Use timing-safe comparison to prevent timing attacks
            if (
                !crypto.timingSafeEqual(
                    Buffer.from(expected),
                    Buffer.from(input.signature),
                )
            ) {
                throw new InvalidSignatureError("Digests do not match");
            }
        } catch (error: unknown) {
            throw new Error(
                `Jamm webhook verification failed: ${(error as Error).message}`,
            );
        }
    },
};
