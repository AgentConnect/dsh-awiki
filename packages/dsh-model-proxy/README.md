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

Before registering its adapter, exposing its directory entry, or issuing a
short-lived token, the Host authenticates the current DID through
`ctx.awiki.externalHttpAuth` and posts the strict empty JSON object `{}` to the
Model Proxy's existing `/api/identity-recovery` endpoint. The actual public
response is an exact outcome-only object: `restored`, `already_current`, or
`not_applicable` opens the matching current-generation gate. Any extra field,
unknown outcome, or manual/permanent rejection keeps the adapter suspended;
one 503 is retried. Transition assurance remains a Model server-side
operation/audit invariant and is verified by the Model/System DB oracle, not
inferred from this public response. Session
generation changes, sign-out, unload, and late completions clear the token and
cannot reopen an older identity. No User Service recovery credential,
operation ID, DID path, proof, assurance, or ledger owner is sent in the request
or exposed to Browser state.
Account output is bound to the current session DID, while usage and recharge
outputs reject canonical DID, stable-subject, path, or proof fields instead of
forwarding private Model storage ownership to Browser RPC.

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

- Model Proxy endpoint is discovered only from the active tenant's `server-info` capability.
- `DSH_AWIKI_MODEL_CONTEXT_WINDOW`
- `DSH_AWIKI_MODEL_MAX_TOKENS`
- `DSH_AWIKI_MODEL_TOKEN_REFRESH_SKEW_SECONDS`

In normal production profiles the active tenant publishes the Model Proxy URL through
`server-info.services.model_proxy`. There is no fixed production fallback or global URL override.
Tenant switching releases the old adapter, provider directory, recovery target, and token cache
before binding the new capability; model intent and the non-AWiki fallback selection are stored
independently for each tenant.

This package targets the DeepSeek Harness `0.1.1-rc.2` package family and
requires `@awiki/dsh-plugin@^0.3.9` as a peer dependency. It retains the shared
`awikiClient` Browser bridge and the independently loaded Model Proxy runtime.
