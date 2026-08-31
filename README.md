# @awiki/dsh-plugin

AWiki account, authorization, recovery, and messaging for
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). The package installs one Host
service, its IM Core provider, the model tools, and a Web client with a draggable AWiki Me launcher.
General DID documents and private keys are managed by the independent
`@agent-network-protocol/dsh-anp-identity` plugin and injected through Cordis.

[中文说明](./README.zh.md)

Identity-entry failures preserve the currently mounted form and local pending identity material. The
phone and OTP never enter browser persistence, controller snapshots, or public
Remote results. Closed registration, unavailable verification state, and commit conflicts each give
a safe next action without exposing remote response details.

The two plugins deliberately own different state. ANP Identity owns the multi-DID Store, DID
documents, private keys, and publication transactions. AWiki IM Core owns Handle/account bindings,
device and recovery workflows, authentication tokens, messages, mail, SQLite, and caches below its
configured `stateRoot`. The Host-only provider lease is never exposed to Browser, Remote, Agent
tools, or model APIs.

## Features

- Enter a Handle and phone through one Web UI flow and always request a registration OTP. A new Handle creates the deployment identity; an existing Handle offers ordinary Device Join first, with Recovery V4 as an explicit destructive alternative that requests a second purpose-scoped OTP.
- DSH can join an existing Handle as an independent member device. When DSH created or recovered the Handle and is the current ready-admin, the foreground Devices tab can list devices, verify an incoming request with SAS, approve one member, reject it, or revoke another device. These mutations are not Agent tools and require explicit `APPROVE` / `REVOKE` confirmation.
- Open the top-left AWiki account menu to sign out locally without deleting the encrypted identity or message database; **Resume local identity** restores the same DID and Handle, including across DSH restarts. The signed-out screen reveals phone recovery only after local resume fails. Switching identities requires an explicit confirmation that permanently clears local AWiki data first.
- Reuse that identity across the root Agent and its subagents.
- Direct-message and existing-group conversation lists, unread counts, latest-message previews, and persisted display names. Core SQLite remains the persistent source of truth: the Host joins persisted peer profiles onto Direct roster rows, while the browser keeps the active identity's last trustworthy Direct profile and group title. Sparse polling identifiers therefore cannot overwrite a resolved display name or real group title. After an existing Handle is recovered, the Host synchronizes account projections before asking Core to restore old group memberships; pending or blocked groups expose a retryable status without disabling Direct messages or other groups. Opening a conversation renders the committed local timeline first, hydrates group sender labels from the Core display-profile cache, reconciles remote history and Direct profile data in the background, and keeps local messages visible if refresh fails. A failed background roster poll also leaves the usable local view quiet; explicit loads still surface their errors. This local-first path covers the newest projected page; loading older messages still requires the remote history service. Scrolling up reveals a latest-message control that counts newer arrivals without interrupting reading. A conversation is marked read only after its newest rendered message reaches the visible bottom.
- Create a private-discovery, open-join, transport-protected group from the Web UI with a name and 1–50 initial Handle or DID members. The group opens immediately; members that could not be added are reported without hiding the successfully created group.
- Text messages plus one attachment per message, with Enter-to-send, Shift+Enter line breaks, optimistic sending bubbles reconciled by an exact client message ID, image previews, and SHA verification. Verified image bytes use three bounded layers: a browser-runtime LRU makes conversation remounts immediate, identity-scoped IndexedDB survives full page reloads without a Host call, and the private Host disk cache survives browser-storage loss and Harness restarts. Clear Local Data removes all three layers.
- A draggable circular launcher that defaults to the lower-left sidebar area, adaptive popup placement, dark mode, and remembered active conversation.
- User-triggered AI summaries for up to 50 recent or unread messages, kept only in runtime memory with explicit stale, retry, copy, and source-navigation states.
- OTP identity access keeps the verification form visible and disables resend with a visible server-directed cooldown countdown. Handle classification happens before OTP delivery, so each attempt sends exactly one purpose-correct registration or recovery code.
- After Recovery V4 reaches `applied`, the Host resolves the recovered Handle's original mailbox under the current DID. If the separate Model Proxy package is installed, the Host also obtains one short-lived, audience-bound recovery attestation and reconciles the current DID to the original billing account without copying or adding balances. A temporary failure keeps only the non-secret recovery operation ID and retries the same idempotent reconciliation after restart; the attestation and ledger identity never enter Browser state, Agent tools, logs, or model context.
- When the separate `@awiki/dsh-model-proxy` package is installed, an AWiki-hosted DeepSeek choice appears before the official API-key onboarding step only when Harness has no usable model provider, with an explicit opt-in and an unchanged API-key escape path. New sessions do not show AWiki model or payment prompts after the official or another provider is usable.
- The optional model-proxy package owns the Host short-token flow and every model-hosting Browser surface: onboarding plus Settings → Quick Recharge with Account & Recharge and Usage tabs. It registers `awiki-deepseek` with `deepseek-v4-flash` and `deepseek-v4-pro`; Flash is recommended and credentials never enter the Browser.
- AWiki identity, domain, and local-data settings remain in the main package. Installing only the main package does not register model opt-in, recharge, usage, or model onboarding UI.
- A typed second confirmation in the Settings danger zone before permanently clearing local AWiki identity, key, token, registration-draft, and message-index state.
- Five messaging Agent tools: identity status, conversations, history, approved text send, and approved attachment send.
- Five on-demand mail Agent tools: mailbox account, inbox, plain-text read, approved mark-read, and approved plain-text send.
- A default identity-level realtime connection for Direct, Group, and System Notification sync, plus an independent opt-in Agent consumer that lets exact-allowlisted Direct peers continue one DSH Agent session or use `/new`, `/status`, and `/help`.

