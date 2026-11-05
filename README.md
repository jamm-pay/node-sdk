<div align="center">
  <a href="https://github.com/jamm-pay/node-sdk">
    <img src="https://assets.jamm-pay.jp/brand/jamm_logo.png" alt="logo" width="120" height="120">
  </a>
  <h3 align="center">Jamm Node SDK</h3>
  <p align="center">
    The official Node SDK for Jamm's payment API!
    <br />
    We strongly recommend using the SDK for backend integration in order to simplify and streamline your development process!
  </p>
</div>

## Quickstart

Visit our docs for more information.

<https://docs.jamm-pay.jp>

## API version

Every request to the Jamm API carries a `Jamm-API-Version` header. It defaults to
the dated API version this SDK was built against, exposed as `API_VERSION`. To stay
on the version you integrated against, set `apiVersion` in `config.init`; a version newer than
`API_VERSION` is rejected, so upgrade the SDK to use one. Unset or empty means `API_VERSION`.

```ts
jamm.config.init({
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  environment: "prod",
  apiVersion: "2026-08-26",
});
```

The API rejects a version it no longer serves; the error lists the versions it does. Responses to a pinned older version follow that version's shape, so fields added since come back empty in this SDK's types.

Every versioned response echoes what served it in two headers:
`Jamm-API-Version` is the version, and `Jamm-API-Version-Source` is how it was
chosen: `header` (the version this SDK sent), `pin` (your account's pinned
version), `default` (no header, and no pin we could read), or `forced` (Jamm
temporarily served its newest shape, which no dated version describes, so
`Jamm-API-Version` is omitted). A request rejected before a version is chosen
carries neither.

OAuth2 token requests are excluded: they go to the identity service, which is
not versioned.
