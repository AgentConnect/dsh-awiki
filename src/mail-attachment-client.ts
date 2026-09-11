/** Host-owned Mail HTTP transport. Identity signs exact bytes; no attachment SDK facade is needed. */
import { createHash } from 'node:crypto'
import { AWIKI_EXTERNAL_HTTP_MAX_BODY_BYTES, AwikiExternalHttpAuthError, type AwikiExternalHttpAuth } from './external-http-auth.ts'
import { mailAttachmentContentType, mailAttachmentFileName, type AwikiValidatedMailSendRequest } from './mail.ts'
import { standardBase64Syntax } from './base64.ts'
import { AwikiSdkError } from './sdk-adapter.ts'
import type { AwikiDownloadedMailAttachment, AwikiMailAttachmentDownloadRequest, AwikiMailMessageId, AwikiMailSendResult } from './types.ts'

/** Reserve JSON escaping, recipients, subject, body text and ten attachment metadata records. */
export const MAIL_HTTP_UPLOAD_MAX_BYTES = Math.floor((AWIKI_EXTERNAL_HTTP_MAX_BODY_BYTES - 512 * 1024) / 4) * 3
const RESPONSE_METADATA_BYTES = 64 * 1024
const TIMEOUT_MS = 30_000

function invalid(): never { throw new AwikiSdkError('remote') }
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) invalid()
  return value as Record<string, unknown>
}
function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value || /[\p{C}]/u.test(value) || Buffer.byteLength(value) > max) invalid()
  return value
}
function integer(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) invalid()
  return value as number
}

/** Enforce the budget before JSON aggregation, even without Content-Length. */
async function bounded(response: Response, maxBytes: number): Promise<Uint8Array<ArrayBuffer>> {
  const declared = response.headers.get('content-length')
  if (declared !== null && (!/^\d+$/u.test(declared) || Number(declared) > maxBytes)) {
    await response.body?.cancel().catch(() => {})
    invalid()
  }
  if (response.body === null) return new Uint8Array()
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      length += chunk.value.byteLength
      if (length > maxBytes) { await reader.cancel().catch(() => {}); invalid() }
      chunks.push(chunk.value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  return bytes
}

function serviceFailure(code: number): never {
  if (code === 401 || code === 1401) throw new AwikiSdkError('not-registered')
  if (code === 403 || code === 1403) throw new AwikiSdkError('forbidden')
  if (code === 404 || code === 1404) throw new AwikiSdkError('not-found')
  if (code === 413 || code === 1413) throw new AwikiSdkError('attachment-too-large')
  if (code === 429 || code === 1429) throw new AwikiSdkError('rate-limited')
  invalid()
}

export class AwikiMailAttachmentClient {
  constructor(private readonly origin: string, private readonly auth: AwikiExternalHttpAuth) {}

  async send(request: AwikiValidatedMailSendRequest): Promise<AwikiMailSendResult> {
    const result = await this.rpc('mail.send', {
      to: request.to, cc: request.cc, subject: request.subject, body_text: request.bodyText, body_html: null,
      attachments: request.attachments.map(value => ({
        filename: value.fileName, content_type: value.contentType, content_base64: Buffer.from(value.bytes).toString('base64'),
      })),
    }, RESPONSE_METADATA_BYTES, false)
    if (result.accepted !== true || result.status !== 'sent'
      || (result.ok !== undefined && result.ok !== true) || (result.success !== undefined && result.success !== true)) invalid()
    const messageId = result.message_id ?? result.messageId ?? result.id
    const warnings = result.warnings ?? []
    if (!Array.isArray(warnings) || warnings.length > 100) invalid()
    return {
      accepted: true,
      ...(messageId === undefined || messageId === null ? {} : { messageId: text(messageId, 2048) as AwikiMailMessageId }),
      warnings: warnings.map(value => text(value, 1024)),
    }
  }

  async download(request: AwikiMailAttachmentDownloadRequest, maxBytes: number): Promise<AwikiDownloadedMailAttachment> {
    const result = await this.rpc('mail.getAttachment', {
      message_id: request.localMessageId, attachment_index: request.attachmentIndex,
    }, Math.ceil(maxBytes / 3) * 4 + RESPONSE_METADATA_BYTES, true)
    if (integer(result.index ?? result.attachment_index ?? result.attachmentIndex) !== request.attachmentIndex) invalid()
    const sizeBytes = integer(result.size ?? result.size_bytes ?? result.sizeBytes)
    if (sizeBytes > maxBytes) throw new AwikiSdkError('attachment-too-large')
    let fileName: string
    let contentType: string
    try {
      fileName = mailAttachmentFileName(result.filename ?? result.name)
      contentType = mailAttachmentContentType(result.content_type ?? result.contentType ?? result.mime_type)
    } catch { invalid() }
    const content = result.content_base64 ?? result.contentBase64 ?? result.base64
    if (typeof content !== 'string' || content.length !== Math.ceil(sizeBytes / 3) * 4 || !standardBase64Syntax(content)) invalid()
    const bytes = Buffer.from(content, 'base64')
    if (bytes.byteLength !== sizeBytes || bytes.toString('base64') !== content) invalid()
    return { fileName, contentType, sizeBytes, sha256: createHash('sha256').update(bytes).digest('hex'), bytesBase64: content }
  }

  private async rpc(method: string, params: unknown, maxResponseBytes: number, allowAuthRetry: boolean): Promise<Record<string, unknown>> {
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
    if (Buffer.byteLength(body) > AWIKI_EXTERNAL_HTTP_MAX_BODY_BYTES) throw new AwikiSdkError('attachment-too-large')
    const abort = new AbortController()
    const timer = setTimeout(() => abort.abort(), TIMEOUT_MS)
    let dispatched = false
    try {
      const request = new Request(new URL('/mail/rpc', this.origin), {
        method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' },
        body, redirect: 'error', signal: abort.signal,
      })
      const response = await this.auth.dispatch(request, async signed => {
        dispatched = true
        const raw = await fetch(signed)
        // Bound every attempt, including authentication rejection responses.
        const bytes = await bounded(raw, maxResponseBytes)
        return new Response(bytes, { status: raw.status, headers: raw.headers })
      }, { allowAuthRetry })
      if (!response.ok) serviceFailure(response.status)
      const envelope = record(JSON.parse(await response.text()))
      if (envelope.jsonrpc !== '2.0' || envelope.id !== 1) invalid()
      if (envelope.error != null) serviceFailure(integer(record(envelope.error).code))
      return record(envelope.result)
    } catch (error) {
      if (error instanceof AwikiSdkError) throw error
      if (error instanceof AwikiExternalHttpAuthError) {
        if (error.code === 'not-registered' || error.code === 'signed-out') throw new AwikiSdkError(error.code)
        if (error.code === 'body-too-large') throw new AwikiSdkError('attachment-too-large')
      }
      throw new AwikiSdkError(dispatched && !allowAuthRetry ? 'delivery-unknown' : 'network')
    } finally { clearTimeout(timer) }
  }
}
