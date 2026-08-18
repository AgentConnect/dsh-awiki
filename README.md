# @awiki/dsh-plugin

AWiki identity and messaging for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).
The package installs one Host service, its production Rust SDK provider,
the model tools, and a Web client with a draggable AWiki Me launcher.

[中文说明](./README.zh.md)

Registration failures preserve the form and local pending identity material. Closed registration,
unavailable verification state, and commit conflicts each give a safe next action without exposing
remote response details.

The Rust SDK exclusively owns the identity, SecretVault, database, cache, and metadata below the
configured `stateRoot`. This release performs a clean cutover and does not import the former
TypeScript SDK `identity.json`; create a new Rust-backed identity after upgrading.

## Features

- Register one deployment-level AWiki identity from the Web UI.
- Open the top-left AWiki account menu to sign out locally without deleting the encrypted identity or message database; **Resume** restores the same DID and Handle, including across DSH restarts.
- Reuse that identity across the root Agent and its subagents.
- Direct-message and existing-group conversation lists, unread counts, latest-message previews, and persisted display names. Core SQLite remains the persistent source of truth: the Host joins persisted peer profiles onto Direct roster rows, while the browser keeps the active identity's last trustworthy Direct profile and group title. Sparse polling identifiers therefore cannot overwrite a resolved display name or real group title. Opening a conversation renders the committed local timeline first, hydrates group sender labels from the Core display-profile cache, reconciles remote history and Direct profile data in the background, and keeps local messages visible if refresh fails. A failed background roster poll also leaves the usable local view quiet; explicit loads still surface their errors. This local-first path covers the newest projected page; loading older messages still requires the remote history service. Scrolling up reveals a latest-message control that counts newer arrivals without interrupting reading. A conversation is marked read only after its newest rendered message reaches the visible bottom.
- Create a private-discovery, open-join, transport-protected group from the Web UI with a name and 1–50 initial Handle or DID members. The group opens immediately; members that could not be added are reported without hiding the successfully created group.
- Text messages plus one attachment per message, with Enter-to-send, Shift+Enter line breaks, optimistic sending bubbles reconciled by an exact client message ID, image previews, and SHA verification. Verified image bytes use three bounded layers: a browser-runtime LRU makes conversation remounts immediate, identity-scoped IndexedDB survives full page reloads without a Host call, and the private Host disk cache survives browser-storage loss and Harness restarts. Clear Local Data removes all three layers.
- A draggable circular launcher, adaptive popup placement, dark mode, and remembered active conversation.
- User-triggered AI summaries for up to 50 recent or unread messages, kept only in runtime memory with explicit stale, retry, copy, and source-navigation states.
- OTP registration keeps the verification form visible and disables resend with a visible server-directed cooldown countdown.
- An AWiki page in DSH Settings for a durable, validated default Handle domain.
- A typed second confirmation in the Settings danger zone before permanently clearing local AWiki identity, key, token, registration-draft, and message-index state.
- Five approval-aware Agent tools: identity status, conversations, history, text send, and attachment send.

The first release does not implement end-to-end encryption, multiple identities,
post-creation group administration, realtime push, or multiple attachments in one message.

## Install

Install the official public npm package:

```bash
dsh plugin --profile web add @awiki/dsh-plugin@latest
```

The profile installer both adds the package and activates its bundle layer. A
plain `npm i @awiki/dsh-plugin` in a DSH project only installs the package; it
does not activate the bundle, so the profile command remains the recommended
installation path. This release line targets the `0.1.0-rc.7` package family
and pins every direct Host peer exactly, preventing npm from mixing prerelease
families in a DSH root dependency tree.

`@awiki/dsh-plugin` is the canonical package identity starting with
`0.2.0-rc.4`. The former `@awiki/dsh` registry entry was unpublished and is
not an installation source for this release line.

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
| `DSH_AWIKI_STATE_ROOT` | Private Rust IM Core state directory | `$DSH_HOME/awiki/im-core` or `~/.dsh/awiki/im-core` |
| `DSH_AWIKI_POLL_INTERVAL_MS` | Open-dialog polling interval | `5000` |
| `DSH_AWIKI_ATTACHMENT_MAX_BYTES` | Decoded attachment limit | `10485760` |
| `DSH_AWIKI_IMAGE_CACHE_MAX_BYTES` | Private verified image-preview cache budget | `67108864` |
| `DSH_AWIKI_SUMMARY_MAX_INPUT_BYTES` | UTF-8 cap after Host-side summary minimization | `32768` |
| `DSH_AWIKI_SUMMARY_TIMEOUT_MS` | One-shot model deadline | `30000` |
| `DSH_AWIKI_SUMMARY_MAX_OUTPUT_TOKENS` | Structured summary output cap | `768` |

The default Handle provider domain is `awiki.ai`. A local user can override it
from Settings → AWiki; DSH persists that choice in its settings document and
applies it after the next Harness restart. The setting affects future identity
registration and completion of short Handles. It does not rewrite an already
registered DID or Handle.

The settings page talks to a plugin-owned Connection channel that the Host
accepts only from loopback. This keeps an independently installed `@awiki/dsh-plugin`
compatible with stock DSH releases without adding AWiki to a core settings
allowlist; non-local browser origins cannot read or mutate the Host setting.

Settings → AWiki → Danger zone clears only this installation's local AWiki
state; it does not delete the server-side account or Handle. The dialog requires
the displayed confirmation phrase. After success, the local DID keys, access
token, registration draft, conversations, attachment index, and cached image previews cannot be
recovered by the app, and this installation may lose access to the old identity.

Ordinary sign-out is separate from that destructive action. It writes only a private
Host-owned session marker, gates both Web and Agent operations, and retains the SDK-owned
SecretVault identity, keys, tokens, conversations, attachment index, and cached image previews. Resuming removes
the marker and reloads the same local identity without registration.

The provider domain and message-service DID are protocol identifiers. Do not
infer them from an API hostname. Production service URLs must use HTTPS. The IM Core state directory contains access material;
keep it outside the repository, restrict filesystem access, and protect the
underlying disk and backups.

For the default 10 MiB decoded attachment cap, configure a reverse-proxy request
limit of at least 14 MiB to account for base64 and JSON overhead.

AI summary generation runs only after the user selects **AI Summary**. If a
conversation had unread messages when it was opened, the Host summarizes that
unread tail; otherwise it summarizes the newest 50 messages. The Host enforces
the 50-message and UTF-8 limits, sends attachment metadata rather than file
bytes, and treats serialized conversation content as untrusted data. Summaries
are cached per conversation only for the current browser runtime and become
stale, without another model call, when newer messages arrive. The replaceable
`@awiki/dsh-plugin/summary-provider` uses the current Harness default provider and model
for one direct `ctx.llm.stream` request; it does not create an Agent or write an
Agent session.

## External HTTP ANP authentication

Trusted same-process DSH Host plugins can authenticate an externally transported HTTP request
without handling ANP signatures, access tokens, challenges, or retries themselves:

```ts
const response = await ctx.awiki.externalHttpAuth.dispatch(
  new Request('https://api.example.com/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ productId: '123' }),
  }),
  request => fetch(request),
)
```

The callback remains the only network transport owner. AWiki buffers at most 4 MiB of exact body
bytes, forces manual redirects, asks Rust to select an origin-scoped in-memory Bearer token or a
fresh HTTP Message Signature, observes only authentication response headers, and invokes the
transport at most twice for one bounded `401` authentication retry. The final `Response` body is
untouched. Transport rejections preserve their original error identity.

The unsigned input must not contain `Authorization`, `Signature-Input`, `Signature`, or
`Content-Digest`. Production targets require HTTPS; test-only loopback HTTP uses the existing
`allowInsecureLoopbackForTesting` deployment gate. Tokens come only from successful
`Authentication-Info` responses, are scoped to the current identity/signing key/origin, and are
not persisted across Harness restarts.

`externalHttpAuth` is deliberately absent from Browser Remote, Agent tools, Typert Remote, and the
Web client bundle. Exposing it across an untrusted boundary would create a signing oracle.

## Development

Requirements: Node.js 22.19+ (or 24+) and pnpm 11.7.

```bash
pnpm install --frozen-lockfile
pnpm run verify
pnpm pack --dry-run
```

The production Host loads the exact `@awiki/im-core-node@0.1.4` runtime package;
the platform-specific native addon is selected through its optional dependencies
and remains external to the JavaScript bundle. Consumers do not need Rust or an
`awiki-cli-rs2` checkout. See `THIRD_PARTY_NOTICES.md` for provenance and
licensing.

The checked-in Typert Host/Remote artifacts were generated from the same Host
contract. `pnpm check:generated` pins their complete eighteen-method surface until
the standalone Typert generator supports root-level packages.

## Security

Do not commit OTPs, access tokens, private keys, identity state, `.env` files, or
remote-test reports. `pnpm check:public` enforces the public-tree guard before
verification and packaging.

## License

The plugin is MIT licensed. Its Rust IM Core runtime dependency is distributed
under AGPL-3.0-only and remains subject to its own retained notices and license.
