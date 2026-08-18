import { afterEach, describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { lstat, mkdtemp, readdir, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { AwikiImageAttachmentCache } from '../src/attachment-cache.ts'
import type { AwikiAttachment, AwikiAttachmentId, AwikiDid, AwikiMessageId } from '../src/types.ts'

let stateRoot: string | undefined

afterEach(async () => {
  if (stateRoot !== undefined) await rm(stateRoot, { recursive: true, force: true })
  stateRoot = undefined
})

describe('AwikiImageAttachmentCache', () => {
  it('persists owner-bound verified images privately and removes corrupt or cleared state', async () => {
    stateRoot = await mkdtemp(join(tmpdir(), 'dsh-awiki-image-cache-'))
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4])
    const attachment: AwikiAttachment = {
      id: 'image-1' as AwikiAttachmentId,
      fileName: 'preview.png',
      mimeType: 'image/png',
      size: bytes.byteLength,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    }
    const ownerDid = 'did:awiki:alice' as AwikiDid
    const request = { messageId: 'message-image' as AwikiMessageId, attachmentId: attachment.id }
    const cache = new AwikiImageAttachmentCache(stateRoot, 1_024, 4_096)

    await cache.write(ownerDid, request.messageId, { attachment, bytes })
    await expect(new AwikiImageAttachmentCache(stateRoot, 1_024, 4_096).read(ownerDid, request))
      .resolves.toEqual({ attachment, bytes })
    await expect(cache.read('did:awiki:other' as AwikiDid, request)).resolves.toBeUndefined()

    const directory = join(stateRoot, '.host', 'image-attachments-v1')
    expect((await lstat(directory)).mode & 0o777).toBe(0o700)
    const [fileName] = await readdir(directory)
    if (fileName === undefined) throw new Error('expected one image cache file')
    const path = join(directory, fileName)
    expect((await lstat(path)).mode & 0o777).toBe(0o600)

    await writeFile(path, '{"version":1,"bytesBase64":"tampered"}', { mode: 0o600 })
    await expect(cache.read(ownerDid, request)).resolves.toBeUndefined()
    await expect(readdir(directory)).resolves.toEqual([])

    await cache.write(ownerDid, request.messageId, { attachment, bytes })
    await cache.clear()
    await expect(lstat(directory)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('evicts the least-recently-used verified image when the disk budget is exceeded', async () => {
    stateRoot = await mkdtemp(join(tmpdir(), 'dsh-awiki-image-cache-budget-'))
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 5, 6, 7, 8])
    const ownerDid = 'did:awiki:alice' as AwikiDid
    const firstAttachment: AwikiAttachment = {
      id: 'image-1' as AwikiAttachmentId,
      fileName: 'first.png',
      mimeType: 'image/png',
      size: bytes.byteLength,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    }
    const firstRequest = { messageId: 'message-image-1' as AwikiMessageId, attachmentId: firstAttachment.id }
    const unbounded = new AwikiImageAttachmentCache(stateRoot, 1_024, 4_096)
    await unbounded.write(ownerDid, firstRequest.messageId, { attachment: firstAttachment, bytes })

    const directory = join(stateRoot, '.host', 'image-attachments-v1')
    const [firstFile] = await readdir(directory)
    if (firstFile === undefined) throw new Error('expected the first cache entry')
    const firstPath = join(directory, firstFile)
    const firstSize = (await lstat(firstPath)).size
    await utimes(firstPath, new Date(1), new Date(1))

    const secondAttachment = { ...firstAttachment, id: 'image-2' as AwikiAttachmentId, fileName: 'other.png' }
    const secondRequest = { messageId: 'message-image-2' as AwikiMessageId, attachmentId: secondAttachment.id }
    const bounded = new AwikiImageAttachmentCache(stateRoot, 1_024, firstSize + 32)
    await bounded.write(ownerDid, secondRequest.messageId, { attachment: secondAttachment, bytes })

    await expect(bounded.read(ownerDid, firstRequest)).resolves.toBeUndefined()
    await expect(bounded.read(ownerDid, secondRequest)).resolves.toEqual({ attachment: secondAttachment, bytes })
    expect(await readdir(directory)).toHaveLength(1)
  })
})
