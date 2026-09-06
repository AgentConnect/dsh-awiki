# Repository Guidelines

## Shared rules

Engineering work follows [AI Coding Rules](../awiki-harness/rules/ai-coding-rules.md).
Behavior changes and verification follow the relevant [Verification Policy](../awiki-harness/rules/verification-policy.md)
sections; production behavior needs owning unit coverage and applicable System/product E2E review.
If Harness is absent, use local docs/tests/CI and disclose missing acceptance evidence.

## Authority and Scope

`dsh-awiki` is the TypeScript AWiki plugin for DeepSeek Harness. Follow this
file, [README.md](README.md), and the authoritative documents under `docs/`.
Keep Host-only identity/message secrets out of Browser, Remote, Agent tools,
logs, reports, and model context. Preserve the ownership boundary between the
independent ANP Identity plugin and AWiki IM Core.

## Development Commands

- `pnpm run typecheck` — check Host and client TypeScript.
- `pnpm run test` — run Vitest unit and contract tests.
- `pnpm run verify` — run public-surface checks, build, typecheck, generated
  checks, and tests.
- `pnpm run verify:workspace` — additionally verify the sibling model-proxy
  package.
- `pnpm run e2e:smoke` — pack the current plugin, launch an isolated real DSH
  Web profile, and verify the visible AWiki launcher/identity entry in headless
  Chromium without creating a remote identity.
- `pnpm run e2e:smoke:webkit` — run the same no-write launcher case in WebKit;
  this is an optional future compatibility check, not part of the current
  Linux completion gate and not a replacement for Chromium P0.
- `DSH_AWIKI_E2E_CONFIG=<absolute-0600-json> pnpm run e2e:live` — run the
  general real `rwiki-cn-testing` CLI-peer cases with fail-closed cleanup and
  artifact scanning.
- `DSH_AWIKI_E2E_CONFIG=<absolute-awiki-info-0600-json> pnpm run e2e:live -- --headed --grep RECOVERY`
  is the separately approved headed macOS Recovery gate for exact target
  `awiki-info-testing`. Cleanup executes on Ali under the registered
  `awiki-info-managed-local-v1` profile. Do not use any other awiki.info target,
  profile, unprotected config, or non-headed invocation.

## Test Completeness

- Unit/contract tests live under `tests/` or the owning package's `tests/` directory.
- AWiki Me App product E2E remains owned by `../awiki-me/tests/e2e/`. This
  repository owns only the DSH plugin Web product E2E under `tests/e2e/`, which
  must launch a real DeepSeek Harness, drive the visible Web UI, and use a real
  independent CLI peer. DSH Web E2E does not replace App E2E or the generic
  cross-service coverage in `../awiki-system-test`.

## Change Discipline

- Keep changes scoped and reuse existing Host/provider/client boundaries.
- Update generated Typert/public artifacts only through the owning scripts and
  verify them with the checked-in gates.
- Update the corresponding design/API/configuration documents when behavior or
  public contracts change.
