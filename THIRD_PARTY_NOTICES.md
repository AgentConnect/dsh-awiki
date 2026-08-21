# Third-party notices

## AWiki Rust IM Core Node SDK

`@awiki/im-core-node@0.1.6` and its target-specific optional package provide the
Rust IM Core runtime used by the Host provider. These packages are distributed
under AGPL-3.0-only. Each package carries its own `LICENSE`, `NOTICE.md`,
`SOURCE.md`, CycloneDX SBOM, checksums, and build provenance. The corresponding
source is the `AgentConnect/awiki-cli-rs2` repository at the commit recorded in
the installed package's `provenance.json`.

The native runtime includes the pinned Agent Network Protocol Rust SDK revision
recorded in that same provenance and SBOM. The native package remains external
to the `dsh-awiki` JavaScript bundle and is installed through the package
manager as a normal exact-version runtime dependency.

## AWiki Me icon

The embedded launcher artwork in `src/client/assets.ts` comes from the AWiki Me
application maintained by the same project team. Its use here is limited to
identifying the AWiki integration.

## QR Code generation

The browser bundle uses `qrcode@1.5.4` (node-qrcode) to render TongQiFu
`ALI_QR` payment content as an image. The package and its bundled browser
dependencies are distributed under their respective MIT licenses; their
license text is retained by the package manager and source distribution.