## Screenshots

### Messaging

![AWiki direct and group messaging in DeepSeek Harness](./assets/screenshots/awiki-messaging.png)

### Mail

![AWiki mailbox in DeepSeek Harness](./assets/screenshots/awiki-mail.jpg)

The first release does not implement end-to-end encryption, multiple identities,
post-creation group administration or multiple attachments in one message. The Agent listener accepts only
plain Direct text; Groups, attachments, encrypted/payload content, and unknown slash commands never
reach the Agent.

Mail v1 is on demand only and has no browser mailbox or compose UI. It does not wake an Agent for
new mail, render or send HTML, transfer mail attachments, or implement reply, forward, and
threading. Mail subject, addresses, preview, body, timestamps, and attachment metadata are
untrusted external data, never Agent instructions. `awiki_mail_mark_read` and `awiki_mail_send`
require execution approval. Mail send is attempted once without automatic retry; a timeout or
transport loss returns `delivery-unknown`, so inspect the mailbox before approving another send.

Identity recovery does not add server-side private-chat restoration. A fresh local state does not
reconstruct historical Direct conversations; only ordinary data already retained by the Rust SDK
continues to follow Core's existing local migration rules. Mailbox and hosted-model reconciliation
are independent of that private-chat boundary.

## Install

Install the independent identity plugin first, then AWiki:

```bash
dsh plugin --profile web add @agent-network-protocol/dsh-anp-identity@latest
dsh plugin --profile web add @awiki/dsh-plugin@latest
```

The main package no longer installs the AWiki-hosted model provider. Add the
independently versioned Model Proxy package only when that capability is wanted:

```bash
dsh plugin --profile web add @awiki/dsh-model-proxy@latest
```

The profile installer both adds the package and activates its bundle layer. A
plain `npm i @awiki/dsh-plugin` in a DSH project only installs the package; it
does not activate the bundle, so the profile command remains the recommended
installation path. This release line targets the `0.1.1-rc.2` package family
and pins every direct Host peer exactly, preventing npm from mixing prerelease
families in a DSH root dependency tree.

`@awiki/dsh-plugin` is the canonical package identity starting with
`0.2.0-rc.4`. The former `@awiki/dsh` registry entry was unpublished and is
not an installation source for this release line.

Apply the packages after the normal DSH base and Web app bundles. The main
`cordis.patch.yml` loads the ANP Identity Service, its native Provider, the AWiki Host Service, the
AWiki IM Core Provider, and the summary Provider in that order; DSH discovers and injects the
browser client through package metadata. Teardown closes IM Core before revoking its identity
lease, and the identity Store Provider closes last. The patch does not insert Model Proxy. The optional package has its
own patch, inserts exactly one `awiki-model-proxy` row after AWiki, and declares
an explicit dependency on the loaded `awiki` service.

## Configuration

The plugin works against the public `awiki.ai` tenant without environment configuration. Set these variables only when a deployment needs an override:

