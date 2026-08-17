# Canonical dsh-plugin package identity

## Scope

- Release `@awiki/dsh-plugin@0.2.0-rc.4` as the canonical npm identity for the standalone DeepSeek Harness integration.
- Keep the GitHub repository at `AgentConnect/dsh-awiki`; only the public package identity changes.
- Update Cordis loader entries, Typert package and type symbols, invariant ownership, browser contribution metadata, generated declarations and bundles, tests, and installation documentation together.

## Registry history

- The former `@awiki/dsh` package was unpublished on 2026-08-17 and entered npm's same-name cooldown period.
- Do not treat the hidden `@awiki/dsh@0.2.0-rc.3` registry response as a successful public release; public unauthenticated reads remained an unpublish tombstone.
- Historical GitHub tags and release notes remain immutable evidence and are not rewritten.

## Publication contract

- Publish the new public scoped package on the `next` dist-tag.
- Grant `awiki:awiki` read-write access and do not restore the package to `awiki:developers`.
- Keep `latest` off the release-candidate line.
- Verify unauthenticated registry metadata, exact tarball integrity, team access, and clean public installation after publication.
