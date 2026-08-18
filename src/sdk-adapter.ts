/** Rust IM Core adapter that copies native values into Host-owned public DTOs. */

import type {
  ExternalHttpAuthAttempt as NodeExternalHttpAuthAttempt,
  ExternalHttpHeader as NodeExternalHttpHeader,
  ImCoreNodeClient,
  NodeAttachment,
  NodeConversation,
  NodeIdentity,
  NodeMessage,
  Page as NodePage,
} from '@awiki/im-core-node'
import type {
  AwikiAttachment,
  AwikiAttachmentId,
  AwikiConversation,
  AwikiConversationId,
  AwikiCursor,
  AwikiDid,
  AwikiDownloadedAttachment,
  AwikiFailureCode,
  AwikiHandle,
  AwikiHistoryRequest,
  AwikiIdentity,
  AwikiMessage,
  AwikiMessageId,
  AwikiMessageTarget,
  AwikiPage,
  AwikiPageRequest,
  AwikiResolvedPeer,
  AwikiRegistrationOtpRequest,
  AwikiRegistrationOtpResult,
  AwikiRegistrationRequest,
  AwikiSendTextRequest,
  AwikiUpdateDisplayNameRequest,
} from './types.ts'
import type {
  AwikiSdkClient,
  AwikiSdkDownloadedAttachment,
  AwikiSdkExternalHttpAttempt,
  AwikiSdkExternalHttpRequest,
  AwikiSdkExternalHttpResponse,
  AwikiSdkHttpHeader,
  AwikiSdkSendAttachmentRequest,
} from './provider-api.ts'

const GROUP_LOOKUP_LIMIT = 100
const MAX_GROUP_LOOKUP_PAGES = 20

const RUST_FAILURE_CODES: Readonly<Record<string, AwikiFailureCode>> = {
  invalid_input: 'invalid-request',
  invalid_state_root: 'invalid-request',
  invalid_cursor: 'invalid-request',
  identity_required: 'not-registered',
  identity_not_found: 'not-registered',
  identity_not_ready: 'not-registered',
  auth_required: 'not-registered',
  invalid_otp: 'invalid-otp',
  challenge_expired: 'challenge-expired',
  handle_unavailable: 'handle-unavailable',
  not_found: 'not-found',
  permission_denied: 'forbidden',
  auth_revoked: 'forbidden',
  conflict: 'conflict',
  join_required: 'handle-unavailable',
  state_in_use: 'conflict',
  rate_limited: 'rate-limited',
  timeout: 'network',
  transport_unavailable: 'network',
  sync_failed: 'network',
  session_expired: 'network',
  attachment_transfer_network: 'network',
}

/** Closed provider error consumed by the Host's fixed public failure mapping. */
export class AwikiSdkError extends Error {
  public readonly name = 'AwikiSdkError'

  public constructor(public readonly code: AwikiFailureCode) {
    super(`AWiki SDK operation failed: ${code}`)
  }
}

function fail(code: AwikiFailureCode = 'remote'): never {
  throw new AwikiSdkError(code)
}

function mapError(error: unknown): never {
  if (error instanceof AwikiSdkError) throw error
  let code: AwikiFailureCode = 'remote'
  try {
    if (typeof error === 'object' && error !== null) {
      const value = error as { readonly name?: unknown; readonly code?: unknown }
      if (value.name === 'ImCoreNodeError' && typeof value.code === 'string') {
        code = RUST_FAILURE_CODES[value.code] ?? 'remote'
      }
    }
  } catch {}
  fail(code)
}

function safeInteger(value: string, minimum = 0): number {
  if (!/^(?:0|[1-9]\d*)$/u.test(value)) fail()
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed < minimum) fail()
  return parsed
}

function timestamp(value: string): number {
  const parsed = Date.parse(value)
  if (!Number.isSafeInteger(parsed)) fail()
  return parsed
}

function required(value: string | undefined): string {
  if (value === undefined || value.trim().length === 0) fail()
  return value
}

