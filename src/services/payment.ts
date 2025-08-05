import { createClient, type Transport } from "@connectrpc/connect";

import transport from "../lib/transport";
import { GetChargeRequestSchema, GetChargeResponseSchema, GetChargesRequestSchema, GetChargesResponseSchema, OffSessionPaymentRequestSchema, OffSessionPaymentResponseSchema, OnSessionPaymentRequestSchema, OnSessionPaymentResponseSchema, PaymentService } from "../lib/proto/api/v1/payment_pb";
import type { OnSessionPaymentResponseJson, OffSessionPaymentResponseJson, GetChargeResponseJson, GetChargesResponseJson, OnSessionPaymentRequestJson, OffSessionPaymentRequestJson, GetChargesRequestJson } from "../lib/proto/api/v1/payment_pb";
import { fromJson, toJson } from "@bufbuild/protobuf";

let _transport: () => Transport = transport;

export function injectTransport(transportFn: () => Transport): void {
    _transport = transportFn;
}

export default {
    /**
     * On Session Payment
     *
     * Provides a unified interface for creating payment sessions.
     * This API intelligently routes requests to the appropriate payment strategy.
     *
     * @param input
     * @returns Response containing payment session details
     */
    onSessionPayment: async (input: OnSessionPaymentRequestJson): Promise<OnSessionPaymentResponseJson> => {
        const req = fromJson(OnSessionPaymentRequestSchema, input);
        const got = await createClient(PaymentService, _transport()).onSessionPayment(req);

        return toJson(OnSessionPaymentResponseSchema, got);
    },

    /**
     * Off Session Payment
     *
     * Charge customer in synchronous request.
     * The customer must be already created, and he/she must complete Jamm onboarding
     * including terms of service acceptance, KYC, and payment method setup.
     *
     * @param input
     * @returns
     */
    offSessionPayment: async (input: OffSessionPaymentRequestJson): Promise<OffSessionPaymentResponseJson> => {
        const req = fromJson(OffSessionPaymentRequestSchema, input);
        const got =  await createClient(PaymentService, _transport()).offSessionPayment(req);

        return toJson(OffSessionPaymentResponseSchema, got);
    },

    /**
     * Get a charge by ID.
     *
     * @param id Charge ID
     * @returns Charge object or null if not found
     */
    getCharge: async (id: string): Promise<GetChargeResponseJson | null> => {
        try {
            const req = fromJson(GetChargeRequestSchema, {
                charge: id,
            });

            const got = await createClient(PaymentService, _transport()).getCharge(req);

            return toJson(GetChargeResponseSchema, got);
        } catch {
            // TODO: have detailed error handling.
            return null;
        }
    },

    /**
     * Get charges for a customer.
     * The response is paginated.
     *
     * @param customerId
     * @returns Charges object
     */
    getCharges: async (input: GetChargesRequestJson): Promise<GetChargesResponseJson | null> => {
        const req = fromJson(GetChargesRequestSchema, input);
        const got = await createClient(PaymentService, _transport()).getCharges(req);

        return toJson(GetChargesResponseSchema, got);
    }
};
