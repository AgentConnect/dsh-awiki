/** Private, owner-bound persistence for mail successfully sent by this installation. */

import { createHash, randomUUID } from 'node:crypto'
import { chmod, lstat, mkdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { mailSendRequest } from './mail.ts'
import type {
  AwikiDid,
  AwikiMailAccount,
  AwikiMailInboxPage,
  AwikiMailInboxRequest,
  AwikiMailMessage,
  AwikiMailMessageId,
  AwikiMailSendRequest,
  AwikiMailSendResult,
} from './types.ts'

const STORE_VERSION = 1
const STORE_DIRECTORY = 'sent-mail-v1'
const MAX_RECORDS = 200
const MAX_STORE_BYTES = 16 * 1024 * 1024
const PREVIEW_CHARACTERS = 160
export const LOCAL_SENT_MAIL_ID_PREFIX = 'awiki-sent-v1:'

interface StoredSentMail {
  readonly id: string
  readonly serviceMessageId?: string
  readonly from?: string
  readonly to: readonly string[]
  readonly cc: readonly string[]
  readonly subject: string
  readonly bodyText: string
  readonly sentAt: string
}

interface SentMailFile {
  readonly version: typeof STORE_VERSION
  readonly ownerDid: string
  readonly records: readonly StoredSentMail[]
}

function invalidState(): never {
  throw new TypeError('awiki: local sent-mail history is invalid')
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { readonly code?: unknown }).code === 'ENOENT'
}

function isFileExists(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { readonly code?: unknown }).code === 'EEXIST'
}

function validToken(value: unknown, maxCharacters: number): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.trim() === value
    && Array.from(value).length <= maxCharacters
    && !/[\u0000-\u001f\u007f-\u009f]/u.test(value)
}

function validAddress(value: unknown): value is string {
  return typeof value === 'string'
    && Array.from(value).length >= 3
    && Array.from(value).length <= 320
    && value.includes('@')
    && !/[\s\u0000-\u001f\u007f-\u009f]/u.test(value)
}

function decodeRecord(input: unknown): StoredSentMail {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) invalidState()
  const value = input as Partial<StoredSentMail>
  if (typeof value.id !== 'string'
    || !/^awiki-sent-v1:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value.id)
    || (value.serviceMessageId !== undefined && !validToken(value.serviceMessageId, 2_048))
    || (value.from !== undefined && !validAddress(value.from))
    || typeof value.sentAt !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value.sentAt)
    || !Number.isFinite(Date.parse(value.sentAt))) invalidState()
  let request: AwikiMailSendRequest
  try {
    request = mailSendRequest({
      to: value.to as readonly string[],
      cc: value.cc as readonly string[],
      subject: value.subject as string,
      bodyText: value.bodyText as string,
    })
  } catch {
    invalidState()
  }
  return {
    id: value.id,
    ...value.serviceMessageId === undefined ? {} : { serviceMessageId: value.serviceMessageId },
    ...value.from === undefined ? {} : { from: value.from },
    to: [...request.to],
    cc: [...request.cc ?? []],
    subject: request.subject,
    bodyText: request.bodyText,
    sentAt: value.sentAt,
  }
}

function message(record: StoredSentMail): AwikiMailMessage {
  const characters = Array.from(record.bodyText)
  const preview = characters.slice(0, PREVIEW_CHARACTERS).join('')
  return {
    summary: {
      id: record.id as AwikiMailMessageId,
      folder: 'sent',
      from: record.from === undefined ? [] : [record.from],
      to: [...record.to],
      cc: [...record.cc],
      subject: record.subject,
      subjectTruncated: false,
      preview,
      previewTruncated: characters.length > PREVIEW_CHARACTERS,
      sentAt: record.sentAt,
      unread: false,
      hasAttachments: false,
      attachmentCount: 0,
    },
    bodyText: record.bodyText,
    bodyTruncated: false,
    hasHtmlBody: false,
    attachments: [],
  }
}

export function isLocalSentMailId(messageId: AwikiMailMessageId): boolean {
  return String(messageId).startsWith(LOCAL_SENT_MAIL_ID_PREFIX)
}

/** Atomic, bounded history of sends accepted by the Mail Service. */
export class AwikiSentMailStore {
  private readonly hostDirectory: string
  private readonly directory: string
  private mutation: Promise<void> = Promise.resolve()

  public constructor(stateRoot: string) {
    this.hostDirectory = join(stateRoot, '.host')
    this.directory = join(this.hostDirectory, STORE_DIRECTORY)
  }

  public async list(ownerDid: AwikiDid, request: AwikiMailInboxRequest): Promise<AwikiMailInboxPage> {
    const records = request.unreadOnly === true ? [] : await this.load(ownerDid)
    const offset = request.offset ?? 0
    const limit = request.limit ?? 20
    const page = records.slice(offset, offset + limit)
    const nextOffset = offset + page.length
    const hasMore = nextOffset < records.length
    return {
      items: page.map(record => message(record).summary),
      ...hasMore ? { nextOffset } : {},
      hasMore,
    }
  }

  public async read(ownerDid: AwikiDid, messageId: AwikiMailMessageId): Promise<AwikiMailMessage | undefined> {
    if (!isLocalSentMailId(messageId)) return undefined
    const record = (await this.load(ownerDid)).find(candidate => candidate.id === String(messageId))
    return record === undefined ? undefined : message(record)
  }

  public append(
    ownerDid: AwikiDid,
    request: AwikiMailSendRequest,
    result: AwikiMailSendResult,
    account?: AwikiMailAccount,
  ): Promise<void> {
    const normalized = mailSendRequest(request)
    const record: StoredSentMail = {
      id: `${LOCAL_SENT_MAIL_ID_PREFIX}${randomUUID()}`,
      ...result.messageId === undefined ? {} : { serviceMessageId: String(result.messageId) },
      ...account?.mailboxAddress === undefined ? {} : { from: account.mailboxAddress },
      to: [...normalized.to],
      cc: [...normalized.cc ?? []],
      subject: normalized.subject,
      bodyText: normalized.bodyText,
      sentAt: new Date().toISOString(),
    }
    const append = async () => {
      const records = await this.load(ownerDid)
      await this.write(ownerDid, [record, ...records].slice(0, MAX_RECORDS))
    }
    const pending = this.mutation.then(append, append)
    this.mutation = pending.catch(() => undefined)
    return pending
  }

  public async clear(): Promise<void> {
    await this.mutation
    try {
      if (!(await this.hasDirectory(this.hostDirectory))) return
      const metadata = await lstat(this.directory)
      if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
        await unlink(this.directory)
        return
      }
      await rm(this.directory, { recursive: true, force: true })
    } catch (error) {
      if (!isMissing(error)) throw error
    }
  }

  private async load(ownerDid: AwikiDid): Promise<StoredSentMail[]> {
    if (!(await this.hasDirectory(this.hostDirectory)) || !(await this.hasDirectory(this.directory))) return []
    const path = this.path(ownerDid)
    let text: string
    try {
      const metadata = await lstat(path)
      if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > MAX_STORE_BYTES) invalidState()
      text = await readFile(path, 'utf8')
    } catch (error) {
      if (isMissing(error)) return []
      throw error
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      invalidState()
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) invalidState()
    const value = parsed as Partial<SentMailFile>
    if (value.version !== STORE_VERSION
      || value.ownerDid !== String(ownerDid)
      || !Array.isArray(value.records)
      || value.records.length > MAX_RECORDS) invalidState()
    return value.records.map(decodeRecord)
  }

  private async write(ownerDid: AwikiDid, records: readonly StoredSentMail[]): Promise<void> {
    await this.ensureDirectory()
    const path = this.path(ownerDid)
    const temporary = join(this.directory, `.${this.key(ownerDid)}.${randomUUID()}.tmp`)
    const payload: SentMailFile = { version: STORE_VERSION, ownerDid: String(ownerDid), records }
    const text = JSON.stringify(payload)
    if (Buffer.byteLength(text, 'utf8') > MAX_STORE_BYTES) invalidState()
    try {
      await writeFile(temporary, text, { flag: 'wx', mode: 0o600 })
      await rename(temporary, path)
      await chmod(path, 0o600)
    } finally {
      await unlink(temporary).catch(() => undefined)
    }
  }

  private async ensureDirectory(): Promise<void> {
    await mkdir(this.hostDirectory, { recursive: true, mode: 0o700 })
    if (!(await this.hasDirectory(this.hostDirectory))) invalidState()
    await chmod(this.hostDirectory, 0o700)
    await mkdir(this.directory, { mode: 0o700 }).catch((error) => {
      if (!isFileExists(error)) throw error
    })
    if (!(await this.hasDirectory(this.directory))) invalidState()
    await chmod(this.directory, 0o700)
  }

  private async hasDirectory(path: string): Promise<boolean> {
    try {
      const metadata = await lstat(path)
      if (!metadata.isDirectory() || metadata.isSymbolicLink()) invalidState()
      return true
    } catch (error) {
      if (isMissing(error)) return false
      throw error
    }
  }

  private path(ownerDid: AwikiDid): string {
    return join(this.directory, `${this.key(ownerDid)}.json`)
  }

  private key(ownerDid: AwikiDid): string {
    return createHash('sha256').update(String(ownerDid)).digest('hex')
  }
}
