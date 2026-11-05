import { Code, ConnectError } from "@connectrpc/connect";

// The API answers a Jamm-API-Version it does not serve with InvalidArgument and no
// detail, so this prefix is the only way to tell it from a malformed id.
const VERSION_REJECTED_PREFIX = "unsupported API version";

/**
 * Whether the API refused the request's Jamm-API-Version. That must surface as an
 * error, never as a missing record.
 */
export function versionRejected(error: unknown): boolean {
    return error instanceof ConnectError
        && error.code === Code.InvalidArgument
        && error.rawMessage.startsWith(VERSION_REJECTED_PREFIX);
}

/**
 * Whether a lookup's error means "no such record": not found, an id that cannot name
 * one, or another merchant's record. A version rejection is not absence.
 */
export function absentOnLookup(error: unknown): boolean {
    return error instanceof ConnectError
        && [Code.NotFound, Code.InvalidArgument, Code.PermissionDenied].includes(error.code)
        && !versionRejected(error);
}
