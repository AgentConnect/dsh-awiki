/** Unified AWiki identity, messaging, attachment, Remote, and model-tool service. */

import { Context } from '@deepseek-ai/cordis'
import { homedir } from 'node:os'
import { join } from 'node:path'
import z from '@deepseek-ai/schemastery'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { settingsNamespace, type SettingsProvider } from '@deepseek-ai/dsh-settings'
import type {
  AwikiClearLocalDataRequest,
  AwikiClearLocalDataResult,
  AwikiConversation,
  AwikiConversationSummary,
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
  AwikiSummarizeConversationRequest,
  AwikiUpdateDisplayNameRequest,
} from './types.ts'
import { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION, AWIKI_LOGOUT_CONFIRMATION } from './types.ts'
import type { AwikiClientFactory, AwikiClientOptions, AwikiSdkClient } from './provider-api.ts'
import type { AwikiSummaryProvider, AwikiSummarySourceMessage } from './summary-provider-api.ts'
import {
  AwikiExternalHttpAuthError,
  createAwikiExternalHttpAuth,
  externalHttpAuthError,
  mapProviderError as mapExternalHttpProviderError,
} from './external-http-auth.ts'
import type { AwikiExternalHttpAuth, AwikiExternalHttpAuthSession } from './external-http-auth.ts'
import { downloadedAttachment } from './sdk-adapter.ts'
import { registerAwikiTools } from './tools.ts'
import {
  AwikiSettingsSchema,
  validateAwikiSettings,
} from './settings.ts'
import { AWIKI_SETTINGS_NAMESPACE, DEFAULT_AWIKI_DOMAIN, normalizeAwikiDomain } from './domain.ts'
import { AWIKI_SETTINGS_RPC_CHANNEL } from './settings-rpc-contract.ts'
import { createAwikiSettingsRpcHandler } from './settings-rpc.ts'
import { AwikiSessionStore } from './session.ts'

export type * from './types.ts'
export { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION, AWIKI_LOGOUT_CONFIRMATION } from './types.ts'
export type { AwikiClientFactory, AwikiClientOptions, AwikiSdkClient } from './provider-api.ts'
export {
  AWIKI_EXTERNAL_HTTP_MAX_BODY_BYTES,
  AwikiExternalHttpAuthError,
} from './external-http-auth.ts'
export type {
  AwikiExternalHttpAuth,
  AwikiExternalHttpAuthErrorCode,
  AwikiHttpTransport,
} from './external-http-auth.ts'
export type {
  AwikiSummaryProvider,
  AwikiSummaryProviderRequest,
  AwikiSummaryProviderResult,
  AwikiSummarySourceMessage,
} from './summary-provider-api.ts'
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

  interface Events {
    /**
     * Committed change to this installation's AWiki sign-in state.
     * @param session - the new public session state after persistence succeeds.
     * @mode emit
     */
    'awiki/session'(session: AwikiSession): void
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
/** Host-owned model input cap after message minimization. */
export const DEFAULT_SUMMARY_MAX_INPUT_BYTES = 32 * 1024
/** Hard limit for one user-triggered conversation summary. */
export const MAX_SUMMARY_MESSAGES = 50

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
  /** Maximum UTF-8 bytes of minimized message JSON sent to a summary provider. */
  readonly summaryMaxInputBytes?: number
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
  summaryMaxInputBytes: z.number().default(DEFAULT_SUMMARY_MAX_INPUT_BYTES),
})

interface ResolvedConfig extends AwikiClientOptions, AwikiRuntimeConfig {
  readonly attachmentMaxBytes: number
  readonly summaryMaxInputBytes: number
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
  'summary-unavailable',
  'summary-timeout',
  'summary-cancelled',
  'summary-invalid-output',
  'summary-failed',
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
  'summary-unavailable': 'AI summary is unavailable. Check the current default model configuration.',
  'summary-timeout': 'AI summary timed out. Try again.',
  'summary-cancelled': 'AI summary was cancelled. Try again.',
  'summary-invalid-output': 'The model returned an invalid summary. Try again.',
  'summary-failed': 'AI summary could not be generated. Try again.',
  'network': 'The AWiki service could not be reached.',
  'remote': 'The AWiki service rejected the operation.',
}

class ProviderUnavailableError extends Error {}
class SummaryProviderUnavailableError extends Error {}

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
  const summaryMaxInputBytes = config.summaryMaxInputBytes ?? DEFAULT_SUMMARY_MAX_INPUT_BYTES
  if (!Number.isSafeInteger(summaryMaxInputBytes) || summaryMaxInputBytes < 1_024) {
    throw new TypeError('awiki: summaryMaxInputBytes must be a safe integer of at least 1024')
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
    summaryMaxInputBytes,
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

/** Normalize summary-provider failures without returning prompts, model output, routes, or causes. */
function normalizeSummaryFailure(error: unknown): AwikiFailure {
  if (error instanceof SummaryProviderUnavailableError) return failure('summary-unavailable')
  try {
    if (typeof error === 'object' && error !== null && Reflect.get(error, 'name') === 'AwikiSummaryProviderError') {
      switch (Reflect.get(error, 'code')) {
        case 'route-unavailable': return failure('summary-unavailable')
        case 'timeout': return failure('summary-timeout')
        case 'cancelled': return failure('summary-cancelled')
        case 'truncated':
        case 'tool-call':
        case 'empty-output':
        case 'invalid-output': return failure('summary-invalid-output')
        default: return failure('summary-failed')
      }
    }
  } catch {
    // Hostile provider errors collapse to one fixed public summary failure.
  }
  return failure('summary-failed')
}

/** Bound one untrusted display string before it can consume the shared model budget. */
function boundedText(value: string | undefined, maxCharacters: number, fallback = ''): string {
  const text = value?.trim() ?? fallback
  return Array.from(text).slice(0, maxCharacters).join('')
}

/** Remove routing identifiers, attachment ids, hashes, and all binary fields from one message. */
function minimizeSummaryMessage(message: AwikiMessage): AwikiSummarySourceMessage {
  const sender = boundedText(
    message.senderDisplayName ?? message.senderHandle,
    50,
    message.outgoing ? '我' : '对方',
  )
  const base = {
    id: message.id,
    sender,
    outgoing: message.outgoing,
    sentAt: new Date(message.sentAt).toISOString(),
  }
  if (message.content.kind === 'text') {
    return {
      ...base,
      content: { kind: 'text', text: boundedText(message.content.text, 4_000) },
    }
  }
  return {
    ...base,
    content: {
      kind: 'attachment',
      fileName: boundedText(message.content.attachment.fileName, 120, 'attachment'),
      mimeType: boundedText(message.content.attachment.mimeType, 80, 'application/octet-stream'),
      size: message.content.attachment.size,
      ...(message.content.caption === undefined
        ? {}
        : { caption: boundedText(message.content.caption, 1_000) }),
    },
  }
}

function summaryBytes(messages: readonly AwikiSummarySourceMessage[]): number {
  return Buffer.byteLength(JSON.stringify(messages), 'utf8')
}

/** Fit one newest oversized message by shortening only its text or caption. */
function fitNewestSummaryMessage(
  message: AwikiSummarySourceMessage,
  maxBytes: number,
): AwikiSummarySourceMessage | undefined {
  if (summaryBytes([message]) <= maxBytes) return message
  const original = message.content.kind === 'text' ? message.content.text : message.content.caption
  if (original === undefined) return undefined
  const characters = Array.from(original)
  let low = 0
  let high = characters.length
  let fitted: AwikiSummarySourceMessage | undefined
  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    const shortened = characters.slice(0, middle).join('')
    const candidate: AwikiSummarySourceMessage = message.content.kind === 'text'
      ? { ...message, content: { ...message.content, text: shortened } }
      : { ...message, content: { ...message.content, caption: shortened } }
    if (summaryBytes([candidate]) <= maxBytes) {
      fitted = candidate
      low = middle + 1
    } else {
      high = middle - 1
    }
  }
  return fitted
}

/** Preserve the newest contiguous range while enforcing the exact UTF-8 JSON budget. */
function cropSummaryMessages(
  messages: readonly AwikiSummarySourceMessage[],
  maxBytes: number,
): { readonly messages: readonly AwikiSummarySourceMessage[]; readonly truncated: boolean } {
  const selected: AwikiSummarySourceMessage[] = []
  let truncated = false
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message === undefined) continue
    const candidate = [message, ...selected]
    if (summaryBytes(candidate) <= maxBytes) {
      selected.unshift(message)
      continue
    }
    truncated = true
    if (selected.length === 0) {
      const fitted = fitNewestSummaryMessage(message, maxBytes)
      if (fitted !== undefined) selected.unshift(fitted)
    }
    break
  }
  return { messages: selected, truncated }
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
  private settingsProvider: SettingsProvider | undefined
  private provider: { readonly client: AwikiSdkClient; disposal?: Promise<void> } | undefined
  private signedOut: boolean | undefined
  private sessionMutation: Promise<void> = Promise.resolve()
  private sessionRevision = 0
  private readonly activeSummaryRequests = new Set<AbortController>()
  private summaryProvider: AwikiSummaryProvider | undefined
  private readonly hostContext: Context
  /** Trusted same-process external HTTP authentication dispatcher. Never Remote. */
  readonly externalHttpAuth: AwikiExternalHttpAuth

  /**
   * @param ctx - owning Host context.
   * @param config - service endpoints, SDK state path, and public limits.
   */
  constructor(ctx: Context, config: Config) {
    super(ctx, 'awiki')
    this.hostContext = ctx
    this.resolved = resolveConfig(config)
    this.externalHttpAuth = createAwikiExternalHttpAuth(() => this.acquireExternalHttpAuthSession())
    this.sessionStore = new AwikiSessionStore(this.resolved.stateRoot)
    this.startupUserServiceDomain = this.resolved.userServiceDomain
    ctx.inject(['settings'], (settingsCtx) => {
      const provider = settingsCtx.settings
      const settingsScope = settingsCtx.settings.register(
        settingsNamespace(AWIKI_SETTINGS_NAMESPACE),
        AwikiSettingsSchema,
        {
          base: { domain: this.resolved.userServiceDomain },
          applies: 'restart',
          validate: validateAwikiSettings,
        },
      )
      this.settingsProvider = provider
      this.startupUserServiceDomain = settingsScope.get().domain
      settingsCtx.effect(() => () => {
        if (this.settingsProvider === provider) {
          this.settingsProvider = undefined
          this.startupUserServiceDomain = this.resolved.userServiceDomain
        }
      }, 'awiki: release settings namespace')
    })
    ctx.inject(['connection'], (connectionCtx) => {
      connectionCtx.connection.rpc.handle(
        AWIKI_SETTINGS_RPC_CHANNEL,
        createAwikiSettingsRpcHandler(() => this.settingsProvider),
        { authority: 'loopback' },
      )
    })
    registerAwikiTools(ctx, this)
    ctx.effect(() => async () => {
      const provider = this.provider
      if (provider !== undefined) await this.disposeProvider(provider)
    }, 'awiki: dispose current client provider')
    ctx.effect(() => () => {
      this.summaryProvider = undefined
    }, 'awiki: clear summary provider')
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

  /** Register one replaceable conversation-summary provider for this deployment. */
  registerSummaryProvider(provider: AwikiSummaryProvider): () => void {
    if (this.summaryProvider !== undefined) throw new Error('awiki: a summary provider is already registered')
    this.summaryProvider = provider
    let active = true
    return () => {
      if (!active) return
      active = false
      if (this.summaryProvider === provider) this.summaryProvider = undefined
    }
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
        this.invalidateSummaries()
        const session = { status: 'signed-out' } as const
        this.publishSession(session)
        return { ok: true, value: session }
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
        this.invalidateSummaries()
        const session = { status: 'active', identity: identity.value } as const
        this.publishSession(session)
        return { ok: true, value: session }
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
  async registerIdentity(request: AwikiRegistrationRequest): Promise<AwikiResult<AwikiIdentity>> {
    const result = await this.run(client => client.registerIdentity(request))
    if (result.ok) this.publishSession({ status: 'active', identity: result.value })
    return result
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
   * Read real AWiki history, enforce range and byte caps, then invoke the configured model once.
   * @param request - selected conversation and its unread snapshot at open time.
   * @returns a structured summary plus the exact summarized source range.
   */
  @Remote
  async summarizeConversation(
    request: AwikiSummarizeConversationRequest,
  ): Promise<AwikiResult<AwikiConversationSummary>> {
    if (typeof request?.conversationId !== 'string' || request.conversationId.length === 0) {
      return { ok: false, error: failure('invalid-request') }
    }
    if (request.unreadCountAtOpen !== undefined
      && (!Number.isSafeInteger(request.unreadCountAtOpen) || request.unreadCountAtOpen < 0)) {
      return { ok: false, error: failure('invalid-request') }
    }
    try {
      if (await this.isSignedOut()) return { ok: false, error: failure('signed-out') }
    } catch {
      return { ok: false, error: failure('remote') }
    }
    const sessionRevision = this.sessionRevision
    const provider = this.summaryProvider
    if (provider === undefined) return { ok: false, error: normalizeSummaryFailure(new SummaryProviderUnavailableError()) }
    const historyResult = await this.run(client => client.getHistory({
      conversationId: request.conversationId,
      limit: MAX_SUMMARY_MESSAGES,
    }))
    if (!historyResult.ok) return historyResult
    if (this.sessionRevision !== sessionRevision) {
      return { ok: false, error: failure('summary-cancelled') }
    }
    const history = historyResult.value
    if (history.items.some(message => message.conversationId !== request.conversationId)) {
      return { ok: false, error: failure('remote') }
    }
    const unread = request.unreadCountAtOpen ?? 0
    const rangeKind = unread > 0 ? 'unread' : 'recent'
    const requestedCount = rangeKind === 'unread' ? unread : MAX_SUMMARY_MESSAGES
    const bounded = history.items.slice(-Math.min(requestedCount, MAX_SUMMARY_MESSAGES))
    const minimized = bounded.map(minimizeSummaryMessage)
    const cropped = cropSummaryMessages(minimized, this.resolved.summaryMaxInputBytes)
    if (cropped.messages.length === 0) return { ok: false, error: failure('summary-failed') }

    const controller = new AbortController()
    this.activeSummaryRequests.add(controller)
    let summary
    try {
      summary = await provider.summarize({ messages: cropped.messages, signal: controller.signal })
    } catch (error) {
      return { ok: false, error: normalizeSummaryFailure(error) }
    } finally {
      this.activeSummaryRequests.delete(controller)
    }
    if (this.sessionRevision !== sessionRevision) {
      return { ok: false, error: failure('summary-cancelled') }
    }
    const first = cropped.messages[0]
    const last = cropped.messages.at(-1)
    if (first === undefined || last === undefined) return { ok: false, error: failure('summary-failed') }
    const sourceById = new Map(bounded.map(message => [message.id, message] as const))
    const firstSource = sourceById.get(first.id)
    const lastSource = sourceById.get(last.id)
    if (firstSource === undefined || lastSource === undefined) return { ok: false, error: failure('remote') }
    return {
      ok: true,
      value: {
        range: {
          kind: rangeKind,
          messageCount: cropped.messages.length,
          firstMessageId: first.id,
          lastMessageId: last.id,
          startedAt: firstSource.sentAt,
          endedAt: lastSource.sentAt,
          truncated: history.hasMore
            || history.items.length > MAX_SUMMARY_MESSAGES
            || requestedCount > MAX_SUMMARY_MESSAGES
            || cropped.truncated,
        },
        highlights: summary.highlights,
        conclusions: summary.conclusions,
        todos: summary.todos,
      },
    }
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
        this.invalidateSummaries()
        this.publishSession({ status: 'unregistered' })
        return result
      } catch {
        return { ok: false, error: failure('remote') }
      }
    })
  }

  /** Invalidate cached session work and cancel every model request still owned by the old session. */
  private invalidateSummaries(): void {
    this.sessionRevision += 1
    for (const controller of this.activeSummaryRequests) controller.abort()
    this.activeSummaryRequests.clear()
  }

  /** Publish a committed session transition to same-process Host consumers. */
  private publishSession(session: AwikiSession): void {
    this.hostContext.emit('awiki/session', session)
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

  /** Bind one external-auth dispatch to the current provider and session revision. */
  private async acquireExternalHttpAuthSession(): Promise<AwikiExternalHttpAuthSession> {
    let signedOut: boolean
    try {
      signedOut = await this.isSignedOut()
    } catch {
      throw externalHttpAuthError('auth-state-unavailable')
    }
    if (signedOut) throw externalHttpAuthError('signed-out')
    const revision = this.sessionRevision
    const provider = this.provider
    if (provider === undefined) throw externalHttpAuthError('auth-state-unavailable')
    let identity: Awaited<ReturnType<AwikiSdkClient['getIdentity']>>
    try {
      identity = await provider.client.getIdentity()
    } catch (error) {
      throw mapExternalHttpProviderError(error)
    }
    if (identity === null) throw externalHttpAuthError('not-registered')
    return {
      client: provider.client,
      assertActive: async () => {
        if (this.provider !== provider || this.sessionRevision !== revision) {
          throw externalHttpAuthError('auth-state-unavailable')
        }
        try {
          if (await this.isSignedOut()) throw externalHttpAuthError('signed-out')
        } catch (error) {
          if (error instanceof AwikiExternalHttpAuthError) throw error
          throw externalHttpAuthError('auth-state-unavailable')
        }
      },
    }
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
