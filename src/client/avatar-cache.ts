import { avatarImageDimensions } from './avatar-image.ts'

const DISK_BYTES = 64 * 1024 * 1024
const DECODED_BYTES = 16 * 1024 * 1024
const DOWNLOAD_BYTES = 1024 * 1024
interface StoredAvatar { key: string; owner: string; blob: Blob; expires: number; touched: number; canStore?: boolean; etag?: string }
interface VisibleAvatar { url: string; cost: number; expires: number }

export function safeAvatarUrl(raw: string | null | undefined): string | undefined {
  try {
    const url = new URL(raw ?? '')
    if (url.protocol !== 'https:' || url.username !== '' || url.password !== '' || url.hash !== '' || /\.(svg|html?)$/iu.test(url.pathname)) return undefined
    return url.href
  } catch { return undefined }
}

function result<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(new Error('avatar_cache')) })
}
function done(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = transaction.onabort = () => reject(new Error('avatar_cache')) })
}

/** One browser runtime, separate from authenticated attachment caches. */
export class AvatarCache {
  private readonly memory = new Map<string, VisibleAvatar>()
  private readonly pending = new Map<string, Promise<string | undefined>>()
  private readonly bytesPending = new Map<string, Promise<StoredAvatar>>()
  private readonly retryAt = new Map<string, number>()
  private readonly active = new Set<AbortController>()
  private readonly waiting: (() => void)[] = []
  private running = 0
  private generation = 0
  private databasePromise: Promise<IDBDatabase | undefined> | undefined

  private database(): Promise<IDBDatabase | undefined> {
    return this.databasePromise ??= new Promise(resolve => {
      if (globalThis.indexedDB === undefined) { resolve(undefined); return }
      const request = indexedDB.open('dsh-awiki-public-avatars-v1', 1)
      request.onupgradeneeded = () => request.result.createObjectStore('avatars', { keyPath: 'key' })
      request.onsuccess = () => { request.result.onversionchange = () => request.result.close(); resolve(request.result) }
      request.onerror = request.onblocked = () => resolve(undefined)
    })
  }
  private async read(key: string): Promise<StoredAvatar | undefined> {
    try {
      const db = await this.database(); if (db === undefined) return undefined
      const tx = db.transaction('avatars', 'readonly'); const completion = done(tx)
      const value = await result<StoredAvatar | undefined>(tx.objectStore('avatars').get(key)); await completion
      return value?.key === key && value.blob instanceof Blob && value.blob.size <= DOWNLOAD_BYTES ? value : undefined
    } catch { return undefined }
  }
  private async write(record: StoredAvatar, generation: number): Promise<void> {
    try {
      const db = await this.database(); if (db === undefined || generation !== this.generation) return
      // Read/write and prune in one serialized transaction across windows.
      const tx = db.transaction('avatars', 'readwrite'); const completion = done(tx); const store = tx.objectStore('avatars')
      store.put(record)
      const rows = await result<StoredAvatar[]>(store.getAll())
      let bytes = rows.reduce((sum, row) => sum + row.blob.size, 0)
      rows.sort((a, b) => a.touched - b.touched)
      let entries = rows.length
      for (const row of rows) {
        if (bytes <= DISK_BYTES && entries <= 4096) break
        store.delete(row.key); bytes -= row.blob.size; entries--
      }
      await completion
    } catch { /* Optional acceleration; never fail the visible image. */ }
  }

