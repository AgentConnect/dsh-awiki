import { createHash, randomUUID } from 'node:crypto'
import { chmod, lstat, mkdir, readFile, rm, rename, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  AwikiConversation,
  AwikiConversationId,
  AwikiConversationPreferenceMutation,
  AwikiConversationPreferences,
  AwikiDid,
  AwikiHandle,
  AwikiHiddenConversationPreference,
} from './types.ts'

const STORE_VERSION = 1
const STORE_DIRECTORY = 'conversation-preferences'
const MAX_STORE_BYTES = 2 * 1024 * 1024
const MAX_HIDDEN_CONVERSATIONS = 500
const MAX_IDENTIFIER_CHARACTERS = 2_048
const MAX_TITLE_CHARACTERS = 1_024
const MAX_PREVIEW_CHARACTERS = 4_096
const MAX_HANDLE_CHARACTERS = 512
const MAX_RECOVERY_SIGNATURE_CHARACTERS = 128

interface PreferenceFile extends AwikiConversationPreferences {
  readonly version: 1
  readonly ownerDid: string
}

function invalidState(): never {
  throw new TypeError('awiki: conversation preferences are invalid')
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}

function isFileExists(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'EEXIST'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function boundedString(value: unknown, maximum: number): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum * 2) invalidState()
  if (Array.from(value).length > maximum) invalidState()
  return value
}

function optionalString(value: unknown, maximum: number): string | undefined {
  return value === undefined ? undefined : boundedString(value, maximum)
}

function optionalCount(value: unknown): number | undefined {
  if (value === undefined) return undefined
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 0xffff_ffff) invalidState()
  return value as number
}

function optionalTimestamp(value: unknown): number | undefined {
  if (value === undefined) return undefined
  if (!Number.isSafeInteger(value) || (value as number) < 0) invalidState()
  return value as number
}

/** Rebuild a bounded display-only snapshot before it reaches private persistence. */
function conversation(value: unknown): AwikiConversation {
  if (!isRecord(value)) invalidState()
  const kind = value.kind
  const id = boundedString(value.id, MAX_IDENTIFIER_CHARACTERS) as AwikiConversationId
  const title = boundedString(value.title, MAX_TITLE_CHARACTERS)
  const unreadCount = optionalCount(value.unreadCount)
  const lastMessageAt = optionalTimestamp(value.lastMessageAt)
  const lastMessagePreview = optionalString(value.lastMessagePreview, MAX_PREVIEW_CHARACTERS)
  const common = {
    id,
    title,
    ...(unreadCount === undefined ? {} : { unreadCount }),
    ...(lastMessageAt === undefined ? {} : { lastMessageAt }),
    ...(lastMessagePreview === undefined ? {} : { lastMessagePreview }),
  }
  if (kind === 'direct') {
    const peerDid = boundedString(value.peerDid, MAX_IDENTIFIER_CHARACTERS)
    if (!peerDid.startsWith('did:')) invalidState()
    const peerHandle = optionalString(value.peerHandle, MAX_HANDLE_CHARACTERS)
    const displayName = optionalString(value.displayName, MAX_TITLE_CHARACTERS)
    return {
      kind,
      ...common,
      peerDid: peerDid as AwikiDid,
      ...(peerHandle === undefined ? {} : { peerHandle: peerHandle as AwikiHandle }),
      ...(displayName === undefined ? {} : { displayName }),
    }
  }
  if (kind === 'group') {
    const groupDid = boundedString(value.groupDid, MAX_IDENTIFIER_CHARACTERS)
    if (!groupDid.startsWith('did:')) invalidState()
    return { kind, ...common, groupDid: groupDid as AwikiDid }
  }
  invalidState()
}

function hiddenPreference(value: unknown): AwikiHiddenConversationPreference {
  if (!isRecord(value) || !Number.isSafeInteger(value.hiddenAt) || (value.hiddenAt as number) < 0) invalidState()
  return { conversation: conversation(value.conversation), hiddenAt: value.hiddenAt as number }
}

function preferences(value: unknown, expectedOwnerDid: AwikiDid): PreferenceFile {
  if (!isRecord(value)
    || value.version !== STORE_VERSION
    || value.ownerDid !== String(expectedOwnerDid)
    || !Array.isArray(value.hiddenConversations)
    || value.hiddenConversations.length > MAX_HIDDEN_CONVERSATIONS) invalidState()
  const hiddenConversations = value.hiddenConversations.map(hiddenPreference)
  const seen = new Set<string>()
  for (const hidden of hiddenConversations) {
    if (seen.has(hidden.conversation.id)) invalidState()
    seen.add(hidden.conversation.id)
  }
  const dismissedGroupRecoverySignature = optionalString(
    value.dismissedGroupRecoverySignature,
    MAX_RECOVERY_SIGNATURE_CHARACTERS,
  )
  return {
    version: STORE_VERSION,
    ownerDid: String(expectedOwnerDid),
    hiddenConversations,
    ...(dismissedGroupRecoverySignature === undefined ? {} : { dismissedGroupRecoverySignature }),
  }
}

