# DSH rc.5 compatibility

## Scope

- Release candidate `0.2.0-rc.3` declares the current desktop source tree's DSH `0.1.0-rc.5` API as its minimum supported prerelease.
- The caret range also accepts the published DSH `0.1.0-rc.6` packages used by this repository's standalone development dependencies.
- The runtime `@deepseek-ai/dsh-settings` dependency follows the same minimum so a DSH workspace can provide one compatible settings implementation.

## Validation contract

- Run the complete standalone verification suite against the published DSH `rc.6` development dependencies.
- Pack the candidate, install that exact tarball into the desktop `rc.5` workspace without publishing it, and verify the profile, Host, Web client, settings, identity and messaging paths there.
- Treat a failing desktop integration as an API incompatibility; do not make the desktop package metadata claim `rc.6` without the corresponding source update.
