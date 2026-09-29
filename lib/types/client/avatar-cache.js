import { avatarImageDimensions } from "./avatar-image.js";
const DISK_BYTES = 64 * 1024 * 1024;
const DECODED_BYTES = 16 * 1024 * 1024;
const DOWNLOAD_BYTES = 1024 * 1024;
const WRITE_WINDOW = 4 * 1024 * 1024;
export function safeAvatarUrl(raw) {
    try {
        const url = new URL(raw ?? '');
        if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || url.hash !== '' || /\.(svg|html?)$/iu.test(url.pathname))
            return undefined;
        return url.href;
    }
    catch {
        return undefined;
    }
}
function result(request) {
    return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(new Error('avatar_cache')); });
}
function done(transaction) {
    const completion = new Promise((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = transaction.onabort = () => reject(new Error('avatar_cache')); });
    // A request can fail before its caller reaches `await completion`.
    void completion.catch(() => { });
    return completion;
}
/** One browser runtime, separate from authenticated attachment caches. */
export class AvatarCache {
    memory = new Map();
    pending = new Map();
    bytesPending = new Map();
    retryAt = new Map();
    active = new Set();
    waiting = [];
    running = 0;
    generation = 0;
    databasePromise;
    database() {
        return this.databasePromise ??= new Promise(resolve => {
            if (globalThis.indexedDB === undefined) {
                resolve(undefined);
                return;
            }
            const request = indexedDB.open('dsh-awiki-public-avatars-v1', 2);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains('avatars'))
                    request.result.createObjectStore('avatars', { keyPath: 'key' });
                request.result.createObjectStore('write-budget');
            };
            request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result); };
            request.onerror = request.onblocked = () => resolve(undefined);
        });
    }
    async read(key) {
        try {
            const db = await this.database();
            if (db === undefined)
                return undefined;
            const tx = db.transaction('avatars', 'readonly');
            const completion = done(tx);
            const value = await result(tx.objectStore('avatars').get(key));
            await completion;
            return value?.key === key && value.blob instanceof Blob && value.blob.size <= DOWNLOAD_BYTES ? value : undefined;
        }
        catch {
            return undefined;
        }
    }
    async write(record, generation, downloaded) {
        try {
            const db = await this.database();
            if (db === undefined || generation !== this.generation)
                return;
            // Read/write and prune in one serialized transaction across windows.
            const tx = db.transaction(['avatars', 'write-budget'], 'readwrite');
            const completion = done(tx);
            const store = tx.objectStore('avatars');
            const budgetStore = tx.objectStore('write-budget');
            const budget = await result(budgetStore.get('window'));
            store.put(record);
            // Small persisted headroom counters serialize across browser windows. A
            // disk hit only touches its record; scans are amortized over cold writes.
            const cost = (row) => row.blob.size + new TextEncoder().encode(JSON.stringify({ ...row, blob: undefined })).length;
            const next = { bytes: (budget?.bytes ?? WRITE_WINDOW) + (downloaded ? cost(record) : 0),
                entries: (budget?.entries ?? 64) + (downloaded ? 1 : 0) };
            if (next.bytes > WRITE_WINDOW || next.entries >= 64) {
                const rows = await result(store.getAll());
                let bytes = rows.reduce((sum, row) => sum + cost(row), 0);
                rows.sort((a, b) => a.touched - b.touched);
                let entries = rows.length;
                for (const row of rows) {
                    if (bytes <= DISK_BYTES - WRITE_WINDOW && entries <= 4096 - 64)
                        break;
                    store.delete(row.key);
                    bytes -= cost(row);
                    entries--;
                }
                next.bytes = 0;
                next.entries = 0;
            }
            budgetStore.put(next, 'window');
            await completion;
        }
        catch { /* Optional acceleration; never fail the visible image. */ }
    }
    async load(owner, raw, edge = 128, force = false) {
        const uri = safeAvatarUrl(raw);
        if (uri === undefined)
            return undefined;
        edge = edge <= 128 ? 128 : 512;
        const key = JSON.stringify([owner, uri, edge]);
        const cached = this.memory.get(key);
        if (cached !== undefined && cached.expires > Date.now()) {
            this.memory.delete(key);
            this.memory.set(key, cached);
            return cached.url;
        }
        if (!force && (this.retryAt.get(key) ?? 0) > Date.now())
            return undefined;
        const existing = this.pending.get(key);
        if (existing !== undefined)
            return existing;
        const generation = this.generation;
        const load = this.loadImage(owner, uri, edge, key, generation).finally(() => { if (this.pending.get(key) === load)
            this.pending.delete(key); });
        this.pending.set(key, load);
        return load;
    }
    async loadImage(owner, uri, edge, key, generation) {
        if (this.running >= 4)
            await new Promise(resolve => { this.waiting.push(resolve); });
        else
            this.running++;
        try {
            if (generation !== this.generation)
                return undefined;
            const byteKey = JSON.stringify([owner, uri]);
            let stored = await this.read(byteKey);
            let downloaded = false;
            if (generation !== this.generation)
                return undefined;
            if (stored === undefined || stored.expires <= Date.now()) {
                downloaded = true;
                let download = this.bytesPending.get(byteKey);
                if (download === undefined) {
                    download = this.download(owner, uri, byteKey, stored).finally(() => { if (this.bytesPending.get(byteKey) === download)
                        this.bytesPending.delete(byteKey); });
                    this.bytesPending.set(byteKey, download);
                }
                stored = await download;
            }
            if (generation !== this.generation)
                return undefined;
            const bytes = new Uint8Array(await stored.blob.arrayBuffer());
            const info = avatarImageDimensions(bytes, false);
            const bitmap = await createImageBitmap(stored.blob, { imageOrientation: 'from-image', colorSpaceConversion: 'default' });
            const canvas = document.createElement('canvas');
            canvas.width = edge;
            canvas.height = edge;
            let blob;
            try {
                const context = canvas.getContext('2d', { alpha: false, colorSpace: 'srgb' });
                if (context === null)
                    throw new Error('avatar_decode');
                context.fillStyle = '#fff';
                context.fillRect(0, 0, edge, edge);
                const cropEdge = Math.min(bitmap.width, bitmap.height);
                context.drawImage(bitmap, (bitmap.width - cropEdge) / 2, (bitmap.height - cropEdge) / 2, cropEdge, cropEdge, 0, 0, edge, edge);
                blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
            }
            finally {
                bitmap.close();
                canvas.width = 0;
                canvas.height = 0;
            }
            if (blob === null || generation !== this.generation || info.width < 1)
                return undefined;
            const url = URL.createObjectURL(blob);
            const old = this.memory.get(key);
            if (old !== undefined)
                URL.revokeObjectURL(old.url);
            this.memory.delete(key);
            this.memory.set(key, { url, cost: edge * edge * 4, expires: stored.expires });
            let bytesInMemory = [...this.memory.values()].reduce((sum, item) => sum + item.cost, 0);
            for (const [oldKey, value] of this.memory) {
                if (bytesInMemory <= DECODED_BYTES)
                    break;
                this.memory.delete(oldKey);
                URL.revokeObjectURL(value.url);
                bytesInMemory -= value.cost;
            }
            // Retain the four-slot bound until the optional write completes, so slow
            // IndexedDB cannot accumulate unlimited pending Blob references.
            if (stored.canStore !== false)
                await this.write({ ...stored, touched: Date.now() }, generation, downloaded);
            else
                await this.delete(byteKey, generation);
            if (generation !== this.generation)
                return undefined;
            return url;
        }
        catch {
            if (generation !== this.generation)
                return undefined;
            this.retryAt.set(key, Date.now() + 30_000);
            if (this.retryAt.size > 512)
                this.retryAt.delete(this.retryAt.keys().next().value);
            return undefined;
        }
        finally {
            const next = this.waiting.shift();
            if (next !== undefined)
                next();
            else
                this.running--;
        }
    }
    async delete(key, generation) {
        try {
            const db = await this.database();
            if (db === undefined || generation !== this.generation)
                return;
            const tx = db.transaction('avatars', 'readwrite');
            const completion = done(tx);
            tx.objectStore('avatars').delete(key);
            await completion;
        }
        catch { /* Optional cache. */ }
    }
    async download(owner, uri, key, previous) {
        const abort = new AbortController();
        this.active.add(abort);
        const timeout = setTimeout(() => { abort.abort(); }, 20_000);
        try {
            const response = await fetch(uri, { credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', signal: abort.signal,
                headers: previous?.etag === undefined ? { Accept: 'image/jpeg,image/png,image/webp' } : { Accept: 'image/jpeg,image/png,image/webp', 'If-None-Match': previous.etag } });
            const policy = response.headers.get('cache-control')?.toLowerCase() ?? '';
            const age = Number(response.headers.get('age') ?? '0');
            const maxAge = Number(/(?:^|[,\s])max-age=(\d+)/u.exec(policy)?.[1] ?? '300');
            const lifetime = /no-store|no-cache/u.test(policy) ? 0 : Math.max(0, Math.min(604800, maxAge - (Number.isFinite(age) ? age : 0))) * 1000;
            const etag = response.headers.get('etag') ?? previous?.etag;
            const metadata = { key, owner, canStore: !policy.includes('no-store'), expires: Date.now() + lifetime, touched: Date.now(), ...etag === undefined || etag.length > 512 ? {} : { etag } };
            if (response.status === 304 && previous !== undefined)
                return { ...metadata, blob: previous.blob };
            if (!response.ok || Number(response.headers.get('content-length') ?? '0') > DOWNLOAD_BYTES || !['image/jpeg', 'image/png', 'image/webp'].includes(response.headers.get('content-type')?.split(';')[0] ?? ''))
                throw new Error('avatar_response');
            const reader = response.body?.getReader();
            if (reader === undefined)
                throw new Error('avatar_response');
            const chunks = [];
            let total = 0;
            try {
                for (;;) {
                    const { value, done } = await reader.read();
                    if (done)
                        break;
                    total += value.length;
                    if (total > DOWNLOAD_BYTES)
                        throw new Error('avatar_limit');
                    chunks.push(new Uint8Array(value));
                }
            }
            finally {
                await reader.cancel().catch(() => undefined);
                reader.releaseLock();
            }
            return { ...metadata, blob: new Blob(chunks, { type: response.headers.get('content-type') }) };
        }
        finally {
            clearTimeout(timeout);
            this.active.delete(abort);
        }
    }
    reset() {
        this.generation++;
        for (const abort of this.active)
            abort.abort();
        for (const value of this.memory.values())
            URL.revokeObjectURL(value.url);
        this.memory.clear();
        this.retryAt.clear();
        this.pending.clear();
        this.bytesPending.clear();
    }
    async clear(owner) {
        this.reset();
        try {
            const db = await this.database();
            if (db === undefined)
                return;
            const tx = db.transaction('avatars', 'readwrite');
            const completion = done(tx);
            const store = tx.objectStore('avatars');
            if (owner === undefined)
                store.clear();
            else {
                const rows = await result(store.getAll());
                for (const row of rows)
                    if (row.owner === owner)
                        store.delete(row.key);
            }
            await completion;
        }
        catch { /* A disabled browser store must not block sign-out. */ }
    }
}
export const avatarCache = new AvatarCache();
//# sourceMappingURL=avatar-cache.js.map