  async load(owner: string, raw: string, edge = 128): Promise<string | undefined> {
    const uri = safeAvatarUrl(raw)
    if (uri === undefined) return undefined
    edge = edge <= 128 ? 128 : 512
    const key = JSON.stringify([owner, uri, edge])
    const cached = this.memory.get(key)
    if (cached !== undefined && cached.expires > Date.now()) {
      this.memory.delete(key); this.memory.set(key, cached); return cached.url
    }
    if ((this.retryAt.get(key) ?? 0) > Date.now()) return undefined
    const existing = this.pending.get(key)
    if (existing !== undefined) return existing
    const generation = this.generation
    const load = this.loadImage(owner, uri, edge, key, generation).finally(() => { if (this.pending.get(key) === load) this.pending.delete(key) })
    this.pending.set(key, load); return load
  }
  private async loadImage(owner: string, uri: string, edge: number, key: string, generation: number): Promise<string | undefined> {
    if (this.running >= 4) await new Promise<void>(resolve => { this.waiting.push(resolve) })
    else this.running++
    try {
      if (generation !== this.generation) return undefined
      const byteKey = JSON.stringify([owner, uri])
      let stored = await this.read(byteKey)
      if (generation !== this.generation) return undefined
      if (stored === undefined || stored.expires <= Date.now()) {
        let download = this.bytesPending.get(byteKey)
        if (download === undefined) {
          download = this.download(owner, uri, byteKey, stored).finally(() => { if (this.bytesPending.get(byteKey) === download) this.bytesPending.delete(byteKey) })
          this.bytesPending.set(byteKey, download)
        }
        stored = await download
      }
      if (generation !== this.generation) return undefined
      const bytes = new Uint8Array(await stored.blob.arrayBuffer())
      const info = avatarImageDimensions(bytes, false)
      const bitmap = await createImageBitmap(stored.blob, { imageOrientation: 'from-image', colorSpaceConversion: 'default' })
      const canvas = document.createElement('canvas'); canvas.width = edge; canvas.height = edge
      let blob: Blob | null
      try {
        const context = canvas.getContext('2d', { alpha: false, colorSpace: 'srgb' }); if (context === null) throw new Error('avatar_decode')
        context.fillStyle = '#fff'; context.fillRect(0, 0, edge, edge)
        const cropEdge = Math.min(bitmap.width, bitmap.height)
        context.drawImage(bitmap, (bitmap.width - cropEdge) / 2, (bitmap.height - cropEdge) / 2, cropEdge, cropEdge, 0, 0, edge, edge)
        blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9))
      } finally { bitmap.close(); canvas.width = 0; canvas.height = 0 }
      if (blob === null || generation !== this.generation || info.width < 1) return undefined
      const url = URL.createObjectURL(blob)
      const old = this.memory.get(key); if (old !== undefined) URL.revokeObjectURL(old.url)
      this.memory.delete(key); this.memory.set(key, { url, cost: edge * edge * 4, expires: stored.expires })
      let bytesInMemory = [...this.memory.values()].reduce((sum, item) => sum + item.cost, 0)
      for (const [oldKey, value] of this.memory) {
        if (bytesInMemory <= DECODED_BYTES) break
        this.memory.delete(oldKey); URL.revokeObjectURL(value.url); bytesInMemory -= value.cost
      }
      if (stored.canStore !== false) void this.write({ ...stored, touched: Date.now() }, generation)
      else void this.delete(byteKey, generation)
      return url
    } catch {
      if (generation !== this.generation) return undefined
      this.retryAt.set(key, Date.now() + 30_000)
      if (this.retryAt.size > 512) this.retryAt.delete(this.retryAt.keys().next().value!)
      return undefined
    } finally {
      const next = this.waiting.shift(); if (next !== undefined) next(); else this.running--
    }
  }

  private async delete(key: string, generation: number): Promise<void> {
    try {
      const db = await this.database(); if (db === undefined || generation !== this.generation) return
      const tx = db.transaction('avatars', 'readwrite'); const completion = done(tx)
      tx.objectStore('avatars').delete(key); await completion
    } catch { /* Optional cache. */ }
  }

  private async download(owner: string, uri: string, key: string, previous?: StoredAvatar): Promise<StoredAvatar> {
    const abort = new AbortController(); this.active.add(abort)
    const timeout = setTimeout(() => { abort.abort() }, 20_000)
    try {
      const response = await fetch(uri, { credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', signal: abort.signal,
        headers: previous?.etag === undefined ? { Accept: 'image/jpeg,image/png,image/webp' } : { Accept: 'image/jpeg,image/png,image/webp', 'If-None-Match': previous.etag } })
      const policy = response.headers.get('cache-control')?.toLowerCase() ?? ''
      const age = Number(response.headers.get('age') ?? '0')
      const maxAge = Number(/(?:^|[,\s])max-age=(\d+)/u.exec(policy)?.[1] ?? '300')
      const lifetime = /no-store|no-cache/u.test(policy) ? 0 : Math.max(0, Math.min(604800, maxAge - (Number.isFinite(age) ? age : 0))) * 1000
      const etag = response.headers.get('etag') ?? previous?.etag
      const metadata = { key, owner, canStore: !policy.includes('no-store'), expires: Date.now() + lifetime, touched: Date.now(), ...etag === undefined || etag.length > 512 ? {} : { etag } }
      if (response.status === 304 && previous !== undefined) return { ...metadata, blob: previous.blob }
      if (!response.ok || Number(response.headers.get('content-length') ?? '0') > DOWNLOAD_BYTES || !['image/jpeg', 'image/png', 'image/webp'].includes(response.headers.get('content-type')?.split(';')[0] ?? '')) throw new Error('avatar_response')
      const reader = response.body?.getReader(); if (reader === undefined) throw new Error('avatar_response')
      const chunks: Uint8Array<ArrayBuffer>[] = []; let total = 0
      try {
        for (;;) {
          const { value, done } = await reader.read(); if (done) break
          total += value.length; if (total > DOWNLOAD_BYTES) throw new Error('avatar_limit')
          chunks.push(new Uint8Array(value))
        }
      } finally { await reader.cancel().catch(() => undefined); reader.releaseLock() }
      return { ...metadata, blob: new Blob(chunks, { type: response.headers.get('content-type')! }) }
    } finally { clearTimeout(timeout); this.active.delete(abort) }
  }

  reset(): void {
    this.generation++
    for (const abort of this.active) abort.abort()
    for (const value of this.memory.values()) URL.revokeObjectURL(value.url)
    this.memory.clear(); this.retryAt.clear(); this.pending.clear(); this.bytesPending.clear()
  }
  async clear(owner?: string): Promise<void> {
    this.reset()
    try {
      const db = await this.database(); if (db === undefined) return
      const tx = db.transaction('avatars', 'readwrite'); const completion = done(tx); const store = tx.objectStore('avatars')
      if (owner === undefined) store.clear()
      else {
        const rows = await result<StoredAvatar[]>(store.getAll())
        for (const row of rows) if (row.owner === owner) store.delete(row.key)
      }
      await completion
    } catch { /* A disabled browser store must not block sign-out. */ }
  }
}
export const avatarCache = new AvatarCache()
