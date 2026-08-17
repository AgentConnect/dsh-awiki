/** Unified AWiki identity, messaging, attachment, Remote, and model-tool service. */

import { Context } from '@deepseek-ai/cordis'
import { homedir } from 'node:os'
import { join } from 'node:path'
import z from '@deepseek-ai/schemastery'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import type {
  AwikiClearLocalDataRequest,
  AwikiClearLocalDataResult,
  AwikiConversation,
  AwikiDownloadAttachmentRequest,
  AwikiDownloadedAttachment,
  AwikiFailure,
  AwikiFailureCode,
  AwikiHistoryRequest,
  AwikiHostClient,
  AwikiIdentity,
  AwikiLogoutRequest,
  AwikiMessage,
  AwikiMarkConversationReadRequest,
  AwikiPage,
  AwikiPageRequest,
  AwikiRegistrationOtpRequest,
  AwikiRegistrationOtpResult,
  AwikiRegistrationRequest,
  AwikiResolvePeerRequest,
  AwikiResolvedPeer,
  AwikiResult,
  AwikiRuntimeConfig,
  AwikiSession,
  AwikiSendAttachmentRequest,
  AwikiSendTextRequest,
  AwikiUpdateDisplayNameRequest,
} from './types.ts'
import { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION, AWIKI_LOGOUT_CONFIRMATION } from './types.ts'
import type { AwikiClientFactory, AwikiClientOptions, AwikiSdkClient } from './provider-api.ts'
import { downloadedAttachment } from './sdk-adapter.ts'
import { registerAwikiTools } from './tools.ts'
import {
  AwikiSettingsSchema,
  validateAwikiSettings,
} from './settings.ts'
import { AWIKI_SETTINGS_NAMESPACE, DEFAULT_AWIKI_DOMAIN, normalizeAwikiDomain } from './domain.ts'
import { AwikiSessionStore } from './session.ts'

export type * from './types.ts'
export { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION, AWIKI_LOGOUT_CONFIRMATION } from './types.ts'
export type { AwikiClientFactory, AwikiClientOptions, AwikiSdkClient } from './provider-api.ts'
export {
  AWIKI_DOMAIN_FIELD,
  AWIKI_SETTINGS_NAMESPACE,
  AwikiSettingsSchema,
  DEFAULT_AWIKI_DOMAIN,
  normalizeAwikiDomain,
  validateAwikiSettings,
  type AwikiSettings,
} from './settings.ts'
export {
  AWIKI_HISTORY_TOOL,
  AWIKI_IDENTITY_STATUS_TOOL,
  AWIKI_LIST_CONVERSATIONS_TOOL,
  AWIKI_SEND_ATTACHMENT_TOOL,
  AWIKI_SEND_MESSAGE_TOOL,
} from './tools.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    awiki: AwikiService
  }
}

/** Default maximum attachment size: 10 MiB. */
export const DEFAULT_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
/** Default browser polling interval while the AWiki drawer is open. */
export const DEFAULT_POLL_INTERVAL_MS = 3_000
/** Default AWiki production service origin. */
export const DEFAULT_AWIKI_SERVICE_URL = 'https://awiki.ai'
/** Default authoritative AWiki message-service DID. */
export const DEFAULT_AWIKI_MESSAGE_SERVICE_DID = 'did:wba:awiki.ai'

