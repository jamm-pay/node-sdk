import config, { Mode } from "./lib/config";
import customer from "./services/customer";
import healthcheck from "./services/healthcheck";
import payment from "./services/payment";
import types from "./services/types";
import webhook from "./services/webhook";

/**
 * Jamm SDK
 *
 * @packageDocumentation
 */
export default {
    config,
    customer,
    healthcheck,
    payment,
    types,
    webhook,
    Mode,
}

// Export Mode separately for easier access
export { Mode };

// Export shared types
export type { PlatformOptions } from "./types";

// Export input types for platform mode
export type {
    CreateCustomerInput,
    UpdateCustomerInput,
    UpdateInput,
} from "./services/customer";

export type {
    OnSessionPaymentInput,
    OffSessionPaymentInput,
    GetChargesInput,
} from "./services/payment";

export type {
    PingInput,
} from "./services/healthcheck";
