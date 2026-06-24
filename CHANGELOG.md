# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.0] - 2026-06-24

### Added

- Surface `api_source` on charge and refund webhooks, resolved from the numeric wire value to its `ChargeMessage_ApiSource` enum
- Re-export the `ChargeMessage_ApiSource` enum
- Surface the refund `rfd-` id on the flat `refundId` attribute in addition to the nested `refund.id`

### Fixed

- Webhook parsing no longer fails on new fields added by the backend (forward-compatible)
- Refund webhooks now expose the nested transaction fields and the refund's `rfd-` id (`refund.id`)
- `webhook.parse` now raises a clear error when a webhook payload is missing its `content`

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
