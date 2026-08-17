# OTP cooldown, Enter send, and summary stale-state repair

## Product behavior

- A successful OTP request keeps the verification form open and shows a disabled resend countdown. The resend action becomes available only after the Host-provided cooldown duration.
- The message composer sends on plain Enter, preserves Shift+Enter for multiline drafts, and never sends while an IME composition is active.
- A cached AI summary becomes stale only after a genuinely new message. Re-reading the same latest page, switching conversations, or loading older history does not create a false stale state.

## Implementation boundary

The Web client owns countdown presentation and keyboard semantics. The controller records a runtime-only newest-message baseline when a summary succeeds, compares later history by message identity and timestamp, and treats successful local sends as explicit new messages. No automatic model call or persisted summary state was added.

## Verification

Focused component and controller tests cover the 60-second cooldown transition, resend, Enter/Shift+Enter/IME behavior, repeated polling, older-history pagination, real new-message stale transition, and the existing regenerate flow. Run `pnpm run verify` and `npm pack --dry-run` before release.
