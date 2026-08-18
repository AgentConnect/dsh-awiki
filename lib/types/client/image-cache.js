/** Browser-origin persistent cache for verified AWiki image previews. */
const DATABASE_NAME = 'dsh-awiki-image-previews-v1';
const DATABASE_VERSION = 1;
const STORE_NAME = 'images';
const MAX_BYTES = 32 * 1024 * 1024;
const MAX_ENTRIES = 64;
/** IndexedDB-backed cache that fails closed when browser storage is unavailable. */
export class IndexedDbAwikiBrowserImageCache {
    databasePromise;
    async read(ownerDid, messageId, attachmentId) {
        const database = await this.database();
        if (database === null)
            return undefined;
        const key = cacheKey(ownerDid, messageId, attachmentId);
        try {
            const transaction = database.transaction(STORE_NAME, 'readonly');
            const record = await requestResult(transaction.objectStore(STORE_NAME).get(key));
            await transactionDone(transaction);
            if (record === undefined)
                return undefined;
            const verified = await verifiedValue(record, ownerDid, messageId, attachmentId);
            if (verified === undefined) {
                await this.delete(database, key);
                return undefined;
            }
            void this.touch(database, record).catch(() => undefined);
            return verified;
        }
        catch {
            return undefined;
        }
    }
    async write(ownerDid, messageId, value) {
        if (!value.attachment.mimeType.startsWith('image/') || value.attachment.size > MAX_BYTES)
            return;
        const record = {
            key: cacheKey(ownerDid, messageId, value.attachment.id),
            ownerDid,
            messageId,
            attachmentId: value.attachment.id,
            value: Object.freeze({
                attachment: Object.freeze({ ...value.attachment }),
                bytesBase64: value.bytesBase64,
            }),
            lastAccessedAt: Date.now(),
        };
        if (await verifiedValue(record, ownerDid, messageId, value.attachment.id) === undefined)
            return;
        const database = await this.database();
        if (database === null)
            return;
        try {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            transaction.objectStore(STORE_NAME).put(record);
            await transactionDone(transaction);
            await this.prune(database);
        }
        catch {
            // Browser storage is an optional acceleration layer; Host remains authoritative.
        }
    }
    async clear() {
        const database = await this.database();
        if (database === null)
            return;
        try {
            const transaction = database.transaction(STORE_NAME, 'readwrite');
            transaction.objectStore(STORE_NAME).clear();
            await transactionDone(transaction);
        }
        catch {
            // Clearing unavailable browser storage must not block Host-owned data deletion.
        }
    }
    database() {
        if (this.databasePromise !== undefined)
            return this.databasePromise;
        this.databasePromise = new Promise((resolve) => {
            if (globalThis.indexedDB === undefined) {
                resolve(null);
                return;
            }
            try {
                const request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
                request.onupgradeneeded = () => {
                    const database = request.result;
                    if (!database.objectStoreNames.contains(STORE_NAME)) {
                        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(null);
                request.onblocked = () => resolve(null);
            }
            catch {
                resolve(null);
            }
        });
        return this.databasePromise;
    }
    async delete(database, key) {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).delete(key);
        await transactionDone(transaction);
    }
    async touch(database, record) {
        const transaction = database.transaction(STORE_NAME, 'readwrite');
        transaction.objectStore(STORE_NAME).put({ ...record, lastAccessedAt: Date.now() });
        await transactionDone(transaction);
    }
    async prune(database) {
        const transaction = database.transaction(STORE_NAME, 'readonly');
        const records = await requestResult(transaction.objectStore(STORE_NAME).getAll());
        await transactionDone(transaction);
        let totalBytes = records.reduce((total, record) => total + record.value.attachment.size, 0);
        let totalEntries = records.length;
        if (totalBytes <= MAX_BYTES && totalEntries <= MAX_ENTRIES)
            return;
        const oldestFirst = [...records].sort((left, right) => left.lastAccessedAt - right.lastAccessedAt);
        const write = database.transaction(STORE_NAME, 'readwrite');
        const store = write.objectStore(STORE_NAME);
        for (const record of oldestFirst) {
            if (totalBytes <= MAX_BYTES && totalEntries <= MAX_ENTRIES)
                break;
            store.delete(record.key);
            totalBytes -= record.value.attachment.size;
            totalEntries -= 1;
        }
        await transactionDone(write);
    }
}
async function verifiedValue(record, ownerDid, messageId, attachmentId) {
    if (record.ownerDid !== ownerDid || record.messageId !== messageId || record.attachmentId !== attachmentId)
        return undefined;
    const { attachment, bytesBase64 } = record.value;
    if (attachment.id !== attachmentId || !attachment.mimeType.startsWith('image/'))
        return undefined;
    let decoded;
    try {
        decoded = globalThis.atob(bytesBase64);
        if (globalThis.btoa(decoded) !== bytesBase64)
            return undefined;
    }
    catch {
        return undefined;
    }
    if (decoded.length !== attachment.size || !/^[a-f0-9]{64}$/u.test(attachment.sha256))
        return undefined;
    if (globalThis.crypto?.subtle === undefined)
        return undefined;
    const bytes = Uint8Array.from(decoded, character => character.charCodeAt(0));
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    const sha256 = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
    if (sha256 !== attachment.sha256)
        return undefined;
    return Object.freeze({
        attachment: Object.freeze({ ...attachment }),
        bytesBase64,
    });
}
function cacheKey(ownerDid, messageId, attachmentId) {
    return `${String(ownerDid)}\u0000${String(messageId)}\u0000${String(attachmentId)}`;
}
function requestResult(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
    });
}
function transactionDone(transaction) {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
        transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    });
}
//# sourceMappingURL=image-cache.js.map