/** Private, owner-bound persistence for mail successfully sent by this installation. */

import { createHash, randomUUID } from 'node:crypto'
import { chmod, lstat, mkdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { mailAttachmentContentType, mailAttachmentFileName, mailSendRequest } from './mail.ts'
import type { AwikiValidatedMailSendRequest } from './mail.ts'
import type {
  AwikiDid,
  AwikiMailAccount,
  AwikiMailInboxPage,
  AwikiMailInboxRequest,
  AwikiMailMessage,
  AwikiMailMessageId,
  AwikiMailSendResult,
} from './types.ts'

const STORE_VERSION = 2
const STORE_DIRECTORY = 'sent-mail-v2'
const LEGACY_STORE_VERSION = 1
const LEGACY_STORE_DIRECTORY = 'sent-mail-v1'
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
  readonly attachments: readonly StoredSentMailAttachment[]
  readonly warnings: readonly string[]
}

interface StoredSentMailAttachment {
  readonly index: number
  readonly fileName: string
  readonly contentType: string
  readonly sizeBytes: number
  readonly sha256: string
}

interface LegacyStoredSentMail {
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

interface LegacySentMailFile {
  readonly version: typeof LEGACY_STORE_VERSION
  readonly ownerDid: string
  readonly records: readonly LegacyStoredSentMail[]
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

function decodeSharedRecord(input: unknown): {
  readonly id: string
  readonly serviceMessageId?: string
  readonly from?: string
  readonly to: readonly string[]
  readonly cc: readonly string[]
  readonly subject: string
  readonly bodyText: string
  readonly sentAt: string
} {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) invalidState()
  const value = input as Partial<LegacyStoredSentMail>
  if (typeof value.id !== 'string'
    || !/^awiki-sent-v1:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value.id)
    || (value.serviceMessageId !== undefined && !validToken(value.serviceMessageId, 2_048))
    || (value.from !== undefined && !validAddress(value.from))
    || typeof value.sentAt !== 'string'
    || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value.sentAt)
    || !Number.isFinite(Date.parse(value.sentAt))) invalidState()
  let request: AwikiValidatedMailSendRequest
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

function validMailFileName(value: unknown): value is string {
  try {
    return mailAttachmentFileName(value) === value
  } catch {
    return false
  }
}

function validMailContentType(value: unknown): value is string {
  try {
    return value !== '' && mailAttachmentContentType(value) === value
  } catch {
    return false
  }
}

function decodeAttachment(input: unknown): StoredSentMailAttachment {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) invalidState()
  const value = input as Partial<StoredSentMailAttachment>
  if (!Number.isSafeInteger(value.index)
    || (value.index as number) < 0
    || (value.index as number) > 9
    || !validMailFileName(value.fileName)
    || !validMailContentType(value.contentType)
    || !Number.isSafeInteger(value.sizeBytes)
    || (value.sizeBytes as number) < 0
    || (value.sizeBytes as number) > 10 * 1024 * 1024
    || typeof value.sha256 !== 'string'
    || !/^[a-f0-9]{64}$/u.test(value.sha256)) invalidState()
  return {
    index: value.index as number,
    fileName: value.fileName,
    contentType: value.contentType,
    sizeBytes: value.sizeBytes as number,
    sha256: value.sha256,
  }
}

function decodeRecord(input: unknown): StoredSentMail {
  const shared = decodeSharedRecord(input)
  const value = input as Partial<StoredSentMail>
  if (!Array.isArray(value.attachments)
    || value.attachments.length > 10
    || !Array.isArray(value.warnings)
    || value.warnings.length > 100) invalidState()
  const attachments = value.attachments.map(decodeAttachment)
  if (new Set(attachments.map(attachment => attachment.index)).size !== attachments.length) invalidState()
  const warnings = value.warnings.map((warning) => {
    if (typeof warning !== 'string' || Buffer.byteLength(warning, 'utf8') > 1_024 || warning.includes('\0')) invalidState()
    return warning
  })
  return { ...shared, attachments, warnings }
}

function decodeLegacyRecord(input: unknown): StoredSentMail {
  return { ...decodeSharedRecord(input), attachments: [], warnings: [] }
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
      hasAttachments: record.attachments.length > 0,
      attachmentCount: record.attachments.length,
    },
    bodyText: record.bodyText,
    bodyTruncated: false,
    hasHtmlBody: false,
    attachments: record.attachments.map(attachment => ({
      index: attachment.index,
      fileName: attachment.fileName,
      contentType: attachment.contentType,
      sizeBytes: String(attachment.sizeBytes),
    })),
  }
}