function sha256(value: NodeAttachment): string {
  const provided = value.sha256Hex?.toLowerCase()
  if (provided !== undefined && /^[a-f0-9]{64}$/u.test(provided)) return provided
  try {
    const bytes = Buffer.from(value.digestB64u, 'base64url')
    if (bytes.byteLength === 32 && bytes.toString('base64url') === value.digestB64u) {
      return bytes.toString('hex')
    }
  } catch {}
  fail()
}

/** Copy one native identity without retaining provider-owned objects. */
function identity(value: NodeIdentity): AwikiIdentity {
  return {
    handle: required(value.handle) as AwikiHandle,
    did: required(value.did) as AwikiDid,
    ...value.displayName === undefined ? {} : { displayName: value.displayName },
    registeredAt: safeInteger(value.registeredAtMs),
  }
}

/** Copy one native attachment and normalize its decimal/digest encodings. */
function attachment(value: NodeAttachment): AwikiAttachment {
  return {
    id: required(value.id) as AwikiAttachmentId,
    fileName: required(value.fileName),
    mimeType: required(value.mimeType),
    size: safeInteger(value.sizeBytes),
    sha256: sha256(value),
  }
}

function preview(value: NodeMessage | undefined): string | undefined {
  if (value === undefined) return undefined
  switch (value.content.kind) {
    case 'text': return value.content.text
    case 'attachment': {
      const fileName = value.content.attachment?.fileName
      return fileName === undefined ? undefined : `[附件] ${fileName}`
    }
    default: return undefined
  }
}

/** Copy one native page and brand its opaque cursor for the Host API. */
function page<Source, Target>(value: NodePage<Source>, copy: (item: Source) => Target): AwikiPage<Target> {
  return {
    items: value.items.map(copy),
    ...value.nextCursor === undefined ? {} : { nextCursor: String(value.nextCursor) as AwikiCursor },
    hasMore: value.hasMore,
  }
}

function httpHeaders(headers: readonly NodeExternalHttpHeader[]): AwikiSdkHttpHeader[] {
  return headers.map(header => ({ name: String(header.name), value: String(header.value) }))
}

function externalHttpAttempt(value: NodeExternalHttpAuthAttempt): AwikiSdkExternalHttpAttempt {
  return {
    targetUrl: String(value.targetUrl),
    method: String(value.method),
    headerPatch: httpHeaders(value.headerPatch),
    retryCount: value.retryCount,
    async handleResponse(response: AwikiSdkExternalHttpResponse) {
      try {
        const retry = await value.handleResponse({
          statusCode: response.statusCode,
          headers: response.headers.map(header => ({ name: header.name, value: header.value })),
        })
        return retry === null ? null : externalHttpAttempt(retry)
      } catch (error) {
        mapError(error)
      }
    },
  }
}

/** Adapt the Rust Node bridge to the frozen Host provider interface. */
export class RustSdkAdapter implements AwikiSdkClient {
  private readonly client: Promise<ImCoreNodeClient>
  private readonly attachmentConversations = new Map<string, string>()
  private disposal: Promise<void> | undefined

  public constructor(client: ImCoreNodeClient | Promise<ImCoreNodeClient>) {
    this.client = Promise.resolve(client)
  }

  private async run<Value>(operation: (client: ImCoreNodeClient) => Promise<Value>): Promise<Value> {
    try {
      return await operation(await this.client)
    } catch (error) {
      mapError(error)
    }
  }

  private message(value: NodeMessage): AwikiMessage {
    const sentAt = value.sentAt === undefined ? fail() : timestamp(value.sentAt)
    const common = {
      id: required(value.id) as AwikiMessageId,
      conversationId: required(value.conversationId) as AwikiConversationId,
      conversationKind: value.conversationKind,
      senderDid: required(value.senderDid) as AwikiDid,
      ...value.senderHandle === undefined ? {} : { senderHandle: value.senderHandle as AwikiHandle },
      ...value.senderDisplayName === undefined ? {} : { senderDisplayName: value.senderDisplayName },
      sentAt,
      outgoing: value.outgoing,
    }
    switch (value.content.kind) {
      case 'text': return {
        ...common,
        content: { kind: 'text', text: required(value.content.text) },
      }
      case 'attachment': {
        if (value.content.attachment === undefined) fail()
        const copied = attachment(value.content.attachment)
        this.attachmentConversations.set(
          `${String(common.id)}\u0000${String(copied.id)}`,
          String(common.conversationId),
        )
        return {
          ...common,
          content: {
            kind: 'attachment',
            attachment: copied,
            ...value.content.caption === undefined ? {} : { caption: value.content.caption },
          },
        }
      }
      default: fail()
    }
  }

  private conversation(value: NodeConversation): AwikiConversation {
    const id = required(value.id) as AwikiConversationId
    const title = value.title?.trim()
    const lastMessagePreview = preview(value.lastMessage)
    const common = {
      id,
      title: title === undefined || title.length === 0
        ? required(value.kind === 'direct' ? value.peerHandle ?? value.peerDid : value.groupDid)
        : title,
      unreadCount: value.unreadCount,
      ...value.lastMessageAt === undefined ? {} : { lastMessageAt: timestamp(value.lastMessageAt) },
      ...lastMessagePreview === undefined ? {} : { lastMessagePreview },
    }
    if (value.lastMessage !== undefined) this.message(value.lastMessage)
    switch (value.kind) {
      case 'direct': return {
        kind: 'direct',
        ...common,
        peerDid: required(value.peerDid) as AwikiDid,
        ...value.peerHandle === undefined ? {} : { peerHandle: value.peerHandle as AwikiHandle },
      }
      case 'group': return {
        kind: 'group',
        ...common,
        groupDid: required(value.groupDid) as AwikiDid,
      }
      default: fail()
    }
  }

  private async conversationId(client: ImCoreNodeClient, target: AwikiMessageTarget): Promise<string> {
    if (target.kind === 'direct') return required((await client.resolvePeer(target.peer)).conversationId)
    let cursor: string | undefined
    for (let index = 0; index < MAX_GROUP_LOOKUP_PAGES; index += 1) {
      const result = await client.listConversations({
        ...cursor === undefined ? {} : { cursor },
        limit: GROUP_LOOKUP_LIMIT,
      })
      const match = result.items.find(item =>
        item.kind === 'group' && (item.id === target.group || item.groupDid === target.group))
      if (match !== undefined) return required(match.id)
      if (!result.hasMore || result.nextCursor === undefined) fail('not-found')
      cursor = result.nextCursor
    }
    fail('not-found')
  }

  public prepareExternalHttpRequest(request: AwikiSdkExternalHttpRequest): Promise<AwikiSdkExternalHttpAttempt> {
    return this.run(async (client) => externalHttpAttempt(await client.prepareExternalHttpRequest({
      url: request.url,
      method: request.method,
      headers: request.headers.map(header => ({ name: header.name, value: header.value })),
      ...request.body === undefined ? {} : { body: Uint8Array.from(request.body) },
    })))
  }

  public getIdentity(): Promise<AwikiIdentity | null> {
    return this.run(async (client) => {
      const value = await client.getDefaultIdentity()
      return value === null ? null : identity(value)
    })
  }

  public sendRegistrationOtp(request: AwikiRegistrationOtpRequest): Promise<AwikiRegistrationOtpResult> {
    return this.run(async (client) => {
      const value = await client.requestRegistrationOtp(request)
      return { retryAfterSeconds: value.retryAfterSeconds, retryAt: value.retryAt }
    })
  }

  public registerIdentity(request: AwikiRegistrationRequest): Promise<AwikiIdentity> {
    return this.run(async client => identity(await client.completeRegistration(request)))
  }

  public updateDisplayName(request: AwikiUpdateDisplayNameRequest): Promise<AwikiIdentity> {
    return this.run(async client => identity(await client.updateDisplayName(request.displayName)))
  }

  public resolvePeer(peer: string): Promise<AwikiResolvedPeer> {
    return this.run(async (client) => {
      const value = await client.resolvePeer(peer)
      return {
        did: required(value.did) as AwikiDid,
        conversationId: required(value.conversationId) as AwikiConversationId,
        ...value.handle === undefined ? {} : { handle: value.handle as AwikiHandle },
        ...value.displayName === undefined ? {} : { displayName: value.displayName },
      }
    })
  }

  public listConversations(request?: AwikiPageRequest): Promise<AwikiPage<AwikiConversation>> {
    return this.run(async client => page(
      await client.listConversations(request),
      value => this.conversation(value),
    ))
  }

  public getHistory(request: AwikiHistoryRequest): Promise<AwikiPage<AwikiMessage>> {
    return this.run(async (client) => {
      const history = await client.getHistory({
        conversationId: String(request.conversationId),
        ...request.cursor === undefined ? {} : { cursor: String(request.cursor) },
        ...request.limit === undefined ? {} : { limit: request.limit },
      })
      return page(
        // Rust Core pages newest-first; the Host/UI contract is chronological.
        { ...history, items: [...history.items].reverse() },
        value => this.message(value),
      )
    })
  }

  public getLocalHistory(request: AwikiHistoryRequest): Promise<AwikiPage<AwikiMessage>> {
    return this.run(async (client) => {
      const history = await client.getLocalConversationTimeline({
        conversationId: String(request.conversationId),
        ...request.cursor === undefined ? {} : { cursor: String(request.cursor) },
        ...request.limit === undefined ? {} : { limit: request.limit },
      })
      return page(
        // Rust Core local pages are newest-first; the Host/UI contract is chronological.
        { ...history, items: [...history.items].reverse() },
        value => this.message(value),
      )
    })
  }

  public markConversationRead(conversationId: AwikiConversationId): Promise<number> {
    return this.run(async client => (await client.markConversationRead(String(conversationId))).updatedCount)
  }

  public sendText(request: AwikiSendTextRequest): Promise<AwikiMessage> {
    return this.run(async (client) => this.message(await client.sendText({
      conversationId: await this.conversationId(client, request.target),
      text: request.text,
      idempotencyKey: request.idempotencyKey,
    })))
  }

  public sendAttachment(request: AwikiSdkSendAttachmentRequest): Promise<AwikiMessage> {
    return this.run(async (client) => this.message(await client.sendAttachment({
      conversationId: await this.conversationId(client, request.target),
      fileName: request.attachment.fileName,
      mimeType: request.attachment.mimeType,
      bytes: request.attachment.bytes,
      ...request.caption === undefined ? {} : { caption: request.caption },
      idempotencyKey: request.idempotencyKey,
    })))
  }

  public downloadAttachment(request: {
    readonly attachmentId: AwikiAttachmentId
    readonly messageId: AwikiMessageId
  }): Promise<AwikiSdkDownloadedAttachment> {
    return this.run(async (client) => {
      const conversationId = this.attachmentConversations.get(
        `${String(request.messageId)}\u0000${String(request.attachmentId)}`,
      )
      if (conversationId === undefined) fail('not-found')
      const value = await client.downloadAttachment({
        conversationId,
        messageId: String(request.messageId),
        attachmentId: String(request.attachmentId),
      })
      return { attachment: attachment(value.attachment), bytes: Uint8Array.from(value.bytes) }
    })
  }

  public clearLocalData(): Promise<{ readonly cleared: boolean }> {
    return this.run(client => client.clearLocalData())
  }

  public dispose(): Promise<void> {
    this.disposal ??= this.client.then(
      async client => {
        try {
          await client.close()
        } catch (error) {
          mapError(error)
        }
      },
      () => undefined,
    )
    return this.disposal
  }
}

/**
 * Convert a raw provider download to the Remote JSON representation.
 * @param value - provider-verified public metadata and bytes.
 * @returns detached metadata with canonical Base64 bytes.
 */
export function downloadedAttachment(value: AwikiSdkDownloadedAttachment): AwikiDownloadedAttachment {
  return {
    attachment: { ...value.attachment },
    bytesBase64: Buffer.from(value.bytes).toString('base64'),
  }
}
