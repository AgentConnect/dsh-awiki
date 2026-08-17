# Rust IM SDK migration

## Scope

- Replaced the vendored TypeScript AWiki SDK runtime/build/package path with the exact `@awiki/im-core-node@0.1.2` Node bridge and its audited Tier 1 native optional packages.
- Preserved the Cordis Service Definition / Provider / Consumer split: `AwikiService` owns public policy and failures, `@awiki/dsh/provider` opens one Rust client, and `RustSdkAdapter` copies native DTOs into Host-owned public values.
- Kept the independently replaceable AI summary provider and the merged 17-method Remote contract.

## State and migration boundary

- This release is an approved clean cutover. It does not import the legacy TypeScript SDK `identity.json` and does not add protocol or secret migration code to dsh-awiki.
- The Rust SDK exclusively owns identity, SecretVault, database, cache, and metadata under `stateRoot`; the Host does not inject Vault keys or identifiers.
- New Rust-backed identities retain ordinary local logout/resume continuity. Permanent local reset remains a separate explicit confirmation and delegates deletion to Rust `clearLocalData()`.

## Runtime and safety contract

- One process-exclusive Rust client follows the provider fiber, closes exactly once, and fails closed for unknown native errors or DTO shapes.
- The browser and model surfaces receive no token, private key, state path, Vault material, raw attachment bytes, or native object.
- Summary requests are gated by the local AWiki session. Results created across logout or destructive reset are discarded as cancelled.

## Validation contract

- Verify Rust DTO/error/lifecycle mapping, state locking and reopen, clean packed install without Rust tooling, and absence of TypeScript SDK package contents.
- Keep the full AI summary Host/provider/client boundary suite and selected-reference design QA green after the migration merge.