export function isLocalSentMailId(messageId: AwikiMailMessageId): boolean {
  return String(messageId).startsWith(LOCAL_SENT_MAIL_ID_PREFIX)
}

/** Atomic, bounded history of sends accepted by the Mail Service. */
export class AwikiSentMailStore {
  private readonly hostDirectory: string
  private readonly directory: string
  private readonly legacyDirectory: string
  private mutation: Promise<void> = Promise.resolve()

  public constructor(stateRoot: string) {
    this.hostDirectory = join(stateRoot, '.host')
    this.directory = join(this.hostDirectory, STORE_DIRECTORY)
    this.legacyDirectory = join(this.hostDirectory, LEGACY_STORE_DIRECTORY)
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
    request: AwikiValidatedMailSendRequest,
    result: AwikiMailSendResult,
    account?: AwikiMailAccount,
  ): Promise<void> {
    if (!result.accepted) return Promise.resolve()
    const record: StoredSentMail = {
      id: `${LOCAL_SENT_MAIL_ID_PREFIX}${randomUUID()}`,
      ...result.messageId === undefined ? {} : { serviceMessageId: String(result.messageId) },
      ...account?.mailboxAddress === undefined ? {} : { from: account.mailboxAddress },
      to: [...request.to],
      cc: [...request.cc],
      subject: request.subject,
      bodyText: request.bodyText,
      sentAt: new Date().toISOString(),
      attachments: request.attachments.map((attachment, index) => ({
        index,
        fileName: attachment.fileName,
        contentType: attachment.contentType,
        sizeBytes: attachment.sizeBytes,
        sha256: attachment.sha256,
      })),
      warnings: [...result.warnings],
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
    await this.clearDirectory(this.directory)
    await this.clearDirectory(this.legacyDirectory)
  }

  public async resolveAttachment(
    ownerDid: AwikiDid,
    messageId: AwikiMailMessageId,
    attachmentIndex: number,
  ): Promise<AwikiMailMessageId | undefined> {
    if (!isLocalSentMailId(messageId)) return messageId
    const record = (await this.load(ownerDid)).find(candidate => candidate.id === String(messageId))
    if (record?.serviceMessageId === undefined
      || !record.attachments.some(attachment => attachment.index === attachmentIndex)) return undefined
    return record.serviceMessageId as AwikiMailMessageId
  }

  private async clearDirectory(directory: string): Promise<void> {
    try {
      if (!(await this.hasDirectory(this.hostDirectory))) return
      const metadata = await lstat(directory)
      if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
        await unlink(directory)
        return
      }
      await rm(directory, { recursive: true, force: true })
    } catch (error) {
      if (!isMissing(error)) throw error
    }
  }

  private async load(ownerDid: AwikiDid): Promise<StoredSentMail[]> {
    if (!(await this.hasDirectory(this.hostDirectory))) return []
    const current = await this.loadFile(ownerDid, this.directory, STORE_VERSION, decodeRecord)
    if (current !== undefined) return current
    return await this.loadFile(ownerDid, this.legacyDirectory, LEGACY_STORE_VERSION, decodeLegacyRecord) ?? []
  }

  private async loadFile(
    ownerDid: AwikiDid,
    directory: string,
    version: number,
    decode: (input: unknown) => StoredSentMail,
  ): Promise<StoredSentMail[] | undefined> {
    if (!(await this.hasDirectory(directory))) return undefined
    const path = this.path(ownerDid, directory)
    let text: string
    try {
      const metadata = await lstat(path)
      if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > MAX_STORE_BYTES) invalidState()
      text = await readFile(path, 'utf8')
    } catch (error) {
      if (isMissing(error)) return undefined
      throw error
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      invalidState()
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) invalidState()
    const value = parsed as Partial<SentMailFile | LegacySentMailFile>
    if (value.version !== version
      || value.ownerDid !== String(ownerDid)
      || !Array.isArray(value.records)
      || value.records.length > MAX_RECORDS) invalidState()
    const records = value.records.map(decode)
    if (new Set(records.map(record => record.id)).size !== records.length) invalidState()
    return records
  }

  private async write(ownerDid: AwikiDid, records: readonly StoredSentMail[]): Promise<void> {
    await this.ensureDirectory()
    const path = this.path(ownerDid, this.directory)
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

  private path(ownerDid: AwikiDid, directory: string): string {
    return join(directory, `${this.key(ownerDid)}.json`)
  }

  private key(ownerDid: AwikiDid): string {
    return createHash('sha256').update(String(ownerDid)).digest('hex')
  }
}
