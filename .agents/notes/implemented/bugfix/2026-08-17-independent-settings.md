# Independent-install settings transport

## Problem

- An independently installed `@awiki/dsh@0.2.0-rc.2` registered its Host settings namespace successfully, but stock DeepSeek Harness `0.1.0-rc.6` intentionally exposed only product-owned namespaces through the generic browser settings API.
- The AWiki settings page therefore rendered its Host setting as unavailable even on the machine running Harness.

## Fix

- Keep `@deepseek-ai/dsh-settings` as the durable Host owner and validation boundary.
- Register a dedicated `/awiki-settings` Connection RPC channel with `loopback` authority instead of depending on a core allowlist entry.
- Send only the AWiki domain, base/user override shape, revision, and writability to the browser. Every write carries the last read revision and fails closed on conflicts, malformed data, cancellation, missing providers, or rejected storage.
- Keep non-loopback clients unavailable and read-only; reconnecting to a later Host generation reloads the view.

## Verification contract

- Prove the browser plugin has no `settingsScope` dependency and reaches only the plugin-owned channel.
- Cover describe, set, reset, optimistic conflict recovery, invalid payloads, cancellation, missing providers, non-loopback denial, malformed output, reconnect, and teardown.
- Run the complete package verification and dry-run pack, then exercise the packed plugin against an unmodified stock Desktop Host before calling the fix release-ready.
