Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- Prefer reliable existing libraries or patterns over reinventing the wheel.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

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
