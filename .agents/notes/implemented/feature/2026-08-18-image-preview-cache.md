# Persistent image preview cache

- Verified image attachment bytes now persist beneath the configured private Host state root instead of being fetched again after every browser or Harness restart.
- The Host remembers the active owner DID after the normal session bootstrap, so a disk hit bypasses the SDK identity/history queue. A 32 MiB browser-runtime LRU avoids the Host Remote when the same image row remounts, while an identity-scoped, SHA-verified 32 MiB IndexedDB layer also survives a full page refresh without entering the Remote request queue.
- Cache keys bind the active owner DID, containing message ID, and attachment ID. Every hit revalidates canonical Base64, byte length, and SHA-256 before returning bytes to the browser.
- Cache directories and entries use owner-only permissions. Writes are atomic, the default disk budget is 64 MiB, and oldest entries are removed when the budget is exceeded.
- Sent images warm the same cache immediately after the committed message is returned. Non-image attachments remain download-on-demand and are not persisted by this preview cache.
- The existing destructive Clear Local Data operation removes all browser and Host image-cache layers together with SDK-owned identity and message state; ordinary sign-out preserves persistent entries.
- Host integration coverage proves reuse after a full service restart without another provider download. Controller coverage proves browser-storage reuse after a new controller instance without another Host download. Focused cache coverage pins owner isolation, permissions, corruption rejection, and clear behavior.
