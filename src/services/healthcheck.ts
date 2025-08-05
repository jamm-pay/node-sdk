import { createClient, type Transport } from "@connectrpc/connect";

import transport from "../lib/transport";
import { HealthcheckService, type PingResponseJson, PingResponseSchema } from "../lib/proto/api/v1/healthcheck_pb";
import { toJson } from "@bufbuild/protobuf";

let _transport: () => Transport = transport;

export function injectTransport(transportFn: () => Transport): void {
    _transport = transportFn;
}

export default {
    ping: async (): Promise<PingResponseJson> => {
        const got = await createClient(HealthcheckService, _transport()).ping({});

        return toJson(PingResponseSchema, got);
    },
};
