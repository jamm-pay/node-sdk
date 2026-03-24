import config, { registerOAuth2Reset } from "./config";

let tokenCache: TokenResponse | undefined;
let pendingTokenRequest: Promise<string> | null = null;

// Clear token cache when config is reset (e.g. re-init with different credentials)
registerOAuth2Reset(() => {
    tokenCache = undefined;
    pendingTokenRequest = null;
});

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

/**
 * Fetches an OAuth2 access token from the Jamm Identity Provider.
 * The token retrieval process is embedded in each services, therefore
 * developer does not need to call this function directly.
 *
 * @returns OAuth2 access token
 */
async function getAccessToken(): Promise<string> {

    if (tokenCache) {
        const now = Date.now() - 1000 * 30; // 30 seconds buffer
        if (tokenCache.expires_in > now) {
            return tokenCache.access_token;
        }
    }

    // Prevent concurrent token fetches — reuse the in-flight request
    if (pendingTokenRequest) {
        return pendingTokenRequest;
    }

    pendingTokenRequest = fetchNewToken();

    try {
        return await pendingTokenRequest;
    } finally {
        pendingTokenRequest = null;
    }
}

async function fetchNewToken(): Promise<string> {
    const conf = config.get();

    const basicAuth = Buffer.from(`${conf.clientId}:${conf.clientSecret}`).toString('base64');

    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: conf.clientId,
    });

    const response = await fetch(`${conf.oauth2.url}/oauth2/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`,
        },
        body: body.toString(),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(`Error fetching token, error code: ${response.status}, error message: ${data}`);
    }

    tokenCache = data as TokenResponse;

    return tokenCache.access_token;
}

function reset(): void {
    tokenCache = undefined;
    pendingTokenRequest = null;
}

export default {
    getAccessToken,
    reset,
};
