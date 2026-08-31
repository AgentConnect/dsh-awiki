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
- Product E2E tests are owned only by `../awiki-me/tests/e2e/`. This repository
  does not add or require repository-local product E2E tests.
- Do not add tests mechanically. Each test must trace to requested behavior, a
  regression, a failure mode, or a cleanup invariant.

## Change Discipline

- Keep changes scoped and reuse existing Host/provider/client boundaries.
- Update generated Typert/public artifacts only through the owning scripts and
  verify them with the checked-in gates.
- Update the corresponding design/API/configuration documents when behavior or
  public contracts change.
