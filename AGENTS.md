# Repository Guidelines

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
  this is a macOS compatibility gate, not a replacement for Chromium P0.
- `DSH_AWIKI_E2E_CONFIG=<absolute-0600-json> pnpm run e2e:live` — run the four
  real `rwiki-cn-testing` CLI-peer cases with fail-closed cleanup and artifact
  scanning. Never point this command at `awiki.info`.

## Test Completeness

- Every production behavior change must add or update the corresponding Vitest
  unit/contract tests under `tests/` or the owning package's `tests/` directory
  in the same task. If an existing test already covers the exact behavior and
  failure mode, identify it and record the result.
- Before completion, review the corresponding `../awiki-system-test` suite and
  case catalog for success, relevant failures, cross-service behavior,
  persistence and cleanup, and the regression boundary. Update it in the same
  task when coverage is incomplete; record the reason when it is not
  applicable.
- AWiki Me App product E2E remains owned by `../awiki-me/tests/e2e/`. This
  repository owns only the DSH plugin Web product E2E under `tests/e2e/`, which
  must launch a real DeepSeek Harness, drive the visible Web UI, and use a real
  independent CLI peer. DSH Web E2E does not replace App E2E or the generic
  cross-service coverage in `../awiki-system-test`.
- Do not add tests mechanically. Each test must trace to requested behavior, a
  regression, a failure mode, or a cleanup invariant.

## Change Discipline

- Keep changes scoped and reuse existing Host/provider/client boundaries.
- Update generated Typert/public artifacts only through the owning scripts and
  verify them with the checked-in gates.
- Update the corresponding design/API/configuration documents when behavior or
  public contracts change.
