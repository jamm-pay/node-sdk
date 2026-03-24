import { createClient, type Transport } from "@connectrpc/connect";

import transport from "../lib/transport";
import { HealthcheckService, type PingResponseJson, PingResponseSchema } from "../lib/proto/api/v1/healthcheck_pb";
import { toJson } from "@bufbuild/protobuf";

// eslint-disable-next-line no-unused-vars
let _transport: (_merchant?: string) => Transport = transport;

// eslint-disable-next-line no-unused-vars
export function injectTransport(transportFn: (_merchant?: string) => Transport): void {
    _transport = transportFn;
}

// Input types with platform mode support
export type PingInput = { merchant?: string };

export default {
    /**
     * Ping the API to check if it's alive and accessible.
     *
     * ## Merchant mode
     *
     * @example
     * ```
     * jamm.healthcheck.ping()
     * ```
     *
     * ## Platform mode
     *
     * Providing a merchant ID will verify connectivity for that specific merchant's scope.
     *
     * @example
     * ```
     * jamm.healthcheck.ping({ merchant: "mer-merchant-123" })
     * ```
     *
     * @param input - Optional input with merchant for platform mode
     * @returns Ping response
     */
    ping: async (input?: PingInput): Promise<PingResponseJson> => {
        const merchant = input?.merchant;
        const got = await createClient(HealthcheckService, _transport(merchant)).ping({});

        return toJson(PingResponseSchema, got);
    },
};
