import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AvatarCache } from '../src/client/avatar-cache.ts'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'

const png = new Uint8Array(33)
png.set([137, 80, 78, 71, 13, 10, 26, 10]); png[11] = 13
png.set([73, 72, 68, 82], 12); png[19] = 16; png[23] = 16
const response = () => new Response(png, { headers: { 'content-type': 'image/png', 'cache-control': 'max-age=300' } })
let cache: AvatarCache
beforeEach(() => {
  cache = new AvatarCache()
  vi.stubGlobal('indexedDB', undefined)
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 16, height: 16, close: vi.fn() })))
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0,
    getContext: () => ({ fillRect: vi.fn(), drawImage: vi.fn() }),
    toBlob: (callback: (blob: Blob) => void) => callback(new Blob([png], { type: 'image/jpeg' })) }) })
})
afterEach(() => { cache.reset(); vi.unstubAllGlobals(); vi.restoreAllMocks() })

it('deduplicates thumbnail/main downloads and uses anonymous bounded fetch', async () => {
  let finish!: (value: Response) => void
  const fetch = vi.fn(() => new Promise<Response>(resolve => { finish = resolve }))
  vi.stubGlobal('fetch', fetch)
  const a = cache.load('alice', 'https://example.com/a.png', 128)
  const b = cache.load('alice', 'https://example.com/a.png', 512)
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  finish(response())
  const [small, large] = await Promise.all([a, b])
  expect(small).toMatch(/^blob:/u); expect(large).toMatch(/^blob:/u)
  expect(fetch.mock.calls[0]?.[1]).toMatchObject({ credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer' })
  expect(await cache.load('alice', 'https://example.com/a.png')).toBe(small)
  expect(fetch).toHaveBeenCalledTimes(1)
})

it('never starts more than four downloads and drains the visible queue', async () => {
  const finish: ((value: Response) => void)[] = []
  const fetch = vi.fn(() => new Promise<Response>(resolve => { finish.push(resolve) }))
  vi.stubGlobal('fetch', fetch)
  const pending = Array.from({ length: 6 }, (_, index) => cache.load('alice', `https://example.com/${index}.png`))
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(4))
  finish.splice(0).forEach(resolve => { resolve(response()) })
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(6))
  finish.splice(0).forEach(resolve => { resolve(response()) })
  expect((await Promise.all(pending)).every(Boolean)).toBe(true)
})

it('fences a late old-owner decode and does not suppress the new owner', async () => {
  let finish!: (value: Response) => void
  vi.stubGlobal('fetch', vi.fn().mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve })).mockImplementation(async () => response()))
  const old = cache.load('alice', 'https://example.com/a.png')
  await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
  cache.reset()
  const next = await cache.load('bob', 'https://example.com/a.png')
  finish(response())
  expect(await old).toBeUndefined(); expect(next).toMatch(/^blob:/u)
})

it('backs off failed downloads and rejects oversized images before decode', async () => {
  const fetch = vi.fn(async () => new Response(new Uint8Array(1024 * 1024 + 1), { headers: { 'content-type': 'image/png' } }))
  vi.stubGlobal('fetch', fetch)
  expect(await cache.load('alice', 'https://example.com/a.png')).toBeUndefined()
  expect(await cache.load('alice', 'https://example.com/a.png')).toBeUndefined()
  expect(fetch).toHaveBeenCalledTimes(1); expect(createImageBitmap).not.toHaveBeenCalled()
})

it('evicts decoded buffers at 16 MiB and revokes all remaining URLs on reset', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => response()))
  const revoke = vi.spyOn(URL, 'revokeObjectURL')
  for (let index = 0; index < 18; index++) await cache.load('alice', `https://example.com/${index}.png`, 512)
  expect(revoke).toHaveBeenCalledTimes(2)
  cache.reset(); expect(revoke).toHaveBeenCalledTimes(18)
})

it('upgrades existing bytes, enforces disk headroom and avoids scans on warm reads', async () => {
  const database = new IDBFactory()
  vi.stubGlobal('indexedDB', database)
  const legacy = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = database.open('dsh-awiki-public-avatars-v1', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('avatars', { keyPath: 'key' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  const tx = legacy.transaction('avatars', 'readwrite')
  const blob = new Blob([new Uint8Array(16 * 1024 * 1024)])
  for (let i = 0; i < 4; i++) tx.objectStore('avatars').put({ key: `old-${i}`, owner: 'old', blob, touched: i, expires: 0 })
  await new Promise<void>(resolve => { tx.oncomplete = () => resolve() }); legacy.close()
  const scans = vi.spyOn(IDBObjectStore.prototype, 'getAll')
  const fetch = vi.fn(async () => response()); vi.stubGlobal('fetch', fetch)
  expect(await cache.load('alice', 'https://example.com/a.png')).toMatch(/^blob:/u)
  const count = scans.mock.calls.length
  cache.reset()
  expect(await cache.load('alice', 'https://example.com/a.png')).toMatch(/^blob:/u)
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(scans).toHaveBeenCalledTimes(count)
  const opened = database.open('dsh-awiki-public-avatars-v1', 2)
  const db = await new Promise<IDBDatabase>(resolve => { opened.onsuccess = () => resolve(opened.result) })
  const request = db.transaction('avatars').objectStore('avatars').getAll()
  const rows = await new Promise<Array<{key:string;blob:Blob}>>(resolve => { request.onsuccess = () => resolve(request.result) })
  expect(rows.some(row => row.key === 'old-0')).toBe(false)
  expect(rows.reduce((sum, row) => sum + row.blob.size, 0)).toBeLessThan(64 * 1024 * 1024)
  db.close()
})

it('an aborted optional disk write still returns the decoded avatar', async () => {
  vi.stubGlobal('indexedDB', new IDBFactory())
  vi.stubGlobal('fetch', vi.fn(async () => response()))
  vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementationOnce(function () {
    this.transaction.abort()
    throw new DOMException('full', 'QuotaExceededError')
  })
  expect(await cache.load('alice', 'https://example.com/a.png')).toMatch(/^blob:/u)
})
