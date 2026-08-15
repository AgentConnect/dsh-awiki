# dsh-awiki

AWiki identity and messaging for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).
The package installs one Host service, its production TypeScript SDK provider,
the model tools, and a Web client with a draggable AWiki Me launcher.

[中文说明](./README.zh.md)

Registration failures preserve the form and local pending identity material. Closed registration,
unavailable verification state, and commit conflicts each give a safe next action without exposing
remote response details.

## Features

- Register one deployment-level AWiki identity from the Web UI.
- Reuse that identity across the root Agent and its subagents.
- Direct-message and existing-group conversation lists, unread counts, latest-message previews, and persisted display names.
- Text messages plus one attachment per message, with image previews and SHA verification.
- A draggable circular launcher, adaptive popup placement, dark mode, and remembered active conversation.
- An AWiki page in DSH Settings for a durable, validated default Handle domain.
- A typed second confirmation in the Settings danger zone before permanently clearing local AWiki identity, key, token, registration-draft, and message-index state.
- Five approval-aware Agent tools: identity status, conversations, history, text send, and attachment send.

The first release does not implement end-to-end encryption, multiple identities,
group administration, realtime push, or multiple attachments in one message.

## Install

The repository is directly installable as a DSH plugin because built artifacts
are committed:

```bash
pnpm add github:AgentConnect/dsh-awiki
```

Apply the package after the normal DSH base and Web app bundles. Its
`cordis.patch.yml` adds the Host service and provider; DSH discovers and injects
the browser client through the package metadata.

## Configuration

The plugin works against the public `awiki.ai` tenant without environment configuration. Set these variables only when a deployment needs an override:

| Variable | Purpose | Default |
| --- | --- | --- |
| `DSH_AWIKI_USER_SERVICE_URL` | Absolute AWiki user-service URL | `https://awiki.ai` |
| `DSH_AWIKI_USER_SERVICE_DOMAIN` | Composition default for the Handle provider domain | `awiki.ai` |
| `DSH_AWIKI_MESSAGE_SERVICE_URL` | Message-service URL called by the Host | `https://awiki.ai` |
| `DSH_AWIKI_MESSAGE_SERVICE_DID` | Authoritative message-service DID | `did:wba:awiki.ai` |
| `DSH_AWIKI_MESSAGE_SERVICE_PUBLIC_URL` | Public endpoint written to protocol records | `https://awiki.ai` |
| `DSH_AWIKI_ALLOWED_ATTACHMENT_ORIGINS` | JSON array of extra exact HTTPS origins | `[]` |
| `DSH_AWIKI_STATE_PATH` | Private identity state file | `$DSH_HOME/awiki/identity.json` or `~/.dsh/awiki/identity.json` |
| `DSH_AWIKI_POLL_INTERVAL_MS` | Open-dialog polling interval | `5000` |
| `DSH_AWIKI_ATTACHMENT_MAX_BYTES` | Decoded attachment limit | `10485760` |

The default Handle provider domain is `awiki.ai`. A local user can override it
from Settings → AWiki; DSH persists that choice in its settings document and
applies it after the next Harness restart. The setting affects future identity
registration and completion of short Handles. It does not rewrite an already
registered DID or Handle.

Settings → AWiki → Danger zone clears only this installation's local AWiki
state; it does not delete the server-side account or Handle. The dialog requires
the displayed confirmation phrase. After success, the local DID keys, access
token, registration draft, conversations, and attachment index cannot be
recovered by the app, and this installation may lose access to the old identity.

The provider domain and message-service DID are protocol identifiers. Do not
infer them from an API hostname. Production service URLs must use HTTPS. The identity state file contains access material;
keep it outside the repository, restrict filesystem access, and protect the
underlying disk and backups.

For the default 10 MiB decoded attachment cap, configure a reverse-proxy request
limit of at least 14 MiB to account for base64 and JSON overhead.

## Development

Requirements: Node.js 22.19+ (or 24+) and pnpm 11.7.

```bash
pnpm install --frozen-lockfile
pnpm run verify
pnpm pack --dry-run
```

`@anp/typescript-sdk@0.2.0` is not yet available from npm, so this repository
temporarily carries a reviewed source snapshot under `vendor/`. The production
Host bundles that SDK; consumers do not need a second checkout. See
`THIRD_PARTY_NOTICES.md` for provenance and licensing.

The checked-in Typert Host/Remote artifacts were generated from the same Host
contract. `pnpm check:generated` pins their complete thirteen-method surface until
the standalone Typert generator supports root-level packages.

## Security

Do not commit OTPs, access tokens, private keys, identity state, `.env` files, or
remote-test reports. `pnpm check:public` enforces the public-tree guard before
verification and packaging.

## License

The plugin is MIT licensed. Vendored third-party material remains subject to its
own retained notices and licenses.