function publicPreferences(value: PreferenceFile): AwikiConversationPreferences {
  return {
    hiddenConversations: value.hiddenConversations.map(hidden => ({
      conversation: { ...hidden.conversation },
      hiddenAt: hidden.hiddenAt,
    })),
    ...(value.dismissedGroupRecoverySignature === undefined
      ? {}
      : { dismissedGroupRecoverySignature: value.dismissedGroupRecoverySignature }),
  }
}

function emptyPreferences(ownerDid: AwikiDid): PreferenceFile {
  return { version: STORE_VERSION, ownerDid: String(ownerDid), hiddenConversations: [] }
}

/** Validate one browser mutation before entering private Host persistence. */
export function normalizeConversationPreferenceMutation(
  value: unknown,
): AwikiConversationPreferenceMutation | undefined {
  try {
    if (!isRecord(value)) return undefined
    if (value.action === 'hide') return { action: 'hide', conversation: conversation(value.conversation) }
    if (value.action === 'restore') {
      return {
        action: 'restore',
        conversationId: boundedString(value.conversationId, MAX_IDENTIFIER_CHARACTERS) as AwikiConversationId,
      }
    }
    if (value.action === 'dismiss-group-recovery') {
      return {
        action: 'dismiss-group-recovery',
        signature: boundedString(value.signature, MAX_RECOVERY_SIGNATURE_CHARACTERS),
      }
    }
  } catch {
    return undefined
  }
  return undefined
}

/** Atomic identity-scoped product preferences, independent of Core membership and history. */
export class AwikiConversationPreferenceStore {
  private readonly hostDirectory: string
  private readonly directory: string
  private mutation: Promise<void> = Promise.resolve()

  public constructor(stateRoot: string) {
    this.hostDirectory = join(stateRoot, '.host')
    this.directory = join(this.hostDirectory, STORE_DIRECTORY)
  }

  public async get(ownerDid: AwikiDid): Promise<AwikiConversationPreferences> {
    await this.mutation
    return publicPreferences(await this.load(ownerDid))
  }

  public update(
    ownerDid: AwikiDid,
    request: AwikiConversationPreferenceMutation,
  ): Promise<AwikiConversationPreferences> {
    const mutate = async (): Promise<AwikiConversationPreferences> => {
      const normalized = normalizeConversationPreferenceMutation(request)
      if (normalized === undefined) invalidState()
      const current = await this.load(ownerDid)
      let next: PreferenceFile
      switch (normalized.action) {
        case 'hide': {
          const snapshot = normalized.conversation
          const hidden = current.hiddenConversations.filter(item => item.conversation.id !== snapshot.id)
          hidden.unshift({ conversation: snapshot, hiddenAt: Date.now() })
          next = { ...current, hiddenConversations: hidden.slice(0, MAX_HIDDEN_CONVERSATIONS) }
          break
        }
        case 'restore': {
          const conversationId = normalized.conversationId
          next = {
            ...current,
            hiddenConversations: current.hiddenConversations.filter(item => item.conversation.id !== conversationId),
          }
          break
        }
        case 'dismiss-group-recovery': {
          const signature = normalized.signature
          next = { ...current, dismissedGroupRecoverySignature: signature }
          break
        }
        default:
          invalidState()
      }
      await this.write(ownerDid, next)
      return publicPreferences(next)
    }
    const pending = this.mutation.then(mutate, mutate)
    this.mutation = pending.then(() => undefined, () => undefined)
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

  private async load(ownerDid: AwikiDid): Promise<PreferenceFile> {
    if (!(await this.hasDirectory(this.hostDirectory)) || !(await this.hasDirectory(this.directory))) {
      return emptyPreferences(ownerDid)
    }
    const path = this.path(ownerDid)
    try {
      const metadata = await lstat(path)
      if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > MAX_STORE_BYTES) invalidState()
      const text = await readFile(path, 'utf8')
      if (Buffer.byteLength(text, 'utf8') > MAX_STORE_BYTES) invalidState()
      return preferences(JSON.parse(text) as unknown, ownerDid)
    } catch (error) {
      if (isMissing(error)) return emptyPreferences(ownerDid)
      if (error instanceof SyntaxError) invalidState()
      throw error
    }
  }

  private async write(ownerDid: AwikiDid, value: PreferenceFile): Promise<void> {
    const snapshot = preferences(value, ownerDid)
    const text = `${JSON.stringify(snapshot)}\n`
    if (Buffer.byteLength(text, 'utf8') > MAX_STORE_BYTES) invalidState()
    await this.ensureDirectory()
    const path = this.path(ownerDid)
    const temporary = join(this.directory, `.${this.key(ownerDid)}.${randomUUID()}.tmp`)
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
