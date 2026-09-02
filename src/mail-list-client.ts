/** Host-only server-authoritative outbound Mail query. */

import {
  AwikiExternalHttpAuthError,
  type AwikiExternalHttpAuth,
} from './external-http-auth.ts'
import { AwikiSdkError } from './sdk-adapter.ts'
import type {
  AwikiMailInboxPage,
  AwikiMailInboxRequest,
  AwikiMailMessageId,
  AwikiMailSummary,
} from './types.ts'

const MAIL_LIST_PATH = '/mail/rpc'
const MAIL_LIST_PAGE_SIZE = 100
const MAIL_LIST_TIMEOUT_MS = 10_000
const MAX_RESPONSE_BYTES = 1024 * 1024
const MAX_UINT32 = 0xffff_ffff

interface MailListPage {
  readonly total: number
  readonly items: readonly AwikiMailSummary[]
}

function invalidResponse(): never {
  throw new AwikiSdkError('remote')
}

function uint32(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > MAX_UINT32) {
    invalidResponse()
  }
  return value as number
}

function requiredString(value: unknown, maxBytes: number): string {
  if (typeof value !== 'string'
    || value.length === 0
    || value.trim() !== value
    || /[\u0000-\u001f\u007f-\u009f]/u.test(value)
    || Buffer.byteLength(value, 'utf8') > maxBytes) {
    invalidResponse()
  }
  return value
}

function addresses(value: unknown): string[] {
  if (value === null || value === undefined || value === '') return []
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string' ? value.split(/[;,]/u) : invalidResponse()
  if (raw.length > 100) invalidResponse()
  return raw.map(candidate => {
    const address = requiredString(typeof candidate === 'string' ? candidate.trim() : candidate, 320)
    if (!address.includes('@') || /\s/u.test(address)) invalidResponse()
    return address
  })
}

function timestamp(value: unknown): string {
  const copied = requiredString(value, 64)
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})?$/u.exec(copied)
  if (match === null) invalidResponse()
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const zone = match[8]
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (year === 0
    || month < 1 || month > 12
    || day < 1 || day > monthDays[month - 1]!
    || hour > 23
    || minute > 59
    || second > 59) {
    invalidResponse()
  }
  if (zone !== undefined && zone !== 'Z') {
    const offsetHour = Number(zone.slice(1, 3))
    const offsetMinute = Number(zone.slice(4, 6))
    if (offsetHour > 23 || offsetMinute > 59) invalidResponse()
  }
  // Mail Service persists UTC-naive MySQL DATETIME and serializes it with
  // datetime.isoformat(). Make that deployed shape explicit before Browser use.
  return zone === undefined ? `${copied}Z` : copied
}

function boundedText(value: unknown, maxBytes: number, fallback: string): {
  readonly value: string
  readonly truncated: boolean
} {
  const source = typeof value === 'string' && value.trim() !== '' ? value : fallback
  if (/\u0000/u.test(source)) invalidResponse()
  if (Buffer.byteLength(source, 'utf8') <= maxBytes) return { value: source, truncated: false }
  const characters = Array.from(source)
  while (characters.length > 0 && Buffer.byteLength(characters.join(''), 'utf8') > maxBytes) {
    characters.pop()
  }
  return { value: characters.join(''), truncated: true }
}

function summary(raw: unknown): AwikiMailSummary {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) invalidResponse()
  const value = raw as Record<string, unknown>
  if (value.direction !== 'outbound' || typeof value.has_attachments !== 'boolean') invalidResponse()
  const subject = boundedText(value.subject, 1_024, '(no subject)')
  return {
    id: requiredString(value.id, 2_048) as AwikiMailMessageId,
    folder: 'sent',
    from: addresses(value.from_addr),
    to: addresses(value.to_addr),
    cc: addresses(value.cc_addr),
    subject: subject.value,
    subjectTruncated: subject.truncated,
    previewTruncated: false,
    sentAt: timestamp(value.created_at),
    unread: false,
    hasAttachments: value.has_attachments,
  }
}

