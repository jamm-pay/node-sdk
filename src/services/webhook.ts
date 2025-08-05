import * as crypto from 'crypto';
import camelcaseKeys from 'camelcase-keys';
import { z } from 'zod';
import { fromJson } from '@bufbuild/protobuf';
import { ChargeMessageJson, ChargeMessageSchema, ContractMessageJson, ContractMessageSchema, MerchantWebhookMessageJson, MerchantWebhookMessageSchema, UserAccountMessageJson, UserAccountMessageSchema } from '../lib/proto/api/v1/merchant_webhooks_pb';

// Encapsulates the protobuf schemas for the webhook messages.
export {
    ChargeMessageJson as Charge,
    ContractMessageJson as Contract,
    UserAccountMessageJson as UserAccount,
} from '../lib/proto/api/v1/merchant_webhooks_pb';

import config from '../lib/config';
import types from './types';

const parseInputSchema = z.object({
    // Arbitrary JSON data arrived from the webhook.
    data: z.record(z.unknown()),
})

type ParseInput = z.infer<typeof parseInputSchema>;
type ParseOutput = ChargeMessageJson | ContractMessageJson | UserAccountMessageJson;

const verifyInputSchema = z.object({
    // Arbitrary JSON data arrived from the webhook.
    data: z.record(z.unknown()),

    // Jamm merchant secret (e.g. JAMM_MERCHANT_SECRET)
    signature: z.string(),
})

type VerifyInput = z.infer<typeof verifyInputSchema>;

class InvalidSignatureError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidSignatureError';
    }
}

export default {
    /**
     * Parse incoming webhook data.
     *
     * This function will NOT verify the signature of the incoming webhook data,
     * therefore you should call `jamm.webhook.verify()` before using this function.
     */
    parse: (input: ParseInput): ParseOutput => {
        parseInputSchema.parse(input);

        // Convert snake_case keys to camelCase.
        // Webhook arrives directly from Jamm backend, therefore all the keys are in snake_case.
        const message = camelcaseKeys(input.data, {
            deep: true,
        });

        const content = message.content as MerchantWebhookMessageJson;

        // Remove content property, because google.protobuf.Any requires @type field
        // which is not present in the webhook data.
        delete message.content;

        const event = fromJson(MerchantWebhookMessageSchema, message as MerchantWebhookMessageJson);

        if ([
            types.EventType.CHARGE_CANCEL,
            types.EventType.CHARGE_CREATED,
            types.EventType.CHARGE_FAIL,
            types.EventType.CHARGE_UPDATED,
            types.EventType.CHARGE_SUCCESS,
        ].includes(event.eventType)) {
            return fromJson(ChargeMessageSchema, content as ChargeMessageJson);
        }

        if ([
            types.EventType.CONTRACT_ACTIVATED,
        ].includes(event.eventType)) {
            return fromJson(ContractMessageSchema, content as ContractMessageJson);
        }

        if ([
            types.EventType.USER_ACCOUNT_DELETED,
        ].includes(event.eventType)) {
            return fromJson(UserAccountMessageSchema, content as UserAccountMessageJson);
        }

        throw new Error(`Unsupported event type: ${message.eventType}`);
    },

    /**
     * Verify incoming webhook data.
     *
     * This function verifies the signature of the incoming webhook data
     * using HMAC SHA-256 with the provided signature.
     *
     * You will need to initiate Jamm SDK in order to use this function.
     *
     *     jamm.config.init({...})
     */
    verify: (input: VerifyInput) => {
        verifyInputSchema.parse(input);

        try {
            const json = JSON.stringify(input.data);

            const digest = crypto
                .createHmac('sha256', config.get().clientSecret)
                .update(json)
                .digest('hex');

            const given = `sha256=${digest}`;

            if (!crypto.timingSafeEqual(Buffer.from(given), Buffer.from(input.signature))) {
                throw new InvalidSignatureError('Digests do not match');
            }
        } catch (error: unknown) {
            throw new Error(`Jamm webhook verification failed: ${(error as Error).message}`);
        }
    },
};
