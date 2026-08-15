/** TypeScript SDK adapter that copies provider values into Host-owned public DTOs. */

import type {
  AwikiAttachment as SdkAttachment,
  AwikiConversation as SdkConversation,
  DownloadAwikiAttachmentRequest as SdkDownloadAttachmentRequest,
  DownloadedAwikiAttachment as SdkDownloadedAttachment,
  AwikiConversationId as SdkConversationId,
  AwikiCursor as SdkCursor,
  GetAwikiHistoryRequest as SdkHistoryRequest,
  AwikiIdentity as SdkIdentity,
  AwikiMessage as SdkMessage,
  AwikiPage as SdkPage,
  AwikiPageRequest as SdkPageRequest,
  SendAwikiAttachmentRequest as SdkSendAttachmentRequest,
  AwikiImClient,
} from '@anp/typescript-sdk'
import type {
  AwikiAttachment,
  AwikiAttachmentId,
  AwikiConversation,
  AwikiConversationId,
  AwikiCursor,
  AwikiDid,
  AwikiDownloadedAttachment,
  AwikiHandle,
  AwikiHistoryRequest,
  AwikiIdentity,
  AwikiMessage,
  AwikiMessageId,
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
  AwikiSdkSendAttachmentRequest,
} from './provider-api.ts'

/** Copy one SDK identity without retaining provider-owned objects. */
function identity(value: SdkIdentity): AwikiIdentity {
  return {
    handle: String(value.handle) as AwikiHandle,
    did: String(value.did) as AwikiDid,
    ...value.displayName === undefined ? {} : { displayName: value.displayName },
    registeredAt: value.registeredAt,
  }
}

/** Copy one SDK attachment without retaining provider-owned objects. */
function attachment(value: SdkAttachment): AwikiAttachment {
  return {
    id: String(value.id) as AwikiAttachmentId,
    fileName: value.fileName,
    mimeType: value.mimeType,
    size: value.size,
    sha256: value.sha256,
  }
}

/** Copy one SDK conversation without retaining provider-owned objects. */
function conversation(value: SdkConversation): AwikiConversation {
  switch (value.kind) {
    case 'direct': return {
      kind: 'direct',
      id: String(value.id) as AwikiConversationId,
      peerDid: String(value.peerDid) as AwikiDid,
      ...value.peerHandle === undefined ? {} : { peerHandle: String(value.peerHandle) as AwikiHandle },
      ...value.displayName === undefined ? {} : { displayName: value.displayName },
      title: value.title,
      ...value.unreadCount === undefined ? {} : { unreadCount: value.unreadCount },
      ...value.lastMessageAt === undefined ? {} : { lastMessageAt: value.lastMessageAt },
      ...value.lastMessagePreview === undefined ? {} : { lastMessagePreview: value.lastMessagePreview },
    }
    case 'group': return {
      kind: 'group',
      id: String(value.id) as AwikiConversationId,
      groupDid: String(value.groupDid) as AwikiDid,
      title: value.title,
      ...value.unreadCount === undefined ? {} : { unreadCount: value.unreadCount },
      ...value.lastMessageAt === undefined ? {} : { lastMessageAt: value.lastMessageAt },
      ...value.lastMessagePreview === undefined ? {} : { lastMessagePreview: value.lastMessagePreview },
    }
    default: throw new TypeError('AWiki SDK returned an unsupported conversation kind')
  }
}

/** Copy one SDK message without retaining provider-owned objects. */
function message(value: SdkMessage): AwikiMessage {
  return {
    id: String(value.id) as AwikiMessageId,
    conversationId: String(value.conversationId) as AwikiConversationId,
    conversationKind: value.conversationKind,
    senderDid: String(value.senderDid) as AwikiDid,
    ...value.senderHandle === undefined ? {} : { senderHandle: String(value.senderHandle) as AwikiHandle },
    ...value.senderDisplayName === undefined ? {} : { senderDisplayName: value.senderDisplayName },
    sentAt: value.sentAt,
    outgoing: value.outgoing,
    content: value.content.kind === 'text'
      ? { kind: 'text', text: value.content.text }
      : {
        kind: 'attachment',
        attachment: attachment(value.content.attachment),
        ...value.content.caption === undefined ? {} : { caption: value.content.caption },
      },
  }
}