/** Host deployment configuration. */
export interface Config {
  /** AWiki user-service base URL. Production deployments require HTTPS. */
  readonly userServiceUrl?: string
  /** Handle provider domain used by Legacy registration. */
  readonly userServiceDomain?: string
  /** AWiki message-service base URL. Production deployments require HTTPS. */
  readonly messageServiceUrl?: string
  /** Public message-service base URL published in the identity DID document. */
  readonly messageServicePublicUrl?: string
  /** Authoritative DID of the configured message service. */
  readonly messageServiceDid?: string
  /** Exact HTTPS origins allowed for discovered attachment object URLs. Defaults to the public message-service origin. */
  readonly allowedAttachmentOrigins?: string[]
  /** Permit loopback HTTP only for local tests. Defaults to false. */
  readonly allowInsecureLoopbackForTesting?: boolean
  /** Rust IM Core root for identity, SQLite, cache, and compatibility state. */
  readonly stateRoot?: string
  /** Complete decoded attachment byte limit. Defaults to 10 MiB. */
  readonly attachmentMaxBytes?: number
  /** Browser history polling interval while its drawer is open. Defaults to 3000 ms. */
  readonly pollIntervalMs?: number
}

/** Loader schema for the Host deployment configuration. */
export const Config: z<Config> = z.object({
  userServiceUrl: z.string().default(DEFAULT_AWIKI_SERVICE_URL),
  userServiceDomain: z.string().default(DEFAULT_AWIKI_DOMAIN),
  messageServiceUrl: z.string().default(DEFAULT_AWIKI_SERVICE_URL),
  messageServicePublicUrl: z.string().default(DEFAULT_AWIKI_SERVICE_URL),
  messageServiceDid: z.string().default(DEFAULT_AWIKI_MESSAGE_SERVICE_DID),
  allowedAttachmentOrigins: z.array(z.string()).default([]),
  allowInsecureLoopbackForTesting: z.boolean().default(false),
  stateRoot: z.string(),
  attachmentMaxBytes: z.number().default(DEFAULT_ATTACHMENT_MAX_BYTES),
  pollIntervalMs: z.number().default(DEFAULT_POLL_INTERVAL_MS),
})

interface ResolvedConfig extends AwikiClientOptions, AwikiRuntimeConfig {
  readonly attachmentMaxBytes: number
}

const FAILURE_CODES = new Set<AwikiFailureCode>([
  'not-registered',
  'signed-out',
  'already-registered',
  'invalid-request',
  'invalid-otp',
  'challenge-expired',
  'handle-unavailable',
  'not-found',
  'forbidden',
  'conflict',
  'rate-limited',
  'attachment-too-large',
  'network',
  'remote',
])

const FAILURE_MESSAGES: Record<AwikiFailureCode, string> = {
  'not-registered': 'No AWiki identity is registered for this deployment.',
  'signed-out': 'This installation is signed out of AWiki.',
  'already-registered': 'This deployment already has an AWiki identity.',
  'invalid-request': 'The AWiki request is invalid.',
  'invalid-otp': 'The AWiki verification code is invalid.',
  'challenge-expired': 'The AWiki verification challenge expired.',
  'handle-unavailable': 'The requested AWiki handle is unavailable.',
  'not-found': 'The requested AWiki resource was not found.',
  'forbidden': 'The AWiki operation is not permitted.',
  'conflict': 'The AWiki operation conflicts with current state.',
  'rate-limited': 'The AWiki service rate-limited the request.',
  'attachment-too-large': 'The attachment exceeds this deployment\'s size limit.',
  'network': 'The AWiki service could not be reached.',
  'remote': 'The AWiki service rejected the operation.',
}

class ProviderUnavailableError extends Error {}

/** Validate and preserve one SDK service URL without accepting insecure remote HTTP. */
function serviceUrl(field: string, raw: string, allowInsecureLoopbackForTesting: boolean): string {
  let url: URL
  try {
    url = new URL(raw)
  } catch (cause) {
    throw new TypeError(`awiki: ${field} must be an absolute HTTP(S) URL`, { cause })
  }
  const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]'
  if (url.protocol !== 'https:' && !(allowInsecureLoopbackForTesting && url.protocol === 'http:' && loopback)) {
    throw new TypeError(`awiki: ${field} must use HTTPS unless test-only loopback HTTP is enabled`)
  }
  if (url.username !== '' || url.password !== '' || url.hash !== '') {
    throw new TypeError(`awiki: ${field} must not contain credentials or a URL fragment`)
  }
  return raw
}

