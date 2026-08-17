# npm scope correction

## Scope

- The public package identity is `@awiki/dsh`; the GitHub repository remains `AgentConnect/dsh-awiki`.
- Release candidate `0.2.0-rc.2` replaces the accidentally unscoped npm publication without rewriting the immutable `v0.2.0-rc.1` GitHub or registry history.
- All public imports, Cordis loader entries, Typert package identifiers, invariant ownership, browser mounting metadata, and installation documentation use the scoped package name.

## Publication contract

- npm publication is public and targets the canonical npm registry.
- Prereleases publish on the `next` dist-tag and must not leave `latest` pointing at an RC.
- The `awiki:developers` npm team receives read-write access after publication.
- The accidental `dsh-awiki@0.2.0-rc.1` package is deprecated with a migration message to `@awiki/dsh@next`; it is not unpublished.

## Validation contract

- Verify the complete package test/build gate and dry-run tarball before publication.
- Install the packed artifact in an empty consumer and import the root, provider, and summary-provider exports.
- After publication, verify the public registry metadata, tarball install, dist-tags, team permission, deprecation notice, GitHub prerelease, and release asset.
