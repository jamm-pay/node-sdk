import { createClient, ConnectError, Code, type Transport } from "@connectrpc/connect";

import { CreateCustomerRequestSchema, CustomerService, DeleteCustomerRequestSchema, DeleteCustomerResponseJson, DeleteCustomerResponseSchema, GetCustomerRequestSchema, type UpdateCustomerRequestJson } from "../lib/proto/api/v1/customer_pb";
import { CustomerSchema } from "../lib/proto/api/v1/common_pb";
import type { BuyerJson, CustomerJson } from "../lib/proto/api/v1/common_pb";
import transport from "../lib/transport";
import { fromJson, toJson } from "@bufbuild/protobuf";
import { DeepOmit, PlatformOptions } from "../types";

// eslint-disable-next-line no-unused-vars
let _transport: (_merchant?: string) => Transport = transport;

// eslint-disable-next-line no-unused-vars
export function injectTransport(transportFn: (_merchant?: string) => Transport): void {
    _transport = transportFn;
}

export type UpdateInput = DeepOmit<UpdateCustomerRequestJson, '$typeName'>;

// Input types with platform mode support
export type CreateCustomerInput = BuyerJson & { merchant?: string };
export type UpdateCustomerInput = UpdateInput & { merchant?: string };

export default {
    /**
     * Create a new customer.
     *
     * ## Merchant mode
     *
     * @example
     * ```
     * jamm.customer.create({
     *   email: "foo@example.com",
     *   name: "Foo Bar",
     *   forceKyc: true,
     *   phone: "09012345678",
     *   address: "Tokyo, Minato-ku, 1-2-3",
     *   ...
     *   metadata: {
     *     foo: "bar"
     *   },
     * })
     * ```
     *
     * ## Platform mode
     *
     * Calls the API on behalf of a specific merchant.
     *
     * @example
     * ```
     * jamm.customer.create({
     *   email: "foo@example.com",
     *   name: "Foo Bar",
     *   ...
     *   merchant: "mer-merchant-123"
     * })
     * ```
     *
     * @param input - Customer data to create (with optional merchant for platform mode)
     * @returns Customer object
     */
    create: async (input: CreateCustomerInput): Promise<CustomerJson> => {
        const { merchant, ...apiInput } = input;
        const req = fromJson(CreateCustomerRequestSchema, {
            buyer: apiInput,
        });

        const got = await createClient(CustomerService, _transport(merchant)).createCustomer(req)

        if (!got.customer || !got.customer.customer) {
            throw new Error("Failed to create customer");
        }

        return toJson(CustomerSchema, got.customer.customer)
    },

    /**
     * Get a customer by ID or email address.
     * Returns null when the customer is not found.
     *
     * ## Merchant mode
     *
     * @example
     * ```
     * jamm.customer.get("cus-12345")
     * jamm.customer.get("foo@jamm-pay.jp")
     * ```
     *
     * ## Platform mode
     *
     * @example
     * ```
     * jamm.customer.get("cus-12345", { merchant: "mer-merchant-123" })
     * ```
     *
     * @param idOrEmail - Customer ID or email address
     * @param options - Optional platform options (merchant for platform mode)
     * @returns Customer object or null if not found
     */
    get: async (idOrEmail: string, options?: PlatformOptions): Promise<CustomerJson | null> => {
        try {
            const merchant = options?.merchant;
            const req = fromJson(GetCustomerRequestSchema, {
                customer: idOrEmail,
            });

            const got = await createClient(CustomerService, _transport(merchant)).getCustomer(req);

            if (!got.customer) {
                return null;
            }

            return toJson(CustomerSchema, got.customer);
        } catch (error) {
            if (error instanceof ConnectError && [Code.NotFound, Code.InvalidArgument, Code.PermissionDenied].includes(error.code)) {
                return null;
            }
            throw error;
        }
    },

    /**
     * Update a customer.
     *
     * ## Merchant mode
     *
     * @example
     * ```
     * jamm.customer.update({
     *   customer: "cus-12345",
     *   email: "foo@example.com",
     *   ...
     * })
     * ```
     *
     * ## Platform mode
     *
     * @example
     * ```
     * jamm.customer.update({
     *   customer: "cus-12345",
     *   email: "newemail@example.com",
     *   merchant: "mer-merchant-123"
     * })
     * ```
     *
     * @param input - Update data for the customer (with optional merchant for platform mode)
     * @returns Updated customer object
     */
    update: async (input: UpdateCustomerInput): Promise<CustomerJson> => {
        const { merchant, ...apiInput } = input;
        const got = await createClient(CustomerService, _transport(merchant)).updateCustomer(apiInput);

        if (!got.customer || !got.customer.customer) {
            throw new Error(`Customer not found: ${input.customer}`);
        }

        return toJson(CustomerSchema, got.customer.customer)
    },

    /**
     * Delete a customer.
     *
     * ## Merchant mode
     *
     * @example
     * ```
     * jamm.customer.delete("cus-1234")
     * ```
     *
     * ## Platform mode
     *
     * @example
     * ```
     * jamm.customer.delete("cus-1234", { merchant: "mer-merchant-123" })
     * ```
     *
     * @param id - Customer ID to delete
     * @param options - Optional platform options (merchant for platform mode)
     * @returns Delete response
     */
    delete: async (id: string, options?: PlatformOptions): Promise<DeleteCustomerResponseJson> => {
        const merchant = options?.merchant;
        const req = fromJson(DeleteCustomerRequestSchema, {
            customer: id,
        })

        const got = await createClient(CustomerService, _transport(merchant)).deleteCustomer(req);

        return toJson(DeleteCustomerResponseSchema, got);
    }
};