/** Validate a provider domain without inferring it from an API endpoint. */
function serviceDomain(raw: string, field = 'userServiceDomain'): string {
  return normalizeAwikiDomain(raw, field)
}

/** Validate an explicit DID used as the message-service authority. */
function serviceDid(raw: string): string {
  const value = raw.trim()
  if (!value.startsWith('did:wba:') || value !== `did:wba:${serviceDomain(value.slice('did:wba:'.length), 'messageServiceDid')}`) {
    throw new TypeError('awiki: messageServiceDid must be a bare-domain did:wba DID')
  }
  return value
}

/** Resolve an exact attachment origin allowlist without accepting paths or credentials. */
function attachmentOrigins(
  raw: readonly string[] | undefined,
  messageServicePublicUrl: string,
  allowInsecureLoopbackForTesting: boolean,
): readonly string[] {
  const values = raw === undefined || raw.length === 0 ? [new URL(messageServicePublicUrl).origin] : raw
  const origins = values.map((value) => {
    const normalized = serviceUrl('allowedAttachmentOrigins entry', value, allowInsecureLoopbackForTesting)
    const url = new URL(normalized)
    if (url.origin !== normalized || url.pathname !== '/' || url.search !== '') {
      throw new TypeError('awiki: each allowedAttachmentOrigins entry must be an exact origin without a path or query')
    }
    return url.origin
  })
  if (new Set(origins).size !== origins.length) {
    throw new TypeError('awiki: allowedAttachmentOrigins must not contain duplicates')
  }
  return origins
}

/** Resolve and validate every deployment choice before publishing the service. */
function resolveConfig(config: Config): ResolvedConfig {
  const allowInsecureLoopbackForTesting = config.allowInsecureLoopbackForTesting ?? false
  const configuredStateRoot = config.stateRoot?.trim()
  const configuredDshHome = process.env.DSH_HOME?.trim()
  const stateRoot = configuredStateRoot === undefined || configuredStateRoot.length === 0
    ? join(configuredDshHome === undefined || configuredDshHome.length === 0 ? join(homedir(), '.dsh') : configuredDshHome, 'awiki', 'im-core')
    : configuredStateRoot
  if (stateRoot.length === 0) throw new TypeError('awiki: stateRoot must be non-empty')
  const attachmentMaxBytes = config.attachmentMaxBytes ?? DEFAULT_ATTACHMENT_MAX_BYTES
  if (!Number.isSafeInteger(attachmentMaxBytes) || attachmentMaxBytes < 1) {
    throw new TypeError('awiki: attachmentMaxBytes must be a positive safe integer')
  }
  const pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS
  if (!Number.isSafeInteger(pollIntervalMs) || pollIntervalMs < 1_000 || pollIntervalMs > 60_000) {
    throw new TypeError('awiki: pollIntervalMs must be a safe integer from 1000 through 60000')
  }
  const userServiceUrl = serviceUrl('userServiceUrl', config.userServiceUrl ?? DEFAULT_AWIKI_SERVICE_URL, allowInsecureLoopbackForTesting)
  const messageServiceUrl = serviceUrl('messageServiceUrl', config.messageServiceUrl ?? DEFAULT_AWIKI_SERVICE_URL, allowInsecureLoopbackForTesting)
  const messageServicePublicUrl = serviceUrl('messageServicePublicUrl', config.messageServicePublicUrl ?? DEFAULT_AWIKI_SERVICE_URL, allowInsecureLoopbackForTesting)
  return {
    userServiceUrl,
    userServiceDomain: serviceDomain(config.userServiceDomain ?? DEFAULT_AWIKI_DOMAIN),
    messageServiceUrl,
    messageServicePublicUrl,
    messageServiceDid: serviceDid(config.messageServiceDid ?? DEFAULT_AWIKI_MESSAGE_SERVICE_DID),
    allowedAttachmentOrigins: attachmentOrigins(config.allowedAttachmentOrigins, messageServicePublicUrl, allowInsecureLoopbackForTesting),
    allowInsecureLoopbackForTesting,
    stateRoot,
    attachmentMaxBytes,
    pollIntervalMs,
  }
}

