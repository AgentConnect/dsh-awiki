/** Browser-only mail attachment selection, encoding, integrity, and download helpers. */

import type {
  AwikiDownloadedMailAttachment,
  AwikiMailAttachmentDownloadRequest,
  AwikiMailAttachmentMetadata,
  AwikiMailSendAttachment,
} from '@awiki/dsh-plugin/types'
import type { AwikiActionResult } from './controller.ts'

export interface BrowserMailAttachmentLimits {
  readonly maxCount: number
  readonly maxBytes: number
  readonly totalMaxBytes: number
}

export interface SelectedMailAttachment {
  readonly id: string
  readonly file: File
  readonly fileName: string
  readonly contentType: string
  readonly sizeBytes: number
  readonly lastModified: number
}

export interface DownloadableMailAttachment {
  readonly index: number
  readonly fileName: string
  readonly contentType: string
  readonly sizeBytes: number
}

export interface PreparedMailAttachmentDownload {
  readonly fileName: string
  readonly contentType: string
  readonly bytes: Uint8Array<ArrayBuffer>
}

function invalid(message: string): never {
  throw new TypeError(message)
}

function fileName(value: string): string {
  if (value.length === 0
    || value.trim() !== value
    || value.replace(/[. ]+$/u, '') !== value
    || value === '.'
    || value === '..'
    || new TextEncoder().encode(value).byteLength > 255
    || /[\\/\p{C}]/u.test(value)) {
    invalid('附件文件名无效。')
  }
  return value
}

function contentType(value: string): string {
  if (value === '') return 'application/octet-stream'
  if (!/^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/u.test(value)) {
    invalid('附件 MIME 类型无效。')
  }
  return value
}

function assertLimits(limits: BrowserMailAttachmentLimits): void {
  if (!Number.isSafeInteger(limits.maxCount)
    || limits.maxCount < 0
    || !Number.isSafeInteger(limits.maxBytes)
    || limits.maxBytes < 1
    || !Number.isSafeInteger(limits.totalMaxBytes)
    || limits.totalMaxBytes < limits.maxBytes) {
    invalid('邮件附件限制暂不可用。')
  }
}

function base64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

/** Append browser File references after enforcing the exact Host-owned limits. */
export function selectMailAttachments(
  current: readonly SelectedMailAttachment[],
  selected: Iterable<File>,
  limits: BrowserMailAttachmentLimits,
  createId: () => string,
): readonly SelectedMailAttachment[] {
  assertLimits(limits)
  const additions = Array.from(selected, (file): SelectedMailAttachment => ({
    id: createId(),
    file,
    fileName: fileName(file.name),
    contentType: contentType(file.type),
    sizeBytes: file.size,
    lastModified: file.lastModified,
  }))
  const combined = [...current, ...additions]
  if (combined.length > limits.maxCount) invalid(`邮件最多选择 ${limits.maxCount} 个附件。`)
  for (const attachment of combined) {
    if (!Number.isSafeInteger(attachment.sizeBytes) || attachment.sizeBytes < 0) invalid('附件大小无效。')
    if (attachment.sizeBytes > limits.maxBytes) {
      invalid(`单个附件不能超过 ${limits.maxBytes} bytes。`)
    }
  }
  const total = combined.reduce((sum, attachment) => sum + attachment.sizeBytes, 0)
  if (!Number.isSafeInteger(total) || total > limits.totalMaxBytes) {
    invalid(`附件总大小不能超过 ${limits.totalMaxBytes} bytes。`)
  }
  return combined
}

/** Re-read the same approved File objects and return JSON-safe Remote attachments. */
export async function encodeMailAttachments(
  attachments: readonly SelectedMailAttachment[],
  limits: BrowserMailAttachmentLimits,
): Promise<readonly AwikiMailSendAttachment[]> {
  selectMailAttachments([], attachments.map(value => value.file), limits, () => 'validation-only')
  const encoded: AwikiMailSendAttachment[] = []
  for (const attachment of attachments) {
    if (attachment.file.name !== attachment.fileName
      || contentType(attachment.file.type) !== attachment.contentType
      || attachment.file.size !== attachment.sizeBytes
      || attachment.file.lastModified !== attachment.lastModified) {
      invalid(`附件 ${attachment.fileName} 已发生变化，请重新选择。`)
    }
    let buffer: ArrayBuffer
    try {
      buffer = await attachment.file.arrayBuffer()
    } catch {
      invalid(`无法读取附件 ${attachment.fileName}，请重新选择。`)
    }
    const bytes = new Uint8Array(buffer)
    if (bytes.byteLength !== attachment.sizeBytes) {
      invalid(`附件 ${attachment.fileName} 的大小已发生变化，请重新选择。`)
    }
    encoded.push({
      fileName: attachment.fileName,
      contentType: attachment.contentType,
      sizeBytes: bytes.byteLength,
      bytesBase64: base64(bytes),
    })
  }
  return encoded
}

