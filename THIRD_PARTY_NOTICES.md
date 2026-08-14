# Third-party notices

## Agent Network Protocol TypeScript SDK

`vendor/anp-typescript-sdk` is a source snapshot of the TypeScript SDK from
[`agent-network-protocol/anp`](https://github.com/agent-network-protocol/anp),
based on the `agent/awiki-im-sdk` development line. The upstream repository is
distributed under Apache License 2.0; its license is retained at
`vendor/anp-typescript-sdk/LICENSE`. The vendored package metadata identifies
the SDK package as MIT licensed.

Only the production SDK source and the focused AWiki IM/proof tests are carried;
upstream generated examples, credentials, and unrelated interoperability
fixtures are intentionally excluded from this public plugin repository.

The snapshot is temporary because `@anp/typescript-sdk@0.2.0` is not currently
published to npm. Replace the workspace dependency with a normal semver
dependency after the SDK is published and independently verified.

## AWiki Me icon

The embedded launcher artwork in `src/client/assets.ts` comes from the AWiki Me
application maintained by the same project team. Its use here is limited to
identifying the AWiki integration.
