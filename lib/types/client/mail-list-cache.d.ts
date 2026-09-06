/** Bounded browser cache for mailbox summaries. Message bodies are never persisted here. */
import type { AwikiDid, AwikiMailInboxPage } from '@awiki/dsh-plugin/types';
export type CachedMailFolder = 'inbox' | 'sent';
export declare const MAIL_LIST_CACHE_MAX_AGE_MS: number;
/** Stable owner known before Mail Account loads, preventing cache data from crossing identities. */
export declare function mailListCacheOwner(ownerDid: AwikiDid): string | undefined;
/** Read one fresh, owner-bound cache entry. Invalid or expired data is discarded. */
export declare function readMailListCache(storage: Storage, ownerDid: AwikiDid, folder: CachedMailFolder, now?: number): AwikiMailInboxPage | undefined;
/** Persist one bounded list projection. Failures never block live mailbox behavior. */
export declare function writeMailListCache(storage: Storage, ownerDid: AwikiDid, folder: CachedMailFolder, page: AwikiMailInboxPage, now?: number): void;
/** Restore the last folder selected for one AWiki identity. */
export declare function readMailFolderCache(storage: Storage, ownerDid: AwikiDid): CachedMailFolder;
/** Remember the current folder without storing any message content. */
export declare function writeMailFolderCache(storage: Storage, ownerDid: AwikiDid, folder: CachedMailFolder): void;
/** Remove only AWiki Mail list/folder projections for this Browser installation. */
export declare function clearMailBrowserCache(storage: Storage): void;
//# sourceMappingURL=mail-list-cache.d.ts.map