async function readBounded(response: Response): Promise<unknown> {
  const declared = response.headers.get('content-length')
  if (declared !== null && /^\d+$/u.test(declared) && Number(declared) > MAX_RESPONSE_BYTES) {
    invalidResponse()
  }
  const reader = response.body?.getReader()
  if (reader === undefined) invalidResponse()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const result = await reader.read()
      if (result.done) break
      size += result.value.byteLength
      if (size > MAX_RESPONSE_BYTES) invalidResponse()
      chunks.push(result.value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown
  } catch {
    invalidResponse()
  }
}

function rpcFailure(code: unknown): never {
  if (code === -32000) throw new AwikiSdkError('not-registered')
  if (code === -32001) throw new AwikiSdkError('forbidden')
  if (code === -32002) throw new AwikiSdkError('not-found')
  if (code === -32003) throw new AwikiSdkError('conflict')
  if (code === -32004 || code === -32600 || code === -32602) throw new AwikiSdkError('invalid-request')
  if (code === -32005) throw new AwikiSdkError('rate-limited')
  invalidResponse()
}

function responseFailure(status: number): never {
  if (status === 401) throw new AwikiSdkError('not-registered')
  if (status === 403) throw new AwikiSdkError('forbidden')
  if (status === 429) throw new AwikiSdkError('rate-limited')
  if (status >= 500) throw new AwikiSdkError('network')
  invalidResponse()
}

/** Fixed Mail Service client; callers cannot select method, direction, headers, or transport. */
export class AwikiMailListClient {
  public constructor(
    private readonly origin: string,
    private readonly auth: AwikiExternalHttpAuth,
  ) {}

  public async listOutbound(request: AwikiMailInboxRequest): Promise<AwikiMailInboxPage> {
    const offset = request.offset ?? 0
    const limit = request.limit ?? 20
    const firstPageNumber = Math.floor(offset / MAIL_LIST_PAGE_SIZE) + 1
    const first = await this.page(firstPageNumber)
    const pageOffset = offset % MAIL_LIST_PAGE_SIZE
    let items = first.items.slice(pageOffset, pageOffset + limit)
    let total = first.total
    if (items.length < limit && offset + items.length < total) {
      const next = await this.page(firstPageNumber + 1)
      total = next.total
      items = [...items, ...next.items.slice(0, limit - items.length)]
    }
    const nextOffset = offset + items.length
    const hasMore = nextOffset < total
    return {
      items,
      ...hasMore ? { nextOffset } : {},
      hasMore,
    }
  }

  private async page(page: number): Promise<MailListPage> {
    const abort = new AbortController()
    const timeout = setTimeout(() => { abort.abort() }, MAIL_LIST_TIMEOUT_MS)
    try {
      const request = new Request(new URL(MAIL_LIST_PATH, this.origin), {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'mail.list',
          params: { direction: 'outbound', page, page_size: MAIL_LIST_PAGE_SIZE },
        }),
        redirect: 'error',
        signal: abort.signal,
      })
      const response = await this.auth.dispatch(request, signed => fetch(signed))
      if (!response.ok) responseFailure(response.status)
      const raw = await readBounded(response)
      if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) invalidResponse()
      const envelope = raw as Record<string, unknown>
      if (envelope.jsonrpc !== '2.0' || envelope.id !== 1) invalidResponse()
      if (envelope.error !== null && envelope.error !== undefined) {
        if (typeof envelope.error !== 'object' || Array.isArray(envelope.error)) invalidResponse()
        rpcFailure((envelope.error as Record<string, unknown>).code)
      }
      if (typeof envelope.result !== 'object' || envelope.result === null || Array.isArray(envelope.result)) {
        invalidResponse()
      }
      const result = envelope.result as Record<string, unknown>
      if (!Array.isArray(result.items) || result.items.length > MAIL_LIST_PAGE_SIZE) invalidResponse()
      return { total: uint32(result.total), items: result.items.map(summary) }
    } catch (error) {
      if (error instanceof AwikiSdkError) throw error
      if (error instanceof AwikiExternalHttpAuthError) {
        if (error.code === 'not-registered') throw new AwikiSdkError('not-registered')
        if (error.code === 'signed-out') throw new AwikiSdkError('signed-out')
      }
      throw new AwikiSdkError('network')
    } finally {
      clearTimeout(timeout)
    }
  }
}
