/** Host-owned validation for on-demand mail requests. */

import { createHash } from 'node:crypto'

import type {
  AwikiMailAttachmentDownloadRequest,
  AwikiMailInboxRequest,
  AwikiMailMarkReadRequest,
  AwikiMailMessageId,
  AwikiMailReadRequest,
  AwikiMailSendRequest,
} from './types.ts'

const U32_MAX = 0xffff_ffff
const MAX_MESSAGE_IDS = 100
const MAX_RECIPIENTS = 20
export const MAIL_ATTACHMENT_SERVICE_MAX_COUNT = 10
export const MAIL_ATTACHMENT_SERVICE_MAX_BYTES = 10 * 1024 * 1024
export const MAIL_ATTACHMENT_SERVICE_TOTAL_MAX_BYTES = 18 * 1024 * 1024

export interface AwikiMailAttachmentLimits {
  readonly maxCount: number
  readonly maxBytes: number
  readonly totalMaxBytes: number
}

export interface AwikiValidatedMailSendAttachment {
  readonly fileName: string
  readonly contentType: string
  readonly sizeBytes: number
  readonly sha256: string
  readonly bytes: Uint8Array
}

export interface AwikiValidatedMailSendRequest {
  readonly to: readonly string[]
  readonly cc: readonly string[]
  readonly subject: string
  readonly bodyText: string
  readonly attachments: readonly AwikiValidatedMailSendAttachment[]
}

export const DEFAULT_MAIL_ATTACHMENT_LIMITS: AwikiMailAttachmentLimits = Object.freeze({
  maxCount: MAIL_ATTACHMENT_SERVICE_MAX_COUNT,
  maxBytes: MAIL_ATTACHMENT_SERVICE_MAX_BYTES,
  totalMaxBytes: MAIL_ATTACHMENT_SERVICE_TOTAL_MAX_BYTES,
})

function reject(): never {
  throw new TypeError('invalid AWiki mail request')
}

function token(value: unknown, maxCharacters: number): string {
  if (typeof value !== 'string'
    || value.length === 0
    || value.trim() !== value
    || Array.from(value).length > maxCharacters
    || /[\u0000-\u001f\u007f-\u009f]/u.test(value)) reject()
  return value
}

function address(value: unknown): string {
  if (typeof value !== 'string') reject()
  const length = Array.from(value).length
  if (length < 3
    || length > 320
    || !value.includes('@')
    || /[\s\u0000-\u001f\u007f-\u009f]/u.test(value)) reject()
  return value
}

export function mailAttachmentFileName(value: unknown): string {
  if (typeof value !== 'string'
    || value.length === 0
    || value.trim() !== value
    || value.replace(/[. ]+$/u, '') !== value
    || value === '.'
    || value === '..'
    || Buffer.byteLength(value, 'utf8') > 255
    || /[\\/\p{C}]/u.test(value)) reject()
  return value
}

export function mailAttachmentContentType(value: unknown): string {
  if (value === '') return 'application/octet-stream'
  if (typeof value !== 'string'
    || !/^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/u.test(value)) reject()
  return value
}

function attachmentBytes(value: unknown, sizeBytes: number, maxBytes: number): Uint8Array {
  if (typeof value !== 'string') reject()
  const expectedEncodedLength = Math.ceil(sizeBytes / 3) * 4
  if (value.length !== expectedEncodedLength
    || value.length % 4 !== 0
    || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)) reject()
  const bytes = Buffer.from(value, 'base64')
  if (bytes.byteLength !== sizeBytes || bytes.byteLength > maxBytes) reject()
  if (Buffer.from(bytes).toString('base64') !== value) reject()
  return bytes
}

/** Resolve mailbox defaults before the provider is invoked. */
export function mailInboxRequest(request: AwikiMailInboxRequest = {}): AwikiMailInboxRequest {
  const folder = token(request.folder ?? 'inbox', 64)
  const limit = request.limit ?? 20
  const offset = request.offset ?? 0
  const unreadOnly = request.unreadOnly ?? false
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) reject()
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > U32_MAX) reject()
  if (typeof unreadOnly !== 'boolean') reject()
  return { folder, unreadOnly, limit, offset }
}

export function mailReadRequest(request: AwikiMailReadRequest): AwikiMailReadRequest {
  return { messageId: token(request.messageId, 2_048) as AwikiMailMessageId }
}

export function mailMarkReadRequest(request: AwikiMailMarkReadRequest): AwikiMailMarkReadRequest {
  if (!Array.isArray(request.messageIds)
    || request.messageIds.length === 0
    || request.messageIds.length > MAX_MESSAGE_IDS) reject()
  return {
    messageIds: request.messageIds.map(value => token(value, 2_048) as AwikiMailMessageId),
  }
}

export function mailSendRequest(
  request: AwikiMailSendRequest,
  limits: AwikiMailAttachmentLimits = DEFAULT_MAIL_ATTACHMENT_LIMITS,
): AwikiValidatedMailSendRequest {
  if (!Array.isArray(request.to) || request.to.length === 0 || !Array.isArray(request.cc ?? [])) reject()
  const to = request.to.map(address)
  const cc = (request.cc ?? []).map(address)
  if (to.length + cc.length > MAX_RECIPIENTS) reject()
  const recipients = new Set([...to, ...cc])
  if (recipients.size !== to.length + cc.length) reject()
  if (typeof request.subject !== 'string'
    || request.subject.length === 0
    || request.subject.trim() !== request.subject
    || Buffer.byteLength(request.subject, 'utf8') > 1_024) reject()
  if (typeof request.bodyText !== 'string'
    || request.bodyText.trim().length === 0
    || Buffer.byteLength(request.bodyText, 'utf8') > 65_536) reject()
  if (!Array.isArray(request.attachments ?? []) || (request.attachments?.length ?? 0) > limits.maxCount) reject()
  let totalBytes = 0
  const attachments = (request.attachments ?? []).map((attachment) => {
    if (typeof attachment !== 'object' || attachment === null || Array.isArray(attachment)) reject()
    if (!Number.isSafeInteger(attachment.sizeBytes)
      || attachment.sizeBytes < 0
      || attachment.sizeBytes > limits.maxBytes) reject()
    const bytes = attachmentBytes(attachment.bytesBase64, attachment.sizeBytes, limits.maxBytes)
    totalBytes += bytes.byteLength
    if (!Number.isSafeInteger(totalBytes) || totalBytes > limits.totalMaxBytes) reject()
    return {
      fileName: mailAttachmentFileName(attachment.fileName),
      contentType: mailAttachmentContentType(attachment.contentType),
      sizeBytes: bytes.byteLength,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      bytes,
    }
  })
  return { to, cc, subject: request.subject, bodyText: request.bodyText, attachments }
}

export function mailAttachmentDownloadRequest(
  request: AwikiMailAttachmentDownloadRequest,
): AwikiMailAttachmentDownloadRequest {
  if (!Number.isSafeInteger(request.attachmentIndex)
    || request.attachmentIndex < 0
    || request.attachmentIndex > U32_MAX) reject()
  return {
    localMessageId: token(request.localMessageId, 2_048) as AwikiMailMessageId,
    attachmentIndex: request.attachmentIndex,
  }
}
