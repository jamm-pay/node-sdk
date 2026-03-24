import type { Transport } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import config, { Mode } from "./config";
import oauth2 from "./oauth2";
import packageJson from "../../package.json";

const HEADER_KEY_REGEX = /^[A-Za-z0-9_-]+$/;

/**
 * Only allow alphanumeric, underscore and hyphen characters in the header key.
 *
 * @returns string | null
 */
function getCustomHeaderKey(): string | null {
    const value = process.env.JAMM_CUSTOM_HEADER_KEY;

    if (!value) {
        return null;
    }

    if (!HEADER_KEY_REGEX.test(value)) {
        console.error(`JAMM_CUSTOM_HEADER_KEY contains invalid characters and was ignored: "${value}"`);
        return null;
    }

    return value;
}

/**
 * Creates a Connect transport with authentication and platform-specific headers.
 *
 * In platform mode, the merchant parameter allows calling the API on behalf of a specific merchant
 * by setting the "Jamm-Merchant" header. This enables platform partners to manage multiple merchants
 * through a single integration.
 *
 * @param merchant - Optional merchant ID for platform mode (format: "mer-*")
 * @returns Transport configured with auth interceptors and headers
 */
export default function transport(merchant?: string): Transport {
    const conf = config.get();

    // Validate merchant parameter upfront
    if (merchant) {
        // Ensure SDK is initialized in platform mode
        if (conf.mode !== Mode.PLATFORM) {
            throw new Error('merchant parameter can only be used when mode is PLATFORM');
        }

        // Validate merchant ID follows the expected format (mer-[alphanumeric/underscore/hyphen])
        if (!/^mer-[0-9A-Za-z_-]+$/.test(merchant)) {
            throw new Error('invalid merchant id format');
        }
    }

    const transport = createConnectTransport({
        // Must be 1.1
        httpVersion: "1.1",
        baseUrl: conf.api.url,
        useBinaryFormat: true,
        jsonOptions: {
            alwaysEmitImplicit: true,
            ignoreUnknownFields: true,
            useProtoFieldName: false,
        },
        interceptors: [
            (next) => async (req) => {
                // Do not call this function outside of the interceptor scope,
                // because it will nullify the refresh token logic.
                const token = await oauth2.getAccessToken();

                req.header.set("Authorization", `Bearer ${token}`);
                req.header.set("X-SDK-Version", `node:${packageJson.version}`);

                // Inject custom header when present.
                const key = getCustomHeaderKey();
                const val = process.env.JAMM_CUSTOM_HEADER_VALUE;

                if (key && val) {
                    req.header.set(key, val);
                }

                // Platform feature: Set merchant ID to call Jamm API on behalf of a specific merchant
                // This allows platform partners to make API calls scoped to individual merchants
                if (merchant) {
                    req.header.set("Jamm-Merchant", merchant);
                }

                return next(req);
            },
        ],
        nodeOptions: {
            rejectUnauthorized: false,
        },
    });

    return transport;
}