/** Return a public, fixed-message failure without retaining a thrown value. */
function failure(code: AwikiFailureCode): AwikiFailure {
  return { code, message: FAILURE_MESSAGES[code] }
}

/** Normalize SDK and provider failures without returning remote bodies, credentials, or causes. */
function normalizeFailure(error: unknown): AwikiFailure {
  if (error instanceof ProviderUnavailableError) {
    return { code: 'remote', message: 'AWiki client provider is unavailable.' }
  }
  try {
    if (typeof error === 'object' && error !== null) {
      const sdkFailure = error as { readonly name?: unknown; readonly code?: unknown }
      const name = sdkFailure.name
      const code = sdkFailure.code
      if ((name === 'AwikiImError' || name === 'AwikiSdkError') && typeof code === 'string' && FAILURE_CODES.has(code as AwikiFailureCode)) {
        return failure(code as AwikiFailureCode)
      }
    }
  } catch {
    // Provider errors cross the external SDK boundary. Hostile property access
    // is indistinguishable from an unknown remote failure and exposes nothing.
  }
  return failure('remote')
}

/** Decode canonical standard Base64 after enforcing its complete decoded-byte cap. */
function decodeAttachment(bytesBase64: string, maxBytes: number): AwikiResult<Uint8Array> {
  const maxEncoded = Math.ceil(maxBytes / 3) * 4
  if (bytesBase64.length > maxEncoded) return { ok: false, error: failure('attachment-too-large') }
  if (bytesBase64.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(bytesBase64)) {
    return { ok: false, error: failure('invalid-request') }
  }
  const bytes = Uint8Array.from(Buffer.from(bytesBase64, 'base64'))
  if (bytes.byteLength > maxBytes) return { ok: false, error: failure('attachment-too-large') }
  if (Buffer.from(bytes).toString('base64') !== bytesBase64) return { ok: false, error: failure('invalid-request') }
  return { ok: true, value: bytes }
}

/** Deployment-wide AWiki service over one replaceable high-level client provider. */
export class AwikiService extends TypertRemoteService implements AwikiHostClient {
  static inject = ['tools']
  static Config = Config

  private readonly resolved: ResolvedConfig
  private readonly sessionStore: AwikiSessionStore
  private startupUserServiceDomain: string
  private provider: { readonly client: AwikiSdkClient; disposal?: Promise<void> } | undefined
  private signedOut: boolean | undefined
  private sessionMutation: Promise<void> = Promise.resolve()

  /**
   * @param ctx - owning Host context.
   * @param config - service endpoints, SDK state path, and public limits.
   */
  constructor(ctx: Context, config: Config) {
    super(ctx, 'awiki')
    this.resolved = resolveConfig(config)
    this.sessionStore = new AwikiSessionStore(this.resolved.stateRoot)
    this.startupUserServiceDomain = this.resolved.userServiceDomain
    ctx.inject(['settings'], (settingsCtx) => {
      const settingsScope = settingsCtx.settings.register(
        settingsNamespace(AWIKI_SETTINGS_NAMESPACE),
        AwikiSettingsSchema,
        {
          base: { domain: this.resolved.userServiceDomain },
          applies: 'restart',
          validate: validateAwikiSettings,
        },
      )
      this.startupUserServiceDomain = settingsScope.get().domain
      settingsCtx.effect(() => () => {
        this.startupUserServiceDomain = this.resolved.userServiceDomain
      }, 'awiki: release settings namespace')
    })
    registerAwikiTools(ctx, this)
    ctx.effect(() => async () => {
      const provider = this.provider
      if (provider !== undefined) await this.disposeProvider(provider)
    }, 'awiki: dispose current client provider')
  }

  /**
   * Register the deployment's sole client factory. The caller must return the
   * resulting disposer from its own `ctx.effect`; disposal clears the slot
   * before awaiting the client's quiescence and is idempotent.
   * @param factory - synchronous factory for one owned high-level client.
   * @returns asynchronous disposer for the exact registered client.
   */
  registerClientFactory(factory: AwikiClientFactory): () => Promise<void> {
    if (this.provider !== undefined) throw new Error('awiki: a client provider is already registered')
    const client = factory({
      userServiceUrl: this.resolved.userServiceUrl,
      userServiceDomain: this.startupUserServiceDomain,
      messageServiceUrl: this.resolved.messageServiceUrl,
      messageServicePublicUrl: this.resolved.messageServicePublicUrl,
      messageServiceDid: this.resolved.messageServiceDid,
      allowedAttachmentOrigins: this.resolved.allowedAttachmentOrigins,
      attachmentMaxBytes: this.resolved.attachmentMaxBytes,
      allowInsecureLoopbackForTesting: this.resolved.allowInsecureLoopbackForTesting,
      stateRoot: this.resolved.stateRoot,
    })
    const provider = { client }
    this.provider = provider
    return () => this.disposeProvider(provider)
  }

  /**
   * Read settings needed by the browser presentation.
   * @returns Browser-safe polling configuration without SDK endpoints or state paths.
   */
  @Remote
  getConfig(): Promise<AwikiResult<AwikiRuntimeConfig>> {
    return Promise.resolve({
      ok: true,
      value: {
        pollIntervalMs: this.resolved.pollIntervalMs,
        attachmentMaxBytes: this.resolved.attachmentMaxBytes,
      },
    })
  }

  /**
   * Read the deployment's identity status.
   * @returns The public deployment identity or `null`.
   */
  @Remote
  getIdentity(): Promise<AwikiResult<AwikiIdentity | null>> {
    return this.run(client => client.getIdentity())
  }

  /** Return the local registration and sign-in state without exposing secrets. */
  @Remote
  async getSession(): Promise<AwikiResult<AwikiSession>> {
    if (await this.isSignedOut()) return { ok: true, value: { status: 'signed-out' } }
    const identity = await this.run(client => client.getIdentity(), { allowSignedOut: true })
    if (!identity.ok) return identity
    return identity.value === null
      ? { ok: true, value: { status: 'unregistered' } }
      : { ok: true, value: { status: 'active', identity: identity.value } }
  }

  /** Lock this installation while preserving the encrypted identity and local database. */
  @Remote
  logout(request: AwikiLogoutRequest): Promise<AwikiResult<AwikiSession>> {
    if (request?.confirmation !== AWIKI_LOGOUT_CONFIRMATION) {
      return Promise.resolve({ ok: false, error: failure('invalid-request') })
    }
    return this.mutateSession(async () => {
      if (await this.isSignedOut()) return { ok: true, value: { status: 'signed-out' } }
      const identity = await this.run(client => client.getIdentity(), { allowSignedOut: true })
      if (!identity.ok) return identity
      if (identity.value === null) return { ok: false, error: failure('not-registered') }
      try {
        await this.sessionStore.signOut()
        this.signedOut = true
        return { ok: true, value: { status: 'signed-out' } }
      } catch {
        return { ok: false, error: failure('remote') }
      }
    })
  }

  /** Resume the same locally preserved identity without registration. */
  @Remote
  login(): Promise<AwikiResult<AwikiSession>> {
    return this.mutateSession(async () => {
      const identity = await this.run(client => client.getIdentity(), { allowSignedOut: true })
      if (!identity.ok) return identity
      if (identity.value === null) return { ok: false, error: failure('not-registered') }
      try {
        await this.sessionStore.signIn()
        this.signedOut = false
        return { ok: true, value: { status: 'active', identity: identity.value } }
      } catch {
        return { ok: false, error: failure('remote') }
      }
    })
  }

