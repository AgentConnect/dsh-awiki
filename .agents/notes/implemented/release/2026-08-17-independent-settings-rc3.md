# Independent settings release candidate

## Scope

- Release `@awiki/dsh@0.2.0-rc.3` repairs AWiki settings for plugins installed independently into stock DeepSeek Harness `0.1.0-rc.6`.
- AWiki owns a loopback-only settings RPC channel instead of relying on the stock Host API proxy's product namespace allowlist.
- The plugin continues to use the official `@deepseek-ai/dsh-settings` Host provider for storage, precedence, validation, and revision semantics.

## Safety contract

- The client RPC exposes only the AWiki domain setting and never returns the settings file path or unrelated namespaces.
- Non-loopback browser connections cannot read, modify, reset, or clear Host settings.
- Writes use optimistic revisions and fail closed on conflicts, cancellation, invalid requests, missing services, or read-only state.

## Validation contract

- Run the complete project verification gate and package dry-run for the exact RC version.
- Install the packed artifact in an empty consumer and import the root, provider, and summary-provider exports.
- Verify the packed plugin in an unmodified DeepSeek Harness Desktop runtime: load, save, reset, reconnect, and remote-origin rejection.
- Publish to npm on the `next` dist-tag, keep `latest` off the RC line, grant `awiki:developers` read-write access, and create a matching GitHub prerelease with the verified tarball.
