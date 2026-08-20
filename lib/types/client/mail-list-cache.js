/** Bounded browser cache for mailbox summaries. Message bodies are never persisted here. */
const CACHE_VERSION = 2;
const CACHE_PREFIX = 'awiki:mail-list:v2:';
const FOLDER_PREFIX = 'awiki:mail-folder:v1:';
const MAX_ITEMS = 200;
const MAX_CACHE_CHARACTERS = 768 * 1024;
const MAX_PARTICIPANTS = 20;
const MAX_ADDRESS_CHARACTERS = 320;
const MAX_SUBJECT_CHARACTERS = 4_096;
const MAX_PREVIEW_CHARACTERS = 16_384;
const MAX_TOKEN_CHARACTERS = 2_048;
const CLOCK_SKEW_MS = 5 * 60 * 1_000;
export const MAIL_LIST_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1_000;
function validString(value, maxCharacters, allowEmpty = true) {
    return typeof value === 'string'
        && (allowEmpty || value.length > 0)
        && Array.from(value).length <= maxCharacters
        && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(value);
}
function stringArray(value) {
    if (!Array.isArray(value) || value.length > MAX_PARTICIPANTS)
        return undefined;
    const items = [];
    for (const item of value) {
        if (!validString(item, MAX_ADDRESS_CHARACTERS, false))
            return undefined;
        items.push(item);
    }
    return items;
}
function optionalString(value, maxCharacters) {
    if (value === undefined)
        return undefined;
    return validString(value, maxCharacters) ? value : false;
}
function decodeSummary(input, folder) {
    if (typeof input !== 'object' || input === null || Array.isArray(input))
        return undefined;
    const value = input;
    const from = stringArray(value.from);
    const to = stringArray(value.to);
    const cc = stringArray(value.cc);
    const storedFolder = optionalString(value.folder, 32);
    const preview = optionalString(value.preview, MAX_PREVIEW_CHARACTERS);
    const receivedAt = optionalString(value.receivedAt, 128);
    const sentAt = optionalString(value.sentAt, 128);
    const attachmentCount = value.attachmentCount;
    if (!validString(value.id, MAX_TOKEN_CHARACTERS, false)
        || from === undefined
        || to === undefined
        || cc === undefined
        || !validString(value.subject, MAX_SUBJECT_CHARACTERS)
        || typeof value.subjectTruncated !== 'boolean'
        || storedFolder === false
        || (storedFolder !== undefined && storedFolder !== folder)
        || preview === false
        || receivedAt === false
        || sentAt === false
        || typeof value.previewTruncated !== 'boolean'
        || typeof value.unread !== 'boolean'
        || typeof value.hasAttachments !== 'boolean'
        || (attachmentCount !== undefined
            && (!Number.isSafeInteger(attachmentCount) || attachmentCount < 0)))
        return undefined;
    return {
        id: value.id,
        ...(storedFolder === undefined ? {} : { folder: storedFolder }),
        from,
        to,
        cc,
        subject: value.subject,
        subjectTruncated: value.subjectTruncated,
        ...(preview === undefined ? {} : { preview }),
        previewTruncated: value.previewTruncated,
        ...(receivedAt === undefined ? {} : { receivedAt }),
        ...(sentAt === undefined ? {} : { sentAt }),
        unread: value.unread,
        hasAttachments: value.hasAttachments,
        ...(attachmentCount === undefined ? {} : { attachmentCount: attachmentCount }),
    };
}
/** Stable owner known before Mail Account loads, preventing cache data from crossing identities. */
export function mailListCacheOwner(ownerDid) {
    const owner = String(ownerDid);
    return owner.length > 0
        && Array.from(owner).length <= MAX_TOKEN_CHARACTERS
        && !/[\s\u0000-\u001f\u007f-\u009f]/u.test(owner)
        ? owner
        : undefined;
}
function storageKey(owner, folder) {
    return `${CACHE_PREFIX}${encodeURIComponent(owner)}:${folder}`;
}
function remove(storage, key) {
    try {
        storage.removeItem(key);
    }
    catch {
        // Storage can be unavailable in privacy-restricted or quota-constrained contexts.
    }
}
/** Read one fresh, owner-bound cache entry. Invalid or expired data is discarded. */
export function readMailListCache(storage, ownerDid, folder, now = Date.now()) {
    const owner = mailListCacheOwner(ownerDid);
    if (owner === undefined)
        return undefined;
    const key = storageKey(owner, folder);
    let raw;
    try {
        raw = storage.getItem(key);
    }
    catch {
        return undefined;
    }
    if (raw === null)
        return undefined;
    if (raw.length > MAX_CACHE_CHARACTERS) {
        remove(storage, key);
        return undefined;
    }
    let parsed;
    try {
        parsed = JSON.parse(raw);
    }
    catch {
        remove(storage, key);
        return undefined;
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        remove(storage, key);
        return undefined;
    }
    const value = parsed;
    if (value.version !== CACHE_VERSION
        || value.owner !== owner
        || value.folder !== folder
        || !Number.isSafeInteger(value.savedAt)
        || value.savedAt < 0
        || value.savedAt > now + CLOCK_SKEW_MS
        || now - value.savedAt > MAIL_LIST_CACHE_MAX_AGE_MS
        || !Array.isArray(value.items)
        || value.items.length > MAX_ITEMS
        || typeof value.hasMore !== 'boolean'
        || (value.nextOffset !== undefined
            && (!Number.isSafeInteger(value.nextOffset) || value.nextOffset < 0))) {
        remove(storage, key);
        return undefined;
    }
    const items = [];
    for (const item of value.items) {
        const decoded = decodeSummary(item, folder);
        if (decoded === undefined) {
            remove(storage, key);
            return undefined;
        }
        items.push(decoded);
    }
    return {
        items,
        ...(value.nextOffset === undefined ? {} : { nextOffset: value.nextOffset }),
        hasMore: value.hasMore,
    };
}
/** Persist one bounded list projection. Failures never block live mailbox behavior. */
export function writeMailListCache(storage, ownerDid, folder, page, now = Date.now()) {
    const owner = mailListCacheOwner(ownerDid);
    if (owner === undefined || page.items.length > MAX_ITEMS)
        return;
    const stored = {
        version: CACHE_VERSION,
        owner,
        folder,
        savedAt: now,
        items: page.items,
        ...(page.nextOffset === undefined ? {} : { nextOffset: page.nextOffset }),
        hasMore: page.hasMore,
    };
    const raw = JSON.stringify(stored);
    if (raw.length > MAX_CACHE_CHARACTERS)
        return;
    try {
        storage.setItem(storageKey(owner, folder), raw);
    }
    catch {
        // Caching is opportunistic; live mailbox requests remain authoritative.
    }
}
/** Restore the last folder selected for one AWiki identity. */
export function readMailFolderCache(storage, ownerDid) {
    const owner = mailListCacheOwner(ownerDid);
    if (owner === undefined)
        return 'inbox';
    try {
        return storage.getItem(`${FOLDER_PREFIX}${encodeURIComponent(owner)}`) === 'sent' ? 'sent' : 'inbox';
    }
    catch {
        return 'inbox';
    }
}
/** Remember the current folder without storing any message content. */
export function writeMailFolderCache(storage, ownerDid, folder) {
    const owner = mailListCacheOwner(ownerDid);
    if (owner === undefined)
        return;
    try {
        storage.setItem(`${FOLDER_PREFIX}${encodeURIComponent(owner)}`, folder);
    }
    catch {
        // Folder restoration is optional and must never block mailbox navigation.
    }
}
//# sourceMappingURL=mail-list-cache.js.map