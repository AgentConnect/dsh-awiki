# @awiki/dsh-model-proxy

Optional AWiki-authenticated model provider and Quick Recharge UI for DeepSeek Harness.

Install `@awiki/dsh-plugin` first, then add this package to the same DSH profile:

```bash
dsh plugin --profile web add @awiki/dsh-plugin@latest
dsh plugin --profile web add @awiki/dsh-model-proxy@latest
```

The package contributes the `awiki-model-proxy` Host runtime and the Browser
surfaces that belong to it: model onboarding plus Settings → Quick Recharge,
whose Account & Recharge and Usage tabs own model opt-in, recharge, and usage.
It uses the public `@awiki/dsh-plugin/model-proxy-contract` and the shared AWiki
Browser identity bridge; it does not copy the AWiki service, RPC contract, or
session model. Its bundle patch explicitly injects the already loaded `awiki`
service.

The provider is disabled until a local user explicitly enables it. Short-lived
model tokens stay in the Host. The Browser receives only the public account,
usage, and recharge projections defined by the main AWiki package. The UI also
states that hosted models come from the official DeepSeek API and follow
DeepSeek's official pricing.

When the main package finishes Recovery V4, this package registers its exact
Model Proxy base URL as a Host-only reconciliation target. The main Host sends
one current-DID-authenticated, short-lived recovery attestation to restore the
original canonical billing account. The package never receives an attestation
callback, and neither the attestation nor the canonical ledger identity crosses
into Browser state. Empty current-DID shells are reconciled idempotently;
non-empty conflicts remain a server-side manual-reconciliation case.

## Migration from the former subpath

The Host runtime previously exported as `@awiki/dsh-plugin/model-proxy` is now
this package's root export:

```ts
import * as modelProxy from '@awiki/dsh-model-proxy'
```

The browser-safe RPC contract remains available from
`@awiki/dsh-plugin/model-proxy-contract`. Installing only
`@awiki/dsh-plugin` no longer inserts or loads any model proxy Host or Browser
surface. Existing model proxy configuration variables keep their names:

- `DSH_AWIKI_MODEL_PROXY_URL`
- `DSH_AWIKI_MODEL_CONTEXT_WINDOW`
- `DSH_AWIKI_MODEL_MAX_TOKENS`
- `DSH_AWIKI_MODEL_TOKEN_REFRESH_SKEW_SECONDS`

This package targets the DeepSeek Harness `0.1.1-rc.2` package family and
requires `@awiki/dsh-plugin@^0.3.2` as a peer dependency. That release adds the
Host-only post-recovery mailbox and Model Proxy reconciliation contract while
retaining the shared `awikiClient` Browser bridge and the independently loaded
Model Proxy runtime.
