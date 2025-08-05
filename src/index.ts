import config from "./lib/config";
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
}