  /**
   * Send one Legacy registration verification code.
   * @param request - Handle and phone used for the registration challenge.
   * @returns Public retry timing or a closed failure.
   */
  @Remote
  sendRegistrationOtp(request: AwikiRegistrationOtpRequest): Promise<AwikiResult<AwikiRegistrationOtpResult>> {
    return this.run(client => client.sendRegistrationOtp(request))
  }

  /**
   * Register and persist the deployment's only AWiki identity.
   * @param request - Handle, phone, and verification code for registration.
   * @returns The new public identity or a closed failure.
   */
  @Remote
  registerIdentity(request: AwikiRegistrationRequest): Promise<AwikiResult<AwikiIdentity>> {
    return this.run(client => client.registerIdentity(request))
  }

  /**
   * Update the deployment identity's public WNS display name.
   * @param request - replacement display name selected by the user.
   * @returns The updated public identity or a closed failure.
   */
  @Remote
  updateDisplayName(request: AwikiUpdateDisplayNameRequest): Promise<AwikiResult<AwikiIdentity>> {
    return this.run(client => client.updateDisplayName(request))
  }

  /**
   * Resolve one Handle or DID before the browser opens a direct chat.
   * @param request - typed Handle or DID.
   * @returns The public peer and conversation id, or a closed failure.
   */
  @Remote
  resolvePeer(request: AwikiResolvePeerRequest): Promise<AwikiResult<AwikiResolvedPeer>> {
    return this.run(client => client.resolvePeer(request.peer))
  }

  /**
   * List direct and existing group conversations.
   * @param request - Optional opaque cursor and page limit.
   * @returns One page of direct and existing group conversations.
   */
  @Remote
  listConversations(request?: AwikiPageRequest): Promise<AwikiResult<AwikiPage<AwikiConversation>>> {
    return this.run(client => client.listConversations(request))
  }

  /**
   * Read one direct or group conversation history page.
   * @param request - Conversation id, optional cursor, and page limit.
   * @returns One chronological history page.
   */
  @Remote
  getHistory(request: AwikiHistoryRequest): Promise<AwikiResult<AwikiPage<AwikiMessage>>> {
    return this.run(client => client.getHistory(request))
  }

  /**
   * Mark every currently unread inbox message in one conversation as read.
   * @param request - conversation whose current inbox entries should be acknowledged.
   * @returns Number of inbox entries acknowledged by the Message Service.
   */
  @Remote
  markConversationRead(request: AwikiMarkConversationReadRequest): Promise<AwikiResult<number>> {
    return this.run(client => client.markConversationRead(request.conversationId))
  }

  /**
   * Send one text message through the deployment identity.
   * @param request - Target, text, and idempotency key.
   * @returns The accepted public message or a closed failure.
   */
  @Remote
  sendText(request: AwikiSendTextRequest): Promise<AwikiResult<AwikiMessage>> {
    return this.run(client => client.sendText(request))
  }

  /**
   * Upload and send one attachment after Host validation.
   * @param request - Target, attachment metadata and Base64 bytes, caption, and idempotency key.
   * @returns The accepted attachment message or a closed failure.
   */
  @Remote
  async sendAttachment(request: AwikiSendAttachmentRequest): Promise<AwikiResult<AwikiMessage>> {
    const decoded = decodeAttachment(request.bytesBase64, this.resolved.attachmentMaxBytes)
    if (!decoded.ok) return decoded
    return this.run(client => client.sendAttachment({
      target: request.target,
      attachment: {
        fileName: request.fileName,
        mimeType: request.mimeType,
        bytes: decoded.value,
      },
      ...request.caption === undefined ? {} : { caption: request.caption },
      idempotencyKey: request.idempotencyKey,
    }), { skipAttachmentByteValidation: true })
  }