/** Return canonical download metadata only when the service supplied every required field. */
export function downloadableMailAttachment(
  value: AwikiMailAttachmentMetadata,
  maxBytes: number,
): DownloadableMailAttachment | undefined {
  if (!Number.isSafeInteger(value.index) || value.index < 0 || value.index > 0xffff_ffff) return undefined
  if (value.fileName === undefined || value.contentType === undefined || value.sizeBytes === undefined) return undefined
  if (!/^(?:0|[1-9][0-9]*)$/u.test(value.sizeBytes)) return undefined
  const sizeBytes = Number(value.sizeBytes)
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0 || sizeBytes > maxBytes) return undefined
  try {
    return {
      index: value.index,
      fileName: fileName(value.fileName),
      contentType: contentType(value.contentType),
      sizeBytes,
    }
  } catch {
    return undefined
  }
}

/** Validate exact metadata, canonical Base64, byte length, and SHA-256 before download. */
export async function prepareMailAttachmentDownload(
  value: AwikiDownloadedMailAttachment,
  expected: DownloadableMailAttachment,
  maxBytes: number,
): Promise<PreparedMailAttachmentDownload> {
  if (fileName(value.fileName) !== expected.fileName
    || contentType(value.contentType) !== expected.contentType
    || value.sizeBytes !== expected.sizeBytes
    || value.sizeBytes > maxBytes) {
    invalid('下载附件与邮件元数据不一致。')
  }
  if (!/^[a-f0-9]{64}$/u.test(value.sha256)) invalid('下载附件完整性信息无效。')
  const expectedEncodedLength = Math.ceil(value.sizeBytes / 3) * 4
  if (value.bytesBase64.length !== expectedEncodedLength
    || value.bytesBase64.length % 4 !== 0
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value.bytesBase64)) {
    invalid('下载附件编码无效。')
  }
  let binary: string
  try {
    binary = atob(value.bytesBase64)
  } catch {
    invalid('下载附件编码无效。')
  }
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0))
  if (bytes.byteLength !== value.sizeBytes || base64(bytes) !== value.bytesBase64) {
    invalid('下载附件大小或编码不一致。')
  }
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  const sha256 = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('')
  if (sha256 !== value.sha256) invalid('下载附件完整性校验失败。')
  return { fileName: expected.fileName, contentType: expected.contentType, bytes }
}

/** Trigger one download and always revoke the temporary object URL immediately. */
export function savePreparedMailAttachment(value: PreparedMailAttachmentDownload): void {
  const url = URL.createObjectURL(new Blob([value.bytes], { type: value.contentType }))
  const anchor = document.createElement('a')
  try {
    anchor.href = url
    anchor.download = value.fileName
    anchor.hidden = true
    document.body.append(anchor)
    anchor.click()
  } finally {
    anchor.remove()
    URL.revokeObjectURL(url)
  }
}

/** Execute the exact Browser UI download path: Remote, integrity check, Blob, and save click. */
export async function downloadAndSaveMailAttachment(
  download: (
    request: AwikiMailAttachmentDownloadRequest,
  ) => Promise<AwikiActionResult<AwikiDownloadedMailAttachment>>,
  request: AwikiMailAttachmentDownloadRequest,
  expected: DownloadableMailAttachment,
  maxBytes: number,
  active: () => boolean = () => true,
): Promise<boolean> {
  const result = await download(request)
  if (!active()) return false
  if (!result.ok) invalid(result.error)
  const prepared = await prepareMailAttachmentDownload(result.value, expected, maxBytes)
  if (!active()) return false
  savePreparedMailAttachment(prepared)
  return true
}