| Variable | Purpose | Default |
| --- | --- | --- |
| `DSH_AWIKI_USER_SERVICE_URL` | Absolute AWiki user-service URL | `https://awiki.ai` |
| `DSH_AWIKI_USER_SERVICE_DOMAIN` | Composition default for the Handle provider domain | `awiki.ai` |
| `DSH_AWIKI_MESSAGE_SERVICE_URL` | Message-service URL called by the Host | `https://awiki.ai` |
| `DSH_AWIKI_MAIL_SERVICE_URL` | Mail-service URL called by the Host | Resolved user-service URL |
| `DSH_AWIKI_MESSAGE_SERVICE_DID` | Authoritative message-service DID | `did:wba:awiki.ai` |
| `DSH_AWIKI_MESSAGE_SERVICE_PUBLIC_URL` | Public endpoint written to protocol records | `https://awiki.ai` |
| `DSH_AWIKI_GUEST_GATEWAY_URL` | Guest origin used by Integration management and the dynamic guide | `https://awiki.info` |
| `DSH_AWIKI_ALLOWED_ATTACHMENT_ORIGINS` | JSON array of extra exact HTTPS origins | `[]` |
| `DSH_AWIKI_STATE_ROOT` | Private Rust IM Core state directory | `$DSH_HOME/awiki/im-core` or `~/.dsh/awiki/im-core` |
| `DSH_ANP_IDENTITY_STATE_ROOT` | Independent multi-DID ANP Identity Store | `$DSH_HOME/anp-identity` |
| `DSH_ANP_IDENTITY_ROOT_KEY_PROVIDER` | Store Root Key provider (`keyring`, `local-file`, `env`, or programmatic `injected`) | `keyring` |
| `DSH_ANP_IDENTITY_ROOT_KEY_PROVIDER_ID` | Keyring account, environment variable, or injected-provider identifier | `anp-identity/dsh` |
| `DSH_AWIKI_VAULT_ROOT_KEY_FILE` | Existing private file containing a base64/base64url 32-byte Vault root key | `$DSH_HOME/awiki/secret-vault/root-key.b64u` |
| `DSH_AWIKI_VAULT_WORKSPACE_ID` | Stable non-secret Vault workspace context | `dsh-awiki` |
| `DSH_AWIKI_VAULT_DEVICE_ID` | Stable non-secret Vault device context | `local-device` |
| `DSH_AWIKI_POLL_INTERVAL_MS` | Open-dialog polling interval | `5000` |
| `DSH_AWIKI_ATTACHMENT_MAX_BYTES` | Decoded attachment limit | `10485760` |
| `DSH_AWIKI_IMAGE_CACHE_MAX_BYTES` | Private verified image-preview cache budget | `67108864` |
| `DSH_AWIKI_REALTIME_ENABLED` | Enable the identity-level Direct/Group/System Notification WSS | `true` |
| `DSH_AWIKI_LISTENER_ENABLED` | Enable the Direct-to-Agent listener | `false` |
| `DSH_AWIKI_LISTENER_ALLOWED_PEERS` | JSON array of exact Handles or DIDs; required when enabled | `[]` |
| `DSH_AWIKI_LISTENER_WORKSPACE_PATH` | Absolute shared Workspace for AWiki-originated Sessions | `$DSH_HOME/workspaces/awiki` or `~/.dsh/workspaces/awiki` |
| `DSH_AWIKI_SUMMARY_MAX_INPUT_BYTES` | UTF-8 cap after Host-side summary minimization | `32768` |
| `DSH_AWIKI_SUMMARY_TIMEOUT_MS` | One-shot model deadline | `30000` |
| `DSH_AWIKI_SUMMARY_MAX_OUTPUT_TOKENS` | Structured summary output cap | `768` |
## AWiki-hosted DeepSeek account

This capability now requires the separate `@awiki/dsh-model-proxy` package. It
uses `ctx.awiki.externalHttpAuth` to obtain a short-lived
model token inside the Host and reuses the Harness DeepSeek adapter. The Browser receives only
sanitized account, usage, and order state over a loopback RPC channel. DID signatures, bearer
tokens, and upstream platform credentials are absent from the browser bundle.

The former runtime import `@awiki/dsh-plugin/model-proxy` has been removed. Use
`@awiki/dsh-model-proxy`; the shared browser-safe contract intentionally remains
`@awiki/dsh-plugin/model-proxy-contract`. Installing only the main package keeps
model onboarding, account/recharge, and usage entry points hidden while leaving
AWiki Advanced settings functional.

