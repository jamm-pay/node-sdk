import type { Transport } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import config from "./config";
import oauth2 from "./oauth2";

/**
 * Internally resolve the config and returns a transport object.
 *
 * @returns Transport
 */
export default function transport(): Transport {
    const conf = config.get();

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

                return next(req);
            },
        ],
        nodeOptions: {
            rejectUnauthorized: false,
        },
    });

    return transport;
}