/** Copy one SDK page and brand its opaque cursor for the Host API. */
function page<Source, Target>(value: SdkPage<Source>, copy: (item: Source) => Target): AwikiPage<Target> {
  return {
    items: value.items.map(copy),
    ...value.nextCursor === undefined ? {} : { nextCursor: String(value.nextCursor) as AwikiCursor },
    hasMore: value.hasMore,
  }
}

/** Adapt the versioned TypeScript SDK to the Host provider interface. */
export class TypeScriptSdkAdapter implements AwikiSdkClient {
  /** @param client - initialized high-level SDK client owned by this adapter. */
  constructor(private readonly client: AwikiImClient) {}

  async getIdentity(): Promise<AwikiIdentity | null> {
    const value = await this.client.getIdentity()
    return value === null ? null : identity(value)
  }

  async sendRegistrationOtp(request: AwikiRegistrationOtpRequest): Promise<AwikiRegistrationOtpResult> {
    const value = await this.client.sendRegistrationOtp(request)
    return { retryAfterSeconds: value.retryAfterSeconds, retryAt: value.retryAt }
  }

  async registerIdentity(request: AwikiRegistrationRequest): Promise<AwikiIdentity> {
    return identity(await this.client.registerIdentity(request))
  }

  async updateDisplayName(request: AwikiUpdateDisplayNameRequest): Promise<AwikiIdentity> {
    return identity(await this.client.updateDisplayName(request))
  }

  async resolvePeer(peer: string): Promise<AwikiResolvedPeer> {
    const value = await this.client.resolvePeer(peer)
    return {
      did: String(value.did) as AwikiDid,
      conversationId: String(value.conversationId) as AwikiConversationId,
      ...value.handle === undefined ? {} : { handle: String(value.handle) as AwikiHandle },
      ...value.displayName === undefined ? {} : { displayName: value.displayName },
    }
  }

  async listConversations(request?: AwikiPageRequest): Promise<AwikiPage<AwikiConversation>> {
    const value = await this.client.listConversations(request as SdkPageRequest | undefined)
    return page(value, conversation)
  }

  async getHistory(request: AwikiHistoryRequest): Promise<AwikiPage<AwikiMessage>> {
    const sdkRequest: SdkHistoryRequest = {
      conversationId: String(request.conversationId) as SdkConversationId,
      ...request.cursor === undefined ? {} : { cursor: String(request.cursor) as SdkCursor },
      ...request.limit === undefined ? {} : { limit: request.limit },
    }
    const value = await this.client.getHistory(sdkRequest)
    return page(value, message)
  }

  async markConversationRead(conversationId: AwikiConversationId): Promise<number> {
    return this.client.markConversationRead(String(conversationId) as SdkConversationId)
  }

  async sendText(request: AwikiSendTextRequest): Promise<AwikiMessage> {
    return message(await this.client.sendText(request))
  }

  async sendAttachment(request: AwikiSdkSendAttachmentRequest): Promise<AwikiMessage> {
    const sdkRequest: SdkSendAttachmentRequest = {
      target: request.target,
      attachment: {
        fileName: request.attachment.fileName,
        mimeType: request.attachment.mimeType,
        bytes: request.attachment.bytes,
      },
      ...request.caption === undefined ? {} : { caption: request.caption },
      idempotencyKey: request.idempotencyKey,
    }
    return message(await this.client.sendAttachment(sdkRequest))
  }

  async downloadAttachment(request: {
    readonly attachmentId: AwikiAttachmentId
    readonly messageId: AwikiMessageId
  }): Promise<AwikiSdkDownloadedAttachment> {
    const sdkRequest: SdkDownloadAttachmentRequest = {
      attachmentId: String(request.attachmentId) as SdkDownloadAttachmentRequest['attachmentId'],
      messageId: String(request.messageId) as SdkDownloadAttachmentRequest['messageId'],
    }
    const value: SdkDownloadedAttachment = await this.client.downloadAttachment(sdkRequest)
    return { attachment: attachment(value.attachment), bytes: value.bytes.slice() }
  }

  clearLocalData(): Promise<{ readonly cleared: boolean }> {
    return this.client.clearLocalData()
  }

  dispose(): Promise<void> {
    return this.client.dispose()
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
