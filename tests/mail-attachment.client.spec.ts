// @vitest-environment jsdom
import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  downloadableMailAttachment,
  encodeMailAttachments,
  prepareMailAttachmentDownload,
  savePreparedMailAttachment,
  selectMailAttachments,
} from '../src/client/mail-attachment.ts'

const limits = { maxCount: 2, maxBytes: 4, totalMaxBytes: 6 }
const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

afterEach(() => {
  vi.restoreAllMocks()
  if (originalCreateObjectURL === undefined) delete (URL as unknown as { createObjectURL?: unknown }).createObjectURL
  else Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: originalCreateObjectURL })
  if (originalRevokeObjectURL === undefined) delete (URL as unknown as { revokeObjectURL?: unknown }).revokeObjectURL
  else Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: originalRevokeObjectURL })
})

describe('browser mail attachment helpers', () => {
  it('enforces count, single, total, filename, and MIME boundaries before reading bytes', () => {
    let id = 0
    const createId = () => `file-${++id}`
    const first = new File(['abc'], 'first.txt', { type: 'text/plain' })
    const second = new File(['def'], 'second.txt', { type: 'text/plain' })
    expect(selectMailAttachments([], [first, second], limits, createId)).toMatchObject([
      { id: 'file-1', fileName: 'first.txt', contentType: 'text/plain', sizeBytes: 3 },
      { id: 'file-2', fileName: 'second.txt', contentType: 'text/plain', sizeBytes: 3 },
    ])
    expect(() => selectMailAttachments([], [first, second, new File([], 'third.txt')], limits, createId))
      .toThrow('邮件最多选择 2 个附件。')
    expect(() => selectMailAttachments([], [new File(['12345'], 'large.txt')], limits, createId))
      .toThrow('单个附件不能超过 4 bytes。')
    expect(() => selectMailAttachments([], [new File(['1234'], 'a.txt'), new File(['123'], 'b.txt')], limits, createId))
      .toThrow('附件总大小不能超过 6 bytes。')
    expect(() => selectMailAttachments([], [new File(['x'], '../escape.txt')], limits, createId))
      .toThrow('附件文件名无效。')
    expect(() => selectMailAttachments([], [new File(['x'], 'payload.exe ')], limits, createId))
      .toThrow('附件文件名无效。')
    expect(() => selectMailAttachments([], [new File(['x'], 'safe\u202egnp.txt')], limits, createId))
      .toThrow('附件文件名无效。')
    expect(() => selectMailAttachments([], [new File(['x'], 'private\ue000.txt')], limits, createId))
      .toThrow('附件文件名无效。')
    expect(() => selectMailAttachments([], [new File(['x'], 'unassigned\u0378.txt')], limits, createId))
      .toThrow('附件文件名无效。')
    expect(() => selectMailAttachments([], [new File(['x'], `${'界'.repeat(84)}.txt`)], limits, createId))
      .toThrow('附件文件名无效。')
    expect(() => selectMailAttachments([], [new File(['x'], 'bad.txt', { type: 'text/plain; charset=utf-8' })], limits, createId))
      .toThrow('附件 MIME 类型无效。')
  })

  it('encodes actual File bytes canonically and rejects changed approved metadata or read failure', async () => {
    const file = new File(['abc'], 'a.txt', { type: 'text/plain', lastModified: 7 })
    const selected = selectMailAttachments([], [file], limits, () => 'file-1')
    await expect(encodeMailAttachments(selected, limits)).resolves.toEqual([{
      fileName: 'a.txt', contentType: 'text/plain', sizeBytes: 3, bytesBase64: 'YWJj',
    }])
    await expect(encodeMailAttachments([{ ...selected[0]!, sizeBytes: 2 }], limits))
      .rejects.toThrow('附件 a.txt 已发生变化，请重新选择。')
    const unreadable = new File(['x'], 'unreadable.txt', { type: 'text/plain' })
    Object.defineProperty(unreadable, 'arrayBuffer', { value: () => Promise.reject(new Error('private')) })
    const unreadableSelected = selectMailAttachments([], [unreadable], limits, () => 'file-2')
    await expect(encodeMailAttachments(unreadableSelected, limits))
      .rejects.toThrow('无法读取附件 unreadable.txt，请重新选择。')
  })

  it('requires complete download metadata and verifies Base64, size, and SHA-256', async () => {
    expect(downloadableMailAttachment({ index: 0, fileName: 'a.txt' }, 4)).toBeUndefined()
    expect(downloadableMailAttachment({ index: 0, fileName: 'a.txt', contentType: 'text/plain', sizeBytes: '03' }, 4)).toBeUndefined()
    const expected = downloadableMailAttachment({
      index: 0, fileName: 'a.txt', contentType: 'text/plain', sizeBytes: '3',
    }, 4)!
    const sha256 = createHash('sha256').update('abc').digest('hex')
    await expect(prepareMailAttachmentDownload({
      fileName: 'a.txt', contentType: 'text/plain', sizeBytes: 3, sha256, bytesBase64: 'YWJj',
    }, expected, 4)).resolves.toMatchObject({
      fileName: 'a.txt', contentType: 'text/plain', bytes: new Uint8Array([97, 98, 99]),
    })
    await expect(prepareMailAttachmentDownload({
      fileName: 'a.txt', contentType: 'text/plain', sizeBytes: 2, sha256, bytesBase64: 'YWI=',
    }, expected, 4)).rejects.toThrow('下载附件与邮件元数据不一致。')
    await expect(prepareMailAttachmentDownload({
      fileName: 'a.txt', contentType: 'text/plain', sizeBytes: 3, sha256: '0'.repeat(64), bytesBase64: 'YWJj',
    }, expected, 4)).rejects.toThrow('下载附件完整性校验失败。')
  })

  it('always removes the temporary anchor and revokes its URL even when the browser click fails', () => {
    const createObjectURL = vi.fn(() => 'blob:temporary')
    const revokeObjectURL = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL })
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { throw new Error('download blocked') })

    expect(() => savePreparedMailAttachment({
      fileName: 'safe.txt', contentType: 'text/plain', bytes: new Uint8Array([1, 2, 3]),
    })).toThrow('download blocked')
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:temporary')
    expect(document.querySelector('a[download="safe.txt"]')).toBeNull()
  })
})