  /**
   * Download and encode one provider-verified attachment.
   * @param request - Containing message id and attachment id.
   * @returns Verified public metadata and canonical Base64 bytes, or a closed failure.
   */
  @Remote
  async downloadAttachment(request: AwikiDownloadAttachmentRequest): Promise<AwikiResult<AwikiDownloadedAttachment>> {
    const result = await this.run(client => client.downloadAttachment(request), { skipAttachmentByteValidation: true })
    if (!result.ok) return result
    if (result.value.bytes.byteLength > this.resolved.attachmentMaxBytes) {
      return { ok: false, error: failure('attachment-too-large') }
    }
    if (result.value.bytes.byteLength !== result.value.attachment.size) {
      return { ok: false, error: failure('remote') }
    }
    return { ok: true, value: downloadedAttachment(result.value) }
  }

  /**
   * Permanently remove the exact SDK-owned local state after an explicit browser acknowledgement.
   * The remote AWiki account and Handle are not deleted.
   * @param request - exact destructive-action marker emitted only after the UI's second confirmation.
   * @returns Whether a persisted state file existed when the reset completed.
   */
  @Remote
  clearLocalData(request: AwikiClearLocalDataRequest): Promise<AwikiResult<AwikiClearLocalDataResult>> {
    if (request?.confirmation !== AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION) {
      return Promise.resolve({ ok: false, error: failure('invalid-request') })
    }
    return this.mutateSession(async () => {
      const result = await this.run(client => client.clearLocalData(), { allowSignedOut: true })
      if (!result.ok) return result
      try {
        await this.sessionStore.signIn()
        this.signedOut = false
        return result
      } catch {
        return { ok: false, error: failure('remote') }
      }
    })
  }

  /** Invoke the current client and normalize every rejection to a public result. */
  private async run<Value>(
    operation: (client: AwikiSdkClient) => Promise<Value>,
    options: {
      readonly allowSignedOut?: boolean
      readonly skipAttachmentByteValidation?: boolean
    } = {},
  ): Promise<AwikiResult<Value>> {
    try {
      if (options.allowSignedOut !== true && await this.isSignedOut()) {
        return { ok: false, error: failure('signed-out') }
      }
      const provider = this.provider
      if (provider === undefined) throw new ProviderUnavailableError()
      const value = await operation(provider.client)
      if (options.skipAttachmentByteValidation !== true && containsUnexpectedBinary(value, new Set())) {
        return { ok: false, error: failure('remote') }
      }
      return { ok: true, value }
    } catch (error) {
      return { ok: false, error: normalizeFailure(error) }
    }
  }

  /** Read and cache the private Host-owned session marker. */
  private async isSignedOut(): Promise<boolean> {
    this.signedOut ??= await this.sessionStore.isSignedOut()
    return this.signedOut
  }

  /** Serialize sign-in, sign-out, and destructive clear transitions. */
  private mutateSession<Value>(operation: () => Promise<Value>): Promise<Value> {
    const pending = this.sessionMutation.then(operation, operation)
    this.sessionMutation = pending.then(() => undefined, () => undefined)
    return pending
  }

  /** Clear one exact provider slot before joining its one shared disposal. */
  private disposeProvider(provider: { readonly client: AwikiSdkClient; disposal?: Promise<void> }): Promise<void> {
    if (this.provider === provider) this.provider = undefined
    provider.disposal ??= provider.client.dispose()
    return provider.disposal
  }
}

/** Reject SDK values that could leak raw bytes through a supposedly public DTO. */
function containsUnexpectedBinary(value: unknown, seen: Set<object>): boolean {
  if (value instanceof Uint8Array) return true
  if (typeof value !== 'object' || value === null) return false
  if (seen.has(value)) return false
  seen.add(value)
  for (const child of Object.values(value)) {
    if (containsUnexpectedBinary(child, seen)) return true
  }
  return false
}

export default AwikiService
