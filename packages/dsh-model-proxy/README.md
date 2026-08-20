# @awiki/dsh-model-proxy

Optional Host-only AWiki-authenticated model provider for DeepSeek Harness.

Install `@awiki/dsh-plugin` first, then add this package to the same DSH profile:

```bash
dsh plugin --profile web add @awiki/dsh-plugin@latest
dsh plugin --profile web add @awiki/dsh-model-proxy@latest
```

The package contributes only the `awiki-model-proxy` Host runtime. It uses the
public `@awiki/dsh-plugin/model-proxy-contract` and AWiki session types; it does
not copy the AWiki service, browser client, RPC contract, or session model.
Its bundle patch explicitly injects the already loaded `awiki` service.

The provider is disabled until a local user explicitly enables it. Short-lived
model tokens stay in the Host. The browser receives only the public account,
usage, and recharge projections defined by the main AWiki package.

## Migration from the former subpath

The Host runtime previously exported as `@awiki/dsh-plugin/model-proxy` is now
this package's root export:

```ts
import * as modelProxy from '@awiki/dsh-model-proxy'
```

The browser-safe RPC contract remains available from
`@awiki/dsh-plugin/model-proxy-contract`. Installing only
`@awiki/dsh-plugin` no longer inserts or loads the model proxy. Existing model
proxy configuration variables keep their names:

- `DSH_AWIKI_MODEL_PROXY_URL`
- `DSH_AWIKI_MODEL_CONTEXT_WINDOW`
- `DSH_AWIKI_MODEL_MAX_TOKENS`
- `DSH_AWIKI_MODEL_TOKEN_REFRESH_SKEW_SECONDS`

This package targets the DeepSeek Harness `0.1.0-rc.7` package family and
requires `@awiki/dsh-plugin@^0.3.0` as a peer dependency. The `0.3.0` boundary
ensures the main package has already removed its former default Model Proxy
runtime before this package is activated.
