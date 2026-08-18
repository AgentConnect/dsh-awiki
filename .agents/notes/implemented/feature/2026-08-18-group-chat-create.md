# Web group creation

## Scope

- Add a user-only “Create group” entry to the AWiki conversation menu.
- Accept one group name and 1–50 initial member Handles or DIDs.
- Keep model tools unchanged; group creation is not exposed as an Agent tool.

## Contract

- The Host creates a private-discovery, open-join, transport-protected group through `@awiki/im-core-node`, then adds requested members one at a time.
- The returned conversation ID is the Rust Core canonical group conversation ID; the UI prepends and opens that conversation immediately.
- A newly created group can briefly precede its readable conversation projection. Group selection keeps intermediate history failures hidden, synchronizes the roster by Group DID, and retries over a bounded five-second readiness window before surfacing the final failure.
- Group creation is atomic only for the group itself. A later member-add failure does not delete or hide the group; the Remote result returns authoritative added members and redacted per-member failures.
- Group names are trimmed and limited to 100 Unicode code points. Member references are trimmed, de-prefixed from a leading `@`, deduplicated, limited to 512 code points each, and capped at 50. The current deployment identity cannot be invited explicitly.
- Core SQLite remains the only persistent group-profile source. The browser controller keeps an identity-scoped last-trustworthy-title projection only: a temporary empty/Group-DID roster title cannot poison it, an explicit non-identifier title replaces it, and logout or local-data clearing drops it.
- Core SQLite also owns persisted peer display profiles. The Host joins those profiles onto Direct roster rows, while the identity-scoped browser projection prevents a later sparse Handle-only poll from replacing an already resolved display name.
- A legacy Core roster row may temporarily carry a Handle in its `peerDid` slot. The Host matches the hydrated profile by the original requested peer reference and replaces that value with the profile's canonical DID before publishing the conversation.
- Background roster polling is best-effort: a transient failure preserves the usable local roster without publishing a global error. Initial open, pagination, and other explicit user operations still surface failures.

## Verification ownership

- Rust Node facade tests own native create/add mapping and structured identity failures.
- Host tests own validation, canonical conversation output, and partial-member failure behavior.
- Controller and overlay tests own menu access, request normalization, immediate conversation selection, and visible partial-failure feedback.
- The controller regression suite covers multiple transient new-group history failures followed by a synchronized empty-history success, plus an exhausted readiness window that exposes only the final failure.
- The controller regression suite also covers sparse polling, manual refresh, an authoritative group rename, and a later sparse page that must retain the renamed title.
- Direct-profile regressions cover Core profile hydration, sparse polling, manual refresh, and a transient offline background roster poll.
- Group history filters provider-only membership/state payloads and hydrates missing sender labels from the Core local display-profile cache, so internal events cannot reject the page and known members do not fall back to raw DIDs.
- Checked-in Typert artifacts own the strict eighteenth Remote method and its wire schemas.
- The real Cordis Loader keyless composition creates a group through the assembled service and fake provider while confirming that the Agent tool surface remains five methods.

## Release boundary

The plugin source consumes the new `@awiki/im-core-node@0.1.4` facade. Publishing the SDK, refreshing the plugin lockfile against that registry artifact, and publishing a new plugin version remain separate release actions.
