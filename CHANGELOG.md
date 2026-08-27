# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.12.0] - 2026-08-25

`0.10.1`, `0.10.2` and `0.11.0` were never published to npm, so upgrading from `0.10.0`
also picks up their entries below.

### Added

- `customer.getContract(id)` returns the customer's **active** contract. Brings Node in line with the Ruby, Python and Java SDKs. It takes a `cus-` id; an email is rejected by the API rather than silently returning `null`. `null` means there is no active contract to return — none was ever approved, one is still pending approval or was cancelled, the id is unknown, or it belongs to another merchant, which the API reports as an identical not-found so ids cannot be probed across merchants.
- Documented `idempotencyKey` on `payment.onSessionPayment`. The same `(merchant, key)` returns the original payment link, the same key with different parameters is rejected, and no key means a new session on every call. The SDK deliberately does not auto-fill it the way `offSessionPaymentAsync` does — a generated key differs on every call and buys no idempotency.

### Fixed

- `webhook.parse` ignores webhook fields it predates again. `0.10.0` reverted the forward-compatible parsing added in `0.9.0`, so it cannot decode a charge or refund webhook carrying `api_source` — emitted on every charge and refund event — or `metadata`, failing with `cannot decode message api.v1.ChargeMessage from JSON: key "apiSource" is unknown`. `0.9.0` is the only published version that decodes these payloads: `0.10.0` regressed, and everything before `0.9.0` predates the fix — the per-version results are in `compatibility/README.md`. Upgrade from any of them.
- Refund webhooks (`EVENT_TYPE_REFUND_SUCCEEDED`, `EVENT_TYPE_REFUND_FAILED`) deliver the charge nested under `transaction`; `parse` flattens it back onto the message and surfaces the refund `rfd-` id on `refundId` as well as `refund.id`. Also lost in the `0.10.0` revert. A cancellation has no event of its own — it arrives as `EVENT_TYPE_REFUND_SUCCEEDED` too, so this covers both.
- A webhook body with no `content` now fails with `Webhook payload is missing content (event type: ...)` instead of `cannot decode message api.v1.ChargeMessage from JSON: undefined`.

## [0.11.0] - 2026-08-19

### Added

- Charge webhooks now expose the merchant `metadata` map attached to the charge at creation, echoed back verbatim, as `charge.metadata`. This lets you correlate a webhook against your own order without a `getCharge` round-trip. Available on all six charge events, including `EVENT_TYPE_REFUND_SUCCEEDED` and `EVENT_TYPE_REFUND_FAILED`, which deliver the charge nested under `transaction`. A charge created without metadata decodes to an empty object.

### Fixed

- `Webhook.parse` no longer rewrites the keys of the merchant-supplied `metadata` map. Parsing camelCases incoming keys to match JavaScript conventions, but metadata keys are merchant data rather than protocol field names, so a key like `order_id` was being delivered as `orderId` — unrecoverably, since the original spelling was lost. Metadata keys now arrive exactly as they were supplied at charge creation. No other payload field is affected.

## [0.10.2] - 2026-08-18

### Changed

- Updated development dependencies to pick up security fixes in transitive packages (`fast-uri`, `js-yaml`, `brace-expansion`, `nanoid`). Lockfile only — no runtime dependency, API, or behaviour changes.

## [0.10.1] - 2026-08-03

### Changed

- Dropped Node 18 support. `engines.node` is now `20 || >=22` (was `>=18.*`) — the range `brace-expansion` 5.0.8 declares, which is every line from 20 upward except the end-of-life 21. Node 18 reached end-of-life in March 2025, and with `engine-strict=true` set for this package `npm ci` on Node 18 already fails.
- Upgraded development dependencies to pick up security fixes in transitive packages (`postcss`, `brace-expansion`, `js-yaml`, `fast-uri`, `nanoid`). No runtime or API code changes; the only published-artifact change is the `engines.node` range above.

## [0.10.0] - 2026-07-14

### Added

- Added `webhook.verifyAndParse(rawBody)` — verifies the HMAC signature over the exact received `content` bytes and parses in one step. Unlike `webhook.verify`, it is not broken by JSON re-serialization (correctly handles `&`, `<`, `>` in content) and rejects bodies with duplicate top-level keys. This was previously listed under `0.9.0` in error: the published `0.9.0` does not contain it.

### Changed

- `expiresAt` on off-session and contract requests now accepts up to 31 days ahead (was 30 days).

### Removed

- Reverted the forward-compatible webhook parsing `0.9.0` shipped, so unknown fields, the nested refund wrapper and `api_source` are decode errors again. The revert was not meant to reach a release; `0.12.0` restores it. This defeats **both** entry points on current charge and refund payloads: `verifyAndParse` verifies the signature and then calls the same `parse`, so it throws where `parse` throws. Signature verification itself is unaffected.

## [0.9.0] - 2026-07-03

### Added

- `webhook.parse` ignores fields it does not know, so a payload carrying fields added by a newer backend still decodes instead of throwing `key "..." is unknown`.
- Refund webhooks (`EVENT_TYPE_REFUND_SUCCEEDED`, `EVENT_TYPE_REFUND_FAILED`, which also carry cancellations) deliver the charge nested under `transaction`; `parse` flattens it back onto the message and surfaces the refund `rfd-` id on `refundId` as well as `refund.id`.
- `api_source` on charge and refund webhooks, comparable through `types.ChargeMessage_ApiSource` / `types.apiSourceEquals`.
- A payload with no `content` fails with an explicit `Webhook payload is missing content (event type: ...)`.

## [0.8.0] - 2026-05-20

### Added

- Added `payment.offSessionPaymentAsync` for async off-session charges
- Auto-fill `idempotencyKey` with a UUID when blank, omitted, or non-string

## [0.7.0] - 2026-04-03

### Added

- Added `ChargeError` details on `ChargeResult` for failed charges

## [0.6.2] - 2026-04-02

### Changed

- Pinned packages

## [0.6.1] - 2026-03-26

### Changed

- Upgraded packages

## [0.6.0] - 2026-03-26

### Added

- Refund method is now available

## [0.5.0] - 2026-01-21

### Added

- On Session payment endpoint now supports One Time payment

## [0.4.0] - 2026-01-13

### Added

- Added SDK version in client transport
- Allow to inject custom headers

## [0.3.0] - 2025-11-11

### Changed

- Customer Update API now supports to change email and phone number
- OnSessionPayment redirect link is now optional

## [0.2.1] - 2025-08-01

### Removed

- Excluded test file sourcemaps

## [0.2.0] - 2025-08-01

### Added

- Supported Customer, OnSessionPayment and Webhooks

### Removed

- Removed legacy createContractWithCharge methods

## [0.1.3] - 2025-05-05

### Changed

- Only support ESM

## [0.1.2] - 2025-05-05

### Changed

- Added exports block in package.json

## [0.1.1] - 2025-05-05

### Changed

- Specified type to module

## [0.1.0] - 2025-05-01

### Added

- Added quickstart example snippet
- Include typings into build artifacts

## [0.0.1] - 2025-05-01

### Added

- Setup connectrpc and protobuf types
