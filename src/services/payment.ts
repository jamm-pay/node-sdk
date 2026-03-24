import { createClient, ConnectError, Code, type Transport } from "@connectrpc/connect";

import transport from "../lib/transport";
import { GetChargeRequestSchema, GetChargeResponseSchema, GetChargesRequestSchema, GetChargesResponseSchema, OffSessionPaymentRequestSchema, OffSessionPaymentResponseSchema, OnSessionPaymentRequestSchema, OnSessionPaymentResponseSchema, PaymentService } from "../lib/proto/api/v1/payment_pb";
import type { OnSessionPaymentResponseJson, OffSessionPaymentResponseJson, GetChargeResponseJson, GetChargesResponseJson, OnSessionPaymentRequestJson, OffSessionPaymentRequestJson, GetChargesRequestJson } from "../lib/proto/api/v1/payment_pb";
import { fromJson, toJson } from "@bufbuild/protobuf";
import type { PlatformOptions } from "../types";

// eslint-disable-next-line no-unused-vars
let _transport: (_merchant?: string) => Transport = transport;

// eslint-disable-next-line no-unused-vars
export function injectTransport(transportFn: (_merchant?: string) => Transport): void {
    _transport = transportFn;
}

// Input types with platform mode support
export type OnSessionPaymentInput = OnSessionPaymentRequestJson & { merchant?: string };
export type OffSessionPaymentInput = OffSessionPaymentRequestJson & { merchant?: string };
export type GetChargesInput = GetChargesRequestJson & { merchant?: string };

export default {
    /**
     * On Session Payment
     *
     * Provides a unified interface for creating payment sessions.
     * This API intelligently routes requests to the appropriate payment strategy.
     *
     * ## Merchant mode
     *
     * @example
     * ```
     * jamm.payment.onSessionPayment({
     *   customer: "cus-12345",
     *   charge: {
     *     price: 1000,
     *     description: "Product purchase",
     *     metadata: {},
     *   },
     *   redirect: {
     *     successUrl: "https://example.com/success",
     *     failureUrl: "https://example.com/failure",
     *   },
     * })
     * ```
     *
     * ## Platform mode
     *
     * The merchant field allows creating payment sessions on behalf of a specific merchant.
     *
     * @example
     * ```
     * jamm.payment.onSessionPayment({
     *   customer: "cus-12345",
     *   charge: {
     *     price: 1000,
     *     description: "Product purchase",
     *     metadata: {},
     *   },
     *   redirect: {
     *     successUrl: "https://example.com/success",
     *     failureUrl: "https://example.com/failure",
     *   },
     *   merchant: "mer-merchant-123"
     * })
     * ```
     *
     * @param input - Payment session creation request (with optional merchant for platform mode)
     * @returns Response containing payment session details
     */
    onSessionPayment: async (input: OnSessionPaymentInput): Promise<OnSessionPaymentResponseJson> => {
        const { merchant, ...apiInput } = input;
        const req = fromJson(OnSessionPaymentRequestSchema, apiInput);
        const got = await createClient(PaymentService, _transport(merchant)).onSessionPayment(req);

        return toJson(OnSessionPaymentResponseSchema, got);
    },

    /**
     * Off Session Payment
     *
     * Charge customer in synchronous request without customer interaction.
     * The customer must already exist and have completed Jamm onboarding,
     * including terms of service acceptance, KYC, and payment method setup.
     *
     * ## Merchant mode
     *
     * @example
     * ```
     * jamm.payment.offSessionPayment({
     *   customer: "cus-12345",
     *   charge: {
     *     price: 1000,
     *     description: "Product purchase",
     *     metadata: {},
     *   },
     * })
     * ```
     *
     * ## Platform mode
     *
     * The merchant field allows charging customers on behalf of a specific merchant.
     *
     * @example
     * ```
     * jamm.payment.offSessionPayment({
     *   customer: "cus-12345",
     *   charge: {
     *     price: 1000,
     *     description: "Product purchase",
     *     metadata: {},
     *   },
     *   merchant: "mer-merchant-123"
     * })
     * ```
     *
     * @param input - Payment charge request (with optional merchant for platform mode)
     * @returns Payment response with charge details
     */
    offSessionPayment: async (input: OffSessionPaymentInput): Promise<OffSessionPaymentResponseJson> => {
        const { merchant, ...apiInput } = input;
        const req = fromJson(OffSessionPaymentRequestSchema, apiInput);
        const got =  await createClient(PaymentService, _transport(merchant)).offSessionPayment(req);

        return toJson(OffSessionPaymentResponseSchema, got);
    },

    /**
     * Get a charge by ID.
     *
     * ## Merchant mode
     *
     * @example
     * ```
     * jamm.payment.getCharge("chg-12345")
     * ```
     *
     * ## Platform mode
     *
     * @example
     * ```
     * jamm.payment.getCharge("chg-12345", { merchant: "mer-merchant-123" })
     * ```
     *
     * @param id - Charge ID to retrieve
     * @param options - Optional platform options (merchant for platform mode)
     * @returns Charge object or null if not found
     */
    getCharge: async (id: string, options?: PlatformOptions): Promise<GetChargeResponseJson | null> => {
        try {
            const merchant = options?.merchant;
            const req = fromJson(GetChargeRequestSchema, {
                charge: id,
            });

            const got = await createClient(PaymentService, _transport(merchant)).getCharge(req);

            return toJson(GetChargeResponseSchema, got);
        } catch (error) {
            if (error instanceof ConnectError && [Code.NotFound, Code.InvalidArgument, Code.PermissionDenied].includes(error.code)) {
                return null;
            }
            throw error;
        }
    },

    /**
     * Get charges for a customer.
     * The response is paginated.
     *
     * ## Merchant mode
     *
     * @example
     * ```
     * jamm.payment.getCharges({
     *   customer: "cus-12345",
     *   pagination: { pageSize: 10, pageToken: "" },
     * })
     * ```
     *
     * ## Platform mode
     *
     * @example
     * ```
     * jamm.payment.getCharges({
     *   customer: "cus-12345",
     *   pagination: { pageSize: 10, pageToken: "" },
     *   merchant: "mer-merchant-123"
     * })
     * ```
     *
     * @param input - Request parameters including customer ID and pagination options (with optional merchant for platform mode)
     * @returns Paginated charges object
     */
    getCharges: async (input: GetChargesInput): Promise<GetChargesResponseJson> => {
        const { merchant, ...apiInput } = input;
        const req = fromJson(GetChargesRequestSchema, apiInput);
        const got = await createClient(PaymentService, _transport(merchant)).getCharges(req);

        return toJson(GetChargesResponseSchema, got);
    }
};
