import { chmod, lstat, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import { join } from 'node:path'

const STATE_VERSION = 2
const MAX_STATE_BYTES = 1024 * 1024
const MAX_CONVERSATIONS = 1_000

/** Durable routing state for one authorized AWiki direct conversation. */
export interface AwikiListenerConversationState {
  readonly peerDid: string
  readonly sessionId?: string
  readonly lastProcessedMessageId?: string
}

/** Host-private listener state. Message content and Agent output are never stored here. */
export interface AwikiListenerState {
  readonly version: 2
  readonly identityScopeHash: string
  readonly conversations: Record<string, AwikiListenerConversationState>
}

function emptyState(identityScopeHash: string): AwikiListenerState {
  return { version: STATE_VERSION, identityScopeHash, conversations: {} }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function boundedString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2_048) {
    throw new TypeError(`awiki: listener state ${field} is invalid`)
  }
  return value
}

/** Validate and detach the complete state file before the listener trusts any route. */
function parseState(value: unknown, identityScopeHash: string): AwikiListenerState {
  if (isRecord(value) && value.version === 1) return emptyState(identityScopeHash)
  if (isRecord(value)
    && value.version === STATE_VERSION
    && typeof value.identityScopeHash === 'string'
    && value.identityScopeHash !== identityScopeHash) return emptyState(identityScopeHash)
  if (!isRecord(value)
    || value.version !== STATE_VERSION
    || value.identityScopeHash !== identityScopeHash
    || !isRecord(value.conversations)) {
    throw new TypeError('awiki: listener state is invalid')
  }
  const entries = Object.entries(value.conversations)
  if (entries.length > MAX_CONVERSATIONS) throw new TypeError('awiki: listener state is too large')
  const conversations: Record<string, AwikiListenerConversationState> = {}
  for (const [conversationId, raw] of entries) {
    const id = boundedString(conversationId, 'conversation id')
    if (!isRecord(raw)) throw new TypeError('awiki: listener conversation state is invalid')
    const keys = Object.keys(raw)
    if (keys.some(key => !['peerDid', 'sessionId', 'lastProcessedMessageId'].includes(key))) {
      throw new TypeError('awiki: listener conversation state is invalid')
    }
    const peerDid = boundedString(raw.peerDid, 'peer DID')
    const sessionId = raw.sessionId === undefined
      ? undefined
      : boundedString(raw.sessionId, 'session id')
    const lastProcessedMessageId = raw.lastProcessedMessageId === undefined
      ? undefined
      : boundedString(raw.lastProcessedMessageId, 'message id')
    conversations[id] = {
      peerDid,
      ...(sessionId === undefined ? {} : { sessionId }),
      ...(lastProcessedMessageId === undefined ? {} : { lastProcessedMessageId }),
    }
  }
  return { version: STATE_VERSION, identityScopeHash, conversations }
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT'
}

/** Atomic, owner-only persistence for conversation-to-DSH-session routes. */
export class AwikiListenerStateStore {
  private readonly hostDirectory: string
  private readonly statePath: string
  public readonly identityScopeHash: string

  public constructor(stateRoot: string, identityScope: string) {
    if (identityScope.length === 0 || identityScope.length > 2_048) {
      throw new TypeError('awiki: listener identity scope is invalid')
    }
    this.identityScopeHash = createHash('sha256').update(identityScope).digest('hex')
    this.hostDirectory = join(stateRoot, '.host')
    this.statePath = join(this.hostDirectory, 'listener-state.json')
  }

  /** Load the current identity scope or reset unscoped v1 state on first use. */
  public async load(): Promise<AwikiListenerState> {
    if (!(await this.hasPrivateHostDirectory())) return emptyState(this.identityScopeHash)
    try {
      const metadata = await lstat(this.statePath)
      if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > MAX_STATE_BYTES) {
        throw new TypeError('awiki: listener state file is invalid')
      }
      const text = await readFile(this.statePath, 'utf8')
      if (Buffer.byteLength(text, 'utf8') > MAX_STATE_BYTES) {
        throw new TypeError('awiki: listener state file is invalid')
      }
      return parseState(JSON.parse(text) as unknown, this.identityScopeHash)
    } catch (error) {
      if (isMissing(error)) return emptyState(this.identityScopeHash)
      if (error instanceof SyntaxError) throw new TypeError('awiki: listener state file is invalid')
      throw error
    }
  }

  /** Replace the state atomically without ever writing message or Agent text. */
  public async save(state: AwikiListenerState): Promise<void> {
    const snapshot = parseState(state, this.identityScopeHash)
    const text = `${JSON.stringify(snapshot)}\n`
    if (Buffer.byteLength(text, 'utf8') > MAX_STATE_BYTES) {
      throw new TypeError('awiki: listener state file is too large')
    }
    await mkdir(this.hostDirectory, { recursive: true, mode: 0o700 })
    await this.hasPrivateHostDirectory()
    await chmod(this.hostDirectory, 0o700)
    const temporaryPath = join(this.hostDirectory, `.listener-state-${process.pid}-${randomUUID()}.tmp`)
    try {
      await writeFile(temporaryPath, text, { flag: 'wx', mode: 0o600 })
      await chmod(temporaryPath, 0o600)
      await rename(temporaryPath, this.statePath)
      await chmod(this.statePath, 0o600)
    } finally {
      await unlink(temporaryPath).catch((error: unknown) => {
        if (!isMissing(error)) throw error
      })
    }
  }

  private async hasPrivateHostDirectory(): Promise<boolean> {
    try {
      const directory = await lstat(this.hostDirectory)
      if (!directory.isDirectory() || directory.isSymbolicLink()) {
        throw new TypeError('awiki: local session directory is invalid')
      }
      return true
    } catch (error) {
      if (isMissing(error)) return false
      throw error
    }
  }
}
