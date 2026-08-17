# OTP, composer, and summary-state release candidate

## Scope

- Release `@awiki/dsh-plugin@0.2.0-rc.5` with a server-directed OTP resend countdown that keeps the verification form available.
- Send a composed message with Enter, preserve Shift+Enter for line breaks, and avoid sending during IME composition.
- Mark an AI summary stale only after a genuinely new message, not after polling the same history or loading older pages.

## Publication contract

- Publish the public package on the `next` dist-tag.
- Keep `awiki:developers` read-write access for the package.
- Create a matching GitHub prerelease from the merged `main` commit and attach the exact verified npm tarball.
- Verify the package version, dist-tags, team permission, tarball integrity, and a clean public install after publication.
