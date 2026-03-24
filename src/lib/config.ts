import { z } from "zod";

/**
 * SDK operation modes
 * - PLATFORM: Allows calling Jamm API on behalf of merchants (requires platform credentials)
 * - MERCHANT: Standard merchant mode for direct API access
 */
export const Mode = {
    PLATFORM: 'platform',
    MERCHANT: 'merchant',
} as const;

export type ModeType = typeof Mode[keyof typeof Mode];

const availableEnvironments = z.enum(["local", "develop", "testing", "staging", "prod"]).default("prod");

const configSchema = z.object({
    clientId: z.string(),
    clientSecret: z.string(),
    environment: availableEnvironments,
    mode: z.enum(['platform', 'merchant']),

    api: z.object({
        url: z.string().url(),
    }),

    oauth2: z.object({
        url: z.string().url(),
    }),
});

export type Config = z.infer<typeof configSchema>;

const initInputSchema = z.object({
    clientId: z.string().trim().min(1),
    clientSecret: z.string().trim().min(1),
    environment: availableEnvironments,
    platform: z.boolean().optional().default(false),
});

export type InitInput = Omit<z.infer<typeof initInputSchema>, 'platform'> & {
    platform?: boolean;
};

/**
 * Initialize Jamm SDK
 *
 * ## Merchant mode
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
 * ## Platform mode
 *
 * @example
 * ```
 * jamm.config.init({
 *   clientId: "platform-client-id",
 *   clientSecret: "platform-client-secret",
 *   environment: "prod",
 *   platform: true
 * })
 * ```
 *
 * @param input - The configuration object
 */
function init(input: InitInput): void {
    // Validate input or throw exception
    initInputSchema.parse(input);

    // Determine SDK mode based on platform flag
    // Platform mode allows calling API on behalf of merchants
    const mode = input.platform ? Mode.PLATFORM : Mode.MERCHANT;

    // Select the appropriate OAuth2 identity service based on mode
    const identityPrefix = mode === Mode.PLATFORM ? 'platform-identity' : 'merchant-identity';

    const conf = {
        clientId: input.clientId,
        clientSecret: input.clientSecret,
        environment: input.environment,
        mode: mode,
        // Configure API base URL based on environment
        api: {
            url: input.environment === "prod"
                ? "https://api.jamm-pay.jp"
                : input.environment === "local"
                    ? 'https://api.jamm.test'
                    : `https://api.${input.environment}.jamm-pay.jp`,
        },
        // Configure OAuth2 URL based on mode and environment
        // Platform and merchant modes use different identity services
        oauth2: {
            url: input.environment === "prod"
                ? `https://${identityPrefix}.jamm-pay.jp`
                : input.environment === "local"
                    ? `https://${identityPrefix}.develop.jamm-pay.jp`
                    : `https://${identityPrefix}.${input.environment}.jamm-pay.jp`,
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
    oauth2ResetFn?.();
}

// Allows oauth2 module to register its reset callback without circular imports
let oauth2ResetFn: (() => void) | undefined;
export function registerOAuth2Reset(fn: () => void): void {
    oauth2ResetFn = fn;
}

export default {
    init,
    get,
    reset,
};
