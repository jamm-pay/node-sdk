import { z } from "zod";

const availableEnvironments = z.enum(["local", "develop", "testing", "staging", "prod"]).default("prod");

const configSchema = z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    environment: availableEnvironments,

    api: z.object({
        url: z.string().url(),
    }),

    oauth2: z.object({
        url: z.string().url(),
    }),
});

export type Config = z.infer<typeof configSchema>;

const initInputSchema = z.object({
    clientId: z.string().min(1),
    clientSecret: z.string().min(1),
    environment: availableEnvironments,
});

export type InitInput = z.infer<typeof initInputSchema>;

/**
 * Initialize Jamm SDK
 *
 * @example
 * ```
 * jamm.config.init({
 *   clientId: "your-client-id",
 *   clientSecret: "your-client-secret",
 *   environment: "prod", // or "staging"
 * })
 * ```
 *
 * @param input - The configuration object
 */
function init(input: InitInput): void {
    // Validate input or throw exception
    initInputSchema.parse(input);

    const conf = {
        clientId: input.clientId,
        clientSecret: input.clientSecret,
        environment: input.environment,
        api: {
            url: input.environment === "prod"
                ? "https://api.jamm-pay.jp"
                : input.environment === "local"
                    ? 'https://api.jamm.test'
                    : `https://api.${input.environment}.jamm-pay.jp`,
        },
        oauth2: {
            url: input.environment === "prod"
                ? "https://merchant-identity.jamm-pay.jp"
                : input.environment === "local"
                    ? 'https://merchant-identity.develop.jamm-pay.jp'
                    : `https://merchant-identity.${input.environment}.jamm-pay.jp`,
        },
    } as Config;

    // Verify and set into cache.
    configSchema.parse(conf);

    configCache = conf;
}

let configCache: Config | undefined;

/**
 * Get the current configuration object
 *
 * @example
 * ```
 * jamm.config.get()
 * ```
 *
 * @returns The current configuration object
 */
function get(): Config {
    if (!configCache) {
        throw new Error("Config not initialized. Call config.init() first.");
    }

    return configCache;
}

/**
 * Reset the configuration object
 *
 * @example
 * ```
 * jamm.config.reset()
 * ```
 */
function reset(): void {
    configCache = undefined;
}

export default {
    init,
    get,
    reset,
};
