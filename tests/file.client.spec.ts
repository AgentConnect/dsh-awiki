// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import type { AwikiDownloadedAttachment } from '@awiki/dsh-plugin/types'
import { createAttachmentObjectUrl, fileToBase64, saveDownloadedAttachment } from '../src/client/file.ts'

describe('AWiki browser file helpers', () => {
  it('encodes browser bytes without a data-URL prefix', async () => {
    const file = {
      arrayBuffer: () => Promise.resolve(Uint8Array.from([97, 98, 99]).buffer),
    } as File
    await expect(fileToBase64(file)).resolves.toBe('YWJj')
  })

  it('downloads decoded bytes under the Host-provided file name', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const createObjectURL = vi.fn(() => 'blob:awiki')
    const revokeObjectURL = vi.fn()
    Object.defineProperties(URL, {
      createObjectURL: { configurable: true, value: createObjectURL },
      revokeObjectURL: { configurable: true, value: revokeObjectURL },
    })
    const value: AwikiDownloadedAttachment = {
      attachment: {
        id: 'a1' as never,
        fileName: 'a.txt',
        mimeType: 'text/plain',
        size: 3,
        sha256: 'abc',
      },
      bytesBase64: 'YWJj',
    }

    expect(createAttachmentObjectUrl(value)).toBe('blob:awiki')
    saveDownloadedAttachment(value)

    expect(createObjectURL).toHaveBeenCalledTimes(2)
    expect(click).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:awiki')
  })
})