The stable split-package line uses `@awiki/dsh-plugin@0.3.0`; the standalone
`@awiki/dsh-model-proxy@0.1.0` package requires main `^0.3.0`. This lower
bound is the first main package that provides the shared `awikiClient` Browser
bridge, and it also prevents combining the standalone package with a `0.2.x`
main package that still inserted the old runtime by default.

The optional package owns these configuration variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `DSH_AWIKI_MODEL_PROXY_URL` | AWiki-hosted DeepSeek proxy root URL | `https://model.awiki.info` |
| `DSH_AWIKI_MODEL_CONTEXT_WINDOW` | AWiki-hosted DeepSeek context window | `1000000` |
| `DSH_AWIKI_MODEL_MAX_TOKENS` | Maximum AWiki-hosted DeepSeek output | `8192` |
| `DSH_AWIKI_MODEL_TOKEN_REFRESH_SKEW_SECONDS` | Early short-token refresh interval | `60` |

AWiki-hosted DeepSeek is disabled by default. Only an explicit choice in onboarding or Settings → Quick Recharge →
Account & Recharge registers the `awiki-deepseek` route and selects Flash. Disabling restores the
previous provider, model, and reasoning effort. A successful recharge refreshes the balance but
never enables AWiki or changes the selected model automatically.

The settings UI supports both payment redirects and TongQiFu `ALI_QR` content. When payments are
disabled it reports the development restriction without blocking an account whose
`model_access_available` flag is true. Development bypass displays calculated and charged amounts
separately, with zero charged; it does not invent a price when no price table is active.
Public recharge creation also has a client release gate in
`packages/dsh-model-proxy/src/client/recharge-availability.ts`. The current stable line ships that gate open. Order creation still
requires the account response to report `payments_available=true`; otherwise the UI reports that
payments are unavailable and sends no order RPC. The gate remains a single emergency rollback for
the existing payment, polling, and cancellation flows.
Strict billing keeps the internal billing-mode label out of the normal account summary. When the
backend reports `model_access_reason=insufficient_balance`, recharge becomes the primary action and
model enablement is withheld until credit is available. The Host restores the newest pending order
and its payment action whenever the settings page is reopened, polls it without creating duplicates,
and still requires an explicit model opt-in after payment. Recharge amounts are immutable after order
creation. To choose another amount, the user confirms **Cancel and change amount**; the Host first
closes the provider order, then restores the amount editor without creating a replacement. A close
failure leaves the existing payment action available, while a payment that wins the race refreshes
the credited account instead of being reported as cancelled.

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
SecretVault identity, keys, tokens, conversations, attachment index, and cached image previews. **Resume local
identity** removes the marker and reloads that identity without registration. The signed-out screen does not
show a competing recovery path by default; phone recovery appears only after resume fails. **Use another
identity** requires a checked destructive-data confirmation and returns to the unified Handle entry only after
local clearing succeeds, where the same form creates a new identity or recovers an existing one.

The provider domain and message-service DID are protocol identifiers. Do not
infer them from an API hostname. Production service URLs must use HTTPS. The IM Core state directory contains access material;
keep it outside the repository, restrict filesystem access, and protect the
underlying disk and backups.

The Node facade owns `stateRoot/vault/root-key.b64u`; the Host does not provide, copy, or log Vault
key material. Preserve the complete SDK state root across ordinary restarts and upgrades.

The identity-level realtime supervisor is enabled by default and owns the deployment identity's
single Core WebSocket without depending on Workspace or Agent configuration. Direct, Group, and
System Notification events schedule canonical reliable sync; WSS never advances a checkpoint or
authorizes a device by itself. `DSH_AWIKI_REALTIME_ENABLED=false` explicitly falls back to HTTP
refresh. The optional Direct-to-Agent consumer still requires both
`DSH_AWIKI_LISTENER_ENABLED=true` and a non-empty exact allowlist. It reads only committed Direct
text after eligible sync causes and cannot start or stop WSS. One identity-scoped route and message
watermark per Direct conversation preserve the current DSH Session across restarts. Every
AWiki-originated Session is created in and attached to the registered shared AWiki Workspace.
Listener messages are untrusted user data and do not approve tools or bridge approval/user-question
prompts.

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

Requirements: Node.js 22.19+ (or 24+) and pnpm 11.22.

```bash
pnpm install --frozen-lockfile
pnpm run verify:workspace
pnpm pack --dry-run
```

The production Host loads the exact `@awiki/im-core-node@0.2.0` runtime package;
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
