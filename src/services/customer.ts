import { createClient, type Transport } from "@connectrpc/connect";

import { CreateCustomerRequestSchema, CustomerService, DeleteCustomerRequestSchema, DeleteCustomerResponseJson, DeleteCustomerResponseSchema, GetCustomerRequestSchema, type UpdateCustomerRequestJson } from "../lib/proto/api/v1/customer_pb";
import { CustomerSchema } from "../lib/proto/api/v1/common_pb";
import type { BuyerJson, CustomerJson } from "../lib/proto/api/v1/common_pb";
import transport from "../lib/transport";
import { fromJson, toJson } from "@bufbuild/protobuf";
import { DeepOmit } from "../types";

let _transport: () => Transport = transport;

export function injectTransport(transportFn: () => Transport): void {
    _transport = transportFn;
}

export type UpdateInput = DeepOmit<UpdateCustomerRequestJson, '$typeName'>;

export default {
    /**
     * Create a new customer.
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
     * @param input
     * @returns Customer object
     */
    create: async (input: BuyerJson): Promise<CustomerJson> => {
        const req = fromJson(CreateCustomerRequestSchema, {
            buyer: input,
        });

        const got = await createClient(CustomerService, _transport()).createCustomer(req)

        if (!got.customer || !got.customer.customer) {
            throw new Error("Failed to create customer");
        }

        return toJson(CustomerSchema, got.customer.customer)
    },

    /**
     * Get a customer by ID or email address.
     * Throws when the customer is not found.
     *
     * @example
     * ```
     * jamm.customer.get("cus-12345")
     * jamm.customer.get("foo@jamm-pay.jp")
     * ```
     *
     * @param idOrEmail Customer ID or email address
     * @returns Customer object or null if not found
     */
    get: async (idOrEmail: string): Promise<CustomerJson | null> => {
        try {
            const req = fromJson(GetCustomerRequestSchema, {
                customer: idOrEmail,
            });

            const got = await createClient(CustomerService, _transport()).getCustomer(req);

            if (!got.customer) {
                return null;
            }

            return toJson(CustomerSchema, got.customer);
        } catch {
            // TODO: have detailed error handling.
            return null;
        }
    },

    /**
     * Update a customer.
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
     * @returns Customer object
     */
    update: async (input: UpdateInput): Promise<CustomerJson> => {
        const got = await createClient(CustomerService, _transport()).updateCustomer(input);

        if (!got.customer || !got.customer.customer) {
            throw new Error(`Customer not found: ${input.customer}`);
        }

        return toJson(CustomerSchema, got.customer.customer)
    },

    /**
     * Delete a customer.
     *
     * @example
     * ```
     * jamm.customer.delete("cus-1234")
     * ```
     */
    delete: async (id: string): Promise<DeleteCustomerResponseJson> => {
        const req = fromJson(DeleteCustomerRequestSchema, {
            customer: id,
        })

        const got = await createClient(CustomerService, _transport()).deleteCustomer(req);

        return toJson(DeleteCustomerResponseSchema, got);
    }
};

