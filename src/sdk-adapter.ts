/** Rust IM Core adapter that copies native values into Host-owned public DTOs. */

import type {
  ExternalHttpAuthAttempt as NodeExternalHttpAuthAttempt,
  ExternalHttpHeader as NodeExternalHttpHeader,
  ImCoreNodeClient,
  MailAccount,
  MailInboxPage,
  MailMessage,
  MailMessageSummary,
  MarkMailReadResult,
  NodeAttachment,
  NodeConversation,
  NodeDisplayProfile,
  NodeGroup,
  NodeGroupMember,
  NodeGroupMemberRecord,
  NodeIdentity,
  NodeMessage,
  NodeProfile,
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
  AwikiGroupConversation,
  AwikiGroupMember,
  AwikiGroupMemberPage,
  AwikiGroupRebindRecoverySummary,
  AwikiGroupMemberRecord,
  AwikiGroupMembersRequest,
  AwikiGroupSnapshot,
  AwikiHandle,
  AwikiHistoryRequest,
  AwikiIdentity,
  AwikiMessage,
  AwikiMessageId,
  AwikiMessageTarget,
  AwikiMention,
  AwikiMailAccount,
  AwikiMailAttachmentMetadata,
  AwikiMailInboxPage,
  AwikiMailInboxRequest,
  AwikiMailMarkReadRequest,
  AwikiMailMarkReadResult,
  AwikiMailMessage,
  AwikiMailMessageId,
  AwikiMailReadRequest,
  AwikiMailSendRequest,
  AwikiMailSendResult,
  AwikiMailSummary,
  AwikiPage,
  AwikiPageRequest,
  AwikiProfile,
  AwikiRecoveryOperationRequest,
  AwikiRecoveryOtpRequest,
  AwikiRecoveryOtpResult,
  AwikiRecoveryPrepareRequest,
  AwikiRecoveryProgress,
  AwikiResolvedPeer,
  AwikiRegistrationOtpRequest,
  AwikiRegistrationOtpResult,
  AwikiRegistrationRequest,
  AwikiSendTextRequest,
  AwikiUpdateDisplayNameRequest,
  AwikiUpdateProfileRequest,
} from './types.ts'
import type {
  AwikiSdkClient,
  AwikiSdkDownloadedAttachment,
  AwikiSdkExternalHttpAttempt,
  AwikiSdkExternalHttpRequest,
  AwikiSdkExternalHttpResponse,
  AwikiSdkHttpHeader,
  AwikiSdkListenerClient,
  AwikiSdkListenerConversation,
  AwikiSdkListenerMessage,
  AwikiSdkListenerSyncReason,
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
  group_not_member: 'group-membership-required',
  group_identity_stale: 'group-identity-stale',
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

function mapError(error: unknown, ambiguousSend = false): never {
  if (error instanceof AwikiSdkError) throw error
  let code: AwikiFailureCode = 'remote'
  try {
    if (typeof error === 'object' && error !== null) {
      const value = error as { readonly name?: unknown; readonly code?: unknown }
      if (value.name === 'ImCoreNodeError' && typeof value.code === 'string') {
        code = ambiguousSend && (value.code === 'timeout' || value.code === 'transport_unavailable')
          ? 'delivery-unknown'
          : RUST_FAILURE_CODES[value.code] ?? 'remote'
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

/** Recover the browser's exact optimistic message identity without widening the Remote schema. */
function browserMessageId(idempotencyKey: string): string | undefined {
  return /^msg-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u.test(idempotencyKey)
    ? idempotencyKey
    : undefined
}

function remoteString(value: unknown, maxBytes: number): string {
  if (typeof value !== 'string' || value.includes('\0') || Buffer.byteLength(value, 'utf8') > maxBytes) fail()
  return value
}

function remoteOptionalString(value: unknown, maxBytes: number): string | undefined {
  return value === undefined ? undefined : remoteString(value, maxBytes)
}

function mailToken(value: unknown, maxCharacters: number): string {
  if (typeof value !== 'string'
    || value.length === 0
    || value.trim() !== value
    || Array.from(value).length > maxCharacters
    || /[\u0000-\u001f\u007f-\u009f]/u.test(value)) fail()
  return value
}

function mailAddress(value: unknown): string {
  if (typeof value !== 'string') fail()
  const length = Array.from(value).length
  if (length < 3
    || length > 320
    || !value.includes('@')
    || /[\s\u0000-\u001f\u007f-\u009f]/u.test(value)) fail()
  return value
}

function mailAddresses(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 100) fail()
  return value.map(mailAddress)
}

function mailTimestamp(value: unknown): string | undefined {
  if (value === undefined) return undefined
  const copied = remoteString(value, 64)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(copied)
    || !Number.isFinite(Date.parse(copied))) fail()
  return copied
}

function uint32(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 0xffff_ffff) fail()
  return value as number
}

function recoveryE2eeGroupCount(impact: unknown): number {
  if (typeof impact !== 'object' || impact === null) fail()
  const value = impact as {
    readonly unsupportedE2eeGroupCount?: unknown
    readonly unsupportedE2EeGroupCount?: unknown
  }
  return uint32(value.unsupportedE2eeGroupCount !== undefined
    ? value.unsupportedE2eeGroupCount
    : value.unsupportedE2EeGroupCount)
}

function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') fail()
  return value
}

function mailSummary(value: MailMessageSummary): AwikiMailSummary {
  const receivedAt = mailTimestamp(value.receivedAt)
  const sentAt = mailTimestamp(value.sentAt)
  const folder = value.folder === undefined ? undefined : mailToken(value.folder, 64)
  const preview = remoteOptionalString(value.preview, 4_096)
  const attachmentCount = value.attachmentCount === undefined ? undefined : uint32(value.attachmentCount)
  return {
    id: mailToken(value.id, 2_048) as AwikiMailMessageId,
    ...folder === undefined ? {} : { folder },
    from: mailAddresses(value.from),
    to: mailAddresses(value.to),
    cc: mailAddresses(value.cc),
    subject: remoteString(value.subject, 1_024),
    subjectTruncated: boolean(value.subjectTruncated),
    ...preview === undefined ? {} : { preview },
    previewTruncated: boolean(value.previewTruncated),
    ...receivedAt === undefined ? {} : { receivedAt },
    ...sentAt === undefined ? {} : { sentAt },
    unread: boolean(value.unread),
    hasAttachments: boolean(value.hasAttachments),
    ...attachmentCount === undefined ? {} : { attachmentCount },
  }
}

function mailAttachment(value: MailMessage['attachments'][number]): AwikiMailAttachmentMetadata {
  const fileName = remoteOptionalString(value.fileName, 512)
  const contentType = remoteOptionalString(value.contentType, 255)
  const sizeBytes = value.sizeBytes === undefined ? undefined : remoteString(value.sizeBytes, 20)
  if (sizeBytes !== undefined && !/^(?:0|[1-9]\d*)$/u.test(sizeBytes)) fail()
  return {
    index: uint32(value.index),
    ...fileName === undefined ? {} : { fileName },
    ...contentType === undefined ? {} : { contentType },
    ...sizeBytes === undefined ? {} : { sizeBytes },
  }
}

function mailAccount(value: MailAccount): AwikiMailAccount {
  const mailboxAddress = value.mailboxAddress === undefined ? undefined : mailAddress(value.mailboxAddress)
  const displayName = remoteOptionalString(value.displayName, 512)
  const status = remoteOptionalString(value.status, 128)
  return {
    ...mailboxAddress === undefined ? {} : { mailboxAddress },
    ...displayName === undefined ? {} : { displayName },
    ...status === undefined ? {} : { status },
  }
}

function mailInbox(value: MailInboxPage): AwikiMailInboxPage {
  if (!Array.isArray(value.items) || value.items.length > 100) fail()
  const hasMore = boolean(value.hasMore)
  const nextOffset = value.nextOffset === undefined ? undefined : uint32(value.nextOffset)
  if ((hasMore && nextOffset === undefined) || (!hasMore && nextOffset !== undefined)) fail()
  return {
    items: value.items.map(mailSummary),
    ...nextOffset === undefined ? {} : { nextOffset },
    hasMore,
  }
}

function mailMessage(value: MailMessage): AwikiMailMessage {
  if (!Array.isArray(value.attachments) || value.attachments.length > 100) fail()
  const bodyText = remoteOptionalString(value.bodyText, 65_536)
  return {
    summary: mailSummary(value.summary),
    ...bodyText === undefined ? {} : { bodyText },
    bodyTruncated: boolean(value.bodyTruncated),
    hasHtmlBody: boolean(value.hasHtmlBody),
    attachments: value.attachments.map(mailAttachment),
  }
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

function profile(value: NodeProfile): AwikiProfile {
  return {
    did: required(value.did) as AwikiDid,
    ...value.handle === undefined ? {} : { handle: value.handle as AwikiHandle },
    displayName: value.displayName?.trim() ?? '',
    bio: value.bio ?? '',
    tags: [...value.tags],
    ...value.updatedAt === undefined ? {} : { updatedAt: value.updatedAt },
  }
}

function mentionPayload(value: NodeMessage): { readonly text: string; readonly mentions?: readonly AwikiMention[] } | undefined {
  if (value.content.kind !== 'payload' || value.content.payloadJson === undefined) return undefined
  let parsed: unknown
  try {
    parsed = JSON.parse(value.content.payloadJson)
  } catch {
    return undefined
  }
  if (typeof parsed !== 'object' || parsed === null || !('text' in parsed) || typeof parsed.text !== 'string') return undefined
  const text = parsed.text
  if (!('mentions' in parsed) || !Array.isArray(parsed.mentions)) return { text }
  const length = Array.from(text).length
  const mentions: AwikiMention[] = []
  for (const raw of parsed.mentions) {
    if (typeof raw !== 'object' || raw === null
      || !('id' in raw) || typeof raw.id !== 'string' || raw.id.trim() === ''
      || !('range' in raw) || typeof raw.range !== 'object' || raw.range === null
      || !('start' in raw.range) || !Number.isSafeInteger(raw.range.start)
      || !('end' in raw.range) || !Number.isSafeInteger(raw.range.end)
      || !('unit' in raw.range) || raw.range.unit !== 'unicode_code_point'
      || (raw.range.start as number) < 0
      || (raw.range.end as number) <= (raw.range.start as number)
      || (raw.range.end as number) > length
      || !('target' in raw) || typeof raw.target !== 'object' || raw.target === null
      || !('kind' in raw.target) || raw.target.kind !== 'human'
      || !('did' in raw.target) || typeof raw.target.did !== 'string' || !raw.target.did.startsWith('did:')) {
      return { text }
    }
    const displayName = 'display_name' in raw.target && typeof raw.target.display_name === 'string'
      ? raw.target.display_name
      : undefined
    mentions.push({
      id: raw.id,
      start: raw.range.start as number,
      end: raw.range.end as number,
      did: raw.target.did as AwikiDid,
      ...displayName === undefined ? {} : { displayName },
    })
  }
  const ordered = [...mentions].sort((left, right) => left.start - right.start || left.end - right.end)
  if (ordered.some((item, index) => index > 0 && item.start < ordered[index - 1]!.end)) return { text }
  const characters = Array.from(text)
  if (ordered.some(item => !characters.slice(item.start, item.end).join('').startsWith('@'))) return { text }
  return ordered.length === 0 ? { text } : { text, mentions: ordered }
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
    case 'payload': return mentionPayload(value)?.text
    default: return undefined
  }
}

/** Provider-only protocol events are not part of the browser's text/attachment history contract. */
function displayableMessage(value: NodeMessage): boolean {
  return value.content.kind === 'text'
    || value.content.kind === 'attachment'
    || mentionPayload(value) !== undefined
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
  public readonly listener: AwikiSdkListenerClient

  public constructor(client: ImCoreNodeClient | Promise<ImCoreNodeClient>) {
    this.client = Promise.resolve(client)
    this.listener = {
      syncNow: reason => this.listenerSyncNow(reason),
      startRealtime: () => this.listenerStartRealtime(),
      listConversations: request => this.listenerConversations(request),
      getHistory: request => this.listenerHistory(request),
      markConversationRead: conversationId => this.markConversationRead(conversationId),
      sendText: request => this.sendText(request),
    }
  }

  private async run<Value>(
    operation: (client: ImCoreNodeClient) => Promise<Value>,
    ambiguousSend = false,
  ): Promise<Value> {
    try {
      return await operation(await this.client)
    } catch (error) {
      mapError(error, ambiguousSend)
    }
  }

  private async displayableMessages(
    client: ImCoreNodeClient,
    values: readonly NodeMessage[],
  ): Promise<NodeMessage[]> {
    const messages = values.filter(displayableMessage)
    const peers = [...new Set(messages
      .filter(message => (
        message.conversationKind === 'group'
        && !message.outgoing
        && message.senderHandle === undefined
        && message.senderDisplayName === undefined
      ))
      .map(message => message.senderDid))]
    if (peers.length === 0) return [...messages]
    const profiles = await client.hydrateDisplayProfiles({ peers })
    const byDid = new Map<string, NodeDisplayProfile>()
    for (const profile of profiles) {
      if (profile.did !== undefined) byDid.set(profile.did, profile)
    }
    return messages.map((message) => {
      const profile = byDid.get(message.senderDid)
      if (profile === undefined) return message
      return {
        ...message,
        ...profile.handle === undefined ? {} : { senderHandle: profile.handle },
        ...profile.displayName === undefined ? {} : { senderDisplayName: profile.displayName },
      }
    })
  }

  /**
   * Join the persisted Core peer-profile projection onto direct roster rows.
   * The conversation registry intentionally keeps routing identifiers separate
   * from display metadata, so a bare roster row may otherwise regress to a Handle.
   */
  private async displayableConversations(
    client: ImCoreNodeClient,
    values: readonly NodeConversation[],
  ): Promise<AwikiConversation[]> {
    const peers = [...new Set(values
      .filter((conversation): conversation is NodeConversation & { readonly kind: 'direct'; readonly peerDid: string } => (
        conversation.kind === 'direct' && conversation.peerDid !== undefined
      ))
      .map(conversation => conversation.peerDid))]
    const profiles = peers.length === 0 ? [] : await client.hydrateDisplayProfiles({ peers })
    const byPeer = new Map<string, NodeDisplayProfile>()
    for (const [index, profile] of profiles.entries()) {
      const requested = peers[index]
      if (requested !== undefined) byPeer.set(requested, profile)
      if (profile.did !== undefined) byPeer.set(profile.did, profile)
      if (profile.handle !== undefined) byPeer.set(profile.handle, profile)
    }
    return values.map(value => this.conversation(
      value,
      value.kind === 'direct'
        ? byPeer.get(value.peerDid ?? '') ?? byPeer.get(value.peerHandle ?? '')
        : undefined,
    ))
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
      case 'payload': {
        const parsed = mentionPayload(value)
        if (parsed === undefined) fail()
        return {
          ...common,
          content: {
            kind: 'text',
            text: parsed.text,
            ...parsed.mentions === undefined ? {} : { mentions: parsed.mentions },
          },
        }
      }
      default: fail()
    }
  }

  private conversation(value: NodeConversation, profile?: NodeDisplayProfile): AwikiConversation {
    const id = required(value.id) as AwikiConversationId
    const displayName = profile?.displayName?.trim()
    const profileHandle = profile?.handle?.trim()
    const title = displayName === undefined || displayName.length === 0
      ? value.title?.trim()
      : displayName
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
    if (value.lastMessage !== undefined && displayableMessage(value.lastMessage)) this.message(value.lastMessage)
    switch (value.kind) {
      case 'direct': return {
        kind: 'direct',
        ...common,
        peerDid: required(profile?.did ?? value.peerDid) as AwikiDid,
        ...profileHandle === undefined && value.peerHandle === undefined
          ? {}
          : { peerHandle: required(profileHandle ?? value.peerHandle) as AwikiHandle },
        ...displayName === undefined || displayName.length === 0 ? {} : { displayName },
      }
      case 'group': return {
        kind: 'group',
        ...common,
        groupDid: required(value.groupDid) as AwikiDid,
      }
      default: fail()
    }
  }

  private createdGroup(value: NodeGroup): AwikiGroupConversation {
    return {
      kind: 'group',
      id: required(value.conversationId) as AwikiConversationId,
      groupDid: required(value.did) as AwikiDid,
      title: required(value.title),
      unreadCount: 0,
    }
  }

  private groupSnapshot(value: NodeGroup): AwikiGroupSnapshot {
    return {
      groupDid: required(value.did) as AwikiDid,
      conversationId: required(value.conversationId) as AwikiConversationId,
      title: required(value.title),
      ...value.description === undefined ? {} : { description: value.description },
      ...value.myRole === undefined ? {} : { myRole: value.myRole },
      ...value.membershipStatus === undefined ? {} : { membershipStatus: value.membershipStatus },
      ...value.memberCount === undefined ? {} : { memberCount: value.memberCount },
    }
  }

  private groupMember(value: NodeGroupMember): AwikiGroupMember {
    return {
      did: required(value.did) as AwikiDid,
      ...value.handle === undefined ? {} : { handle: value.handle as AwikiHandle },
    }
  }

  private groupMemberRecord(value: NodeGroupMemberRecord, profile?: NodeDisplayProfile): AwikiGroupMemberRecord {
    return {
      ...value.membershipId === undefined ? {} : { membershipId: value.membershipId },
      ...value.peerPersonaId === undefined ? {} : { peerPersonaId: value.peerPersonaId },
      ...value.did === undefined ? {} : { did: value.did as AwikiDid },
      ...value.credentialDid === undefined ? {} : { credentialDid: value.credentialDid as AwikiDid },
      ...value.handle === undefined ? {} : { handle: value.handle as AwikiHandle },
      ...profile?.displayName === undefined ? {} : { displayName: profile.displayName },
      ...value.role === undefined ? {} : { role: value.role },
      ...value.status === undefined ? {} : { status: value.status },
      ...value.joinedAt === undefined ? {} : { joinedAt: value.joinedAt },
      ...value.subjectType === undefined ? {} : { subjectType: value.subjectType },
    }
  }

  private listenerConversation(value: NodeConversation): AwikiSdkListenerConversation {
    const common = {
      id: required(value.id),
      unreadCount: value.unreadCount,
      ...value.lastMessageAt === undefined ? {} : { lastMessageAt: timestamp(value.lastMessageAt) },
    }
    if (value.kind === 'direct') {
      return {
        kind: 'direct',
        ...common,
        peerDid: required(value.peerDid),
        ...value.peerHandle === undefined ? {} : { peerHandle: value.peerHandle },
      }
    }
    return { kind: 'group', ...common }
  }

  private listenerMessage(value: NodeMessage): AwikiSdkListenerMessage {
    const sentAt = value.sentAt === undefined ? fail() : timestamp(value.sentAt)
    const common = {
      id: required(value.id),
      conversationId: required(value.conversationId),
      conversationKind: value.conversationKind,
      senderDid: required(value.senderDid),
      sentAt,
      outgoing: value.outgoing,
    }
    return value.content.kind === 'text' && value.content.text !== undefined
      ? { ...common, content: { kind: 'text', text: required(value.content.text) } }
      : { ...common, content: { kind: 'ignored' } }
  }

  private listenerSyncNow(reason: AwikiSdkListenerSyncReason): Promise<void> {
    return this.run(async (client) => {
      const result = await client.syncNow({ reason })
      if (result.status === 'idle' || result.status === 'changed') return
      if (result.status === 'auth_revoked') fail('forbidden')
      fail('network')
    })
  }

  private listenerStartRealtime(): Promise<Awaited<ReturnType<AwikiSdkListenerClient['startRealtime']>>> {
    return this.run(async (client) => {
      const session = await client.startRealtime()
      return {
        nextEvent: () => this.run(() => session.nextEvent()),
        stop: () => this.run(() => session.stop()),
      }
    })
  }

  private listenerConversations(
    request?: AwikiPageRequest,
  ): Promise<AwikiPage<AwikiSdkListenerConversation>> {
    return this.run(async client => page(
      await client.listConversations(request),
      value => this.listenerConversation(value),
    ))
  }

  private listenerHistory(
    request: AwikiHistoryRequest,
  ): Promise<AwikiPage<AwikiSdkListenerMessage>> {
    return this.run(async (client) => {
      const history = await client.getHistory({
        conversationId: String(request.conversationId),
        ...request.cursor === undefined ? {} : { cursor: String(request.cursor) },
        ...request.limit === undefined ? {} : { limit: request.limit },
      })
      return page(
        { ...history, items: [...history.items].reverse() },
        value => this.listenerMessage(value),
      )
    })
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

  public getProfile(): Promise<AwikiProfile> {
    return this.run(async client => profile(await client.getProfile()))
  }

  public updateProfile(request: AwikiUpdateProfileRequest): Promise<AwikiProfile> {
    return this.run(async client => profile(await client.updateProfile({
      displayName: request.displayName,
      bio: request.bio,
      tags: [...request.tags],
    })))
  }

  private recoveryProgress(value: Awaited<ReturnType<ImCoreNodeClient['getHandleRecoveryStatus']>>): AwikiRecoveryProgress {
    return {
      operationId: required(value.operationId),
      fullHandle: required(value.fullHandle),
      ...value.previousDid === undefined ? {} : { previousDid: value.previousDid as AwikiDid },
      currentDid: required(value.currentDid) as AwikiDid,
      phase: value.phase,
      ...value.failureCode === undefined ? {} : { failureCode: value.failureCode },
      retryable: boolean(value.retryable),
      localOrdinaryDataWillMigrate: boolean(value.impact.localOrdinaryDataWillMigrate),
      otherDevicesMustRejoin: boolean(value.impact.otherDevicesMustRejoin),
      unsupportedE2eeGroupCount: recoveryE2eeGroupCount(value.impact),
      unsupportedDidOnlyGroupCount: uint32(value.impact.unsupportedDidOnlyGroupCount),
    }
  }

  public sendRecoveryOtp(request: AwikiRecoveryOtpRequest): Promise<AwikiRecoveryOtpResult> {
    return this.run(async (client) => {
      const value = await client.requestHandleRecoveryOtp(request)
      return {
        operationId: required(value.operationId),
        fullHandle: required(value.fullHandle),
        retryAfterSeconds: value.retryAfterSeconds,
        retryAt: value.retryAt,
      }
    })
  }

  public prepareRecovery(request: AwikiRecoveryPrepareRequest): Promise<AwikiRecoveryProgress> {
    return this.run(async client => this.recoveryProgress(await client.prepareHandleRecovery(request)))
  }

  public activateRecovery(request: AwikiRecoveryOperationRequest): Promise<AwikiRecoveryProgress> {
    return this.run(async client => this.recoveryProgress(await client.activateHandleRecovery(request)))
  }

  public getRecoveryStatus(request: AwikiRecoveryOperationRequest): Promise<AwikiRecoveryProgress> {
    return this.run(async client => this.recoveryProgress(await client.getHandleRecoveryStatus(request)))
  }

  public resumeRecovery(request: AwikiRecoveryOperationRequest): Promise<AwikiRecoveryProgress> {
    return this.run(async client => this.recoveryProgress(await client.resumeHandleRecovery(request)))
  }

  public discardRecovery(request: AwikiRecoveryOperationRequest): Promise<void> {
    return this.run(async (client) => {
      await client.discardHandleRecovery(request)
    })
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

  public createGroup(name: string): Promise<AwikiGroupConversation> {
    return this.run(async client => this.createdGroup(await client.createGroup({ name })))
  }

  public addGroupMember(groupDid: AwikiDid, member: string): Promise<AwikiGroupMember> {
    return this.run(async client => this.groupMember(await client.addGroupMember({
      groupDid: String(groupDid),
      member,
    })))
  }

  public getGroup(groupDid: AwikiDid): Promise<AwikiGroupSnapshot> {
    return this.run(async client => this.groupSnapshot(await client.getGroup({ groupDid: String(groupDid) })))
  }

  public joinGroup(groupDid: AwikiDid): Promise<AwikiGroupSnapshot> {
    return this.run(async client => this.groupSnapshot(await client.joinGroup({ groupDid: String(groupDid) })))
  }

  public leaveGroup(groupDid: AwikiDid): Promise<void> {
    return this.run(client => client.leaveGroup({ groupDid: String(groupDid) }))
  }

  public listGroupMembers(request: AwikiGroupMembersRequest): Promise<AwikiGroupMemberPage> {
    return this.run(async (client) => {
      const value = await client.listGroupMembers({
        groupDid: String(request.groupDid),
        ...request.cursor === undefined ? {} : { cursor: String(request.cursor) },
        ...request.limit === undefined ? {} : { limit: request.limit },
      })
      const peers = [...new Set(value.items.flatMap(member => member.did ?? member.handle ?? []))]
      const profiles = peers.length === 0 ? [] : await client.hydrateDisplayProfiles({ peers })
      const byPeer = new Map<string, NodeDisplayProfile>()
      for (const [index, profile] of profiles.entries()) {
        const requested = peers[index]
        if (requested !== undefined) byPeer.set(requested, profile)
        if (profile.did !== undefined) byPeer.set(profile.did, profile)
        if (profile.handle !== undefined) byPeer.set(profile.handle, profile)
      }
      return {
        items: value.items.map(item => this.groupMemberRecord(
          item,
          byPeer.get(item.did ?? '') ?? byPeer.get(item.handle ?? ''),
        )),
        ...value.total === undefined ? {} : { total: value.total },
        ...value.nextCursor === undefined ? {} : { nextCursor: value.nextCursor as AwikiCursor },
        hasMore: value.hasMore,
        ...value.pageGroup === undefined ? {} : { pageGroup: value.pageGroup as AwikiDid },
        ...value.groupStateVersion === undefined ? {} : { groupStateVersion: value.groupStateVersion },
        warnings: [...value.warnings],
      }
    })
  }

  public removeGroupMember(groupDid: AwikiDid, member: string): Promise<AwikiGroupMember> {
    return this.run(async client => this.groupMember(await client.removeGroupMember({
      groupDid: String(groupDid),
      member,
    })))
  }

  public resumeGroupRebindRecovery(): Promise<AwikiGroupRebindRecoverySummary> {
    return this.run(async (client) => {
      const value = await client.resumeGroupRebindRecovery(100)
      const journal = value as typeof value & {
        readonly sendPausedGroups?: readonly unknown[]
        readonly items?: readonly {
          readonly groupDid?: unknown
          readonly layer?: unknown
          readonly phase?: unknown
          readonly blocked?: unknown
        }[]
      }
      const statuses = new Map<AwikiDid, 'pending' | 'blocked'>()
      for (const item of journal.items ?? []) {
        const { groupDid: rawGroupDid, layer: rawLayer, phase: rawPhase } = item
        if (
          typeof rawGroupDid !== 'string'
          || typeof rawLayer !== 'string'
          || typeof rawPhase !== 'string'
          || typeof item.blocked !== 'boolean'
        ) {
          throw new TypeError('invalid group recovery item')
        }
        const groupDid = required(rawGroupDid) as AwikiDid
        const layer = required(rawLayer)
        const phase = required(rawPhase)
        if (layer !== 'p4' && layer !== 'p6') throw new TypeError('invalid group recovery item')
        if (phase === 'complete') continue
        const status = item.blocked || phase === 'blocked' ? 'blocked' : 'pending'
        if (statuses.get(groupDid) !== 'blocked') statuses.set(groupDid, status)
      }
      for (const group of journal.sendPausedGroups ?? []) {
        if (typeof group !== 'string') throw new TypeError('invalid paused recovery group')
        const groupDid = required(group) as AwikiDid
        if (!statuses.has(groupDid)) statuses.set(groupDid, 'pending')
      }
      const items = [...statuses].map(([groupDid, status]) => ({ groupDid, status }))
      const hasJournal = journal.items !== undefined || journal.sendPausedGroups !== undefined
      return {
        processed: uint32(value.processed),
        completed: uint32(value.completed),
        pending: hasJournal ? items.filter(item => item.status === 'pending').length : uint32(value.pending),
        blocked: hasJournal ? items.filter(item => item.status === 'blocked').length : uint32(value.blocked),
        items,
      }
    })
  }

  public listConversations(request?: AwikiPageRequest): Promise<AwikiPage<AwikiConversation>> {
    return this.run(async (client) => {
      const conversations = await client.listConversations(request)
      return {
        ...page(conversations, value => value),
        items: await this.displayableConversations(client, conversations.items),
      }
    })
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
        { ...history, items: await this.displayableMessages(client, [...history.items].reverse()) },
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
        { ...history, items: await this.displayableMessages(client, [...history.items].reverse()) },
        value => this.message(value),
      )
    })
  }

  public markConversationRead(conversationId: AwikiConversationId): Promise<number> {
    return this.run(async client => (await client.markConversationRead(String(conversationId))).updatedCount)
  }

  public sendText(request: AwikiSendTextRequest): Promise<AwikiMessage> {
    return this.run(async (client) => {
      const clientMessageId = browserMessageId(request.idempotencyKey)
      const conversationId = await this.conversationId(client, request.target)
      if (request.mentions !== undefined && request.mentions.length > 0) {
        return this.message(await client.sendPayload({
          conversationId,
          payloadJson: JSON.stringify({
            text: request.text,
            mentions: request.mentions.map(mention => ({
              id: mention.id,
              range: { start: mention.start, end: mention.end, unit: 'unicode_code_point' },
              target: {
                kind: 'human',
                did: mention.did,
                ...mention.displayName === undefined ? {} : { display_name: mention.displayName },
              },
              mention_role: 'addressee',
            })),
          }),
          ...clientMessageId === undefined ? {} : { clientMessageId },
          idempotencyKey: request.idempotencyKey,
        }))
      }
      return this.message(await client.sendText({
        conversationId,
        text: request.text,
        ...clientMessageId === undefined ? {} : { clientMessageId },
        idempotencyKey: request.idempotencyKey,
      }))
    })
  }

  public sendAttachment(request: AwikiSdkSendAttachmentRequest): Promise<AwikiMessage> {
    return this.run(async (client) => {
      const clientMessageId = browserMessageId(request.idempotencyKey)
      return this.message(await client.sendAttachment({
        conversationId: await this.conversationId(client, request.target),
        fileName: request.attachment.fileName,
        mimeType: request.attachment.mimeType,
        bytes: request.attachment.bytes,
        ...request.caption === undefined ? {} : { caption: request.caption },
        ...clientMessageId === undefined ? {} : { clientMessageId },
        idempotencyKey: request.idempotencyKey,
      }))
    })
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

  public getMailAccount(): Promise<AwikiMailAccount> {
    return this.run(async client => mailAccount(await client.getMailAccount()))
  }

  public listMailInbox(request: AwikiMailInboxRequest = {}): Promise<AwikiMailInboxPage> {
    return this.run(async client => mailInbox(await client.listMailInbox({
      ...request.folder === undefined ? {} : { folder: request.folder },
      ...request.unreadOnly === undefined ? {} : { unreadOnly: request.unreadOnly },
      ...request.limit === undefined ? {} : { limit: request.limit },
      ...request.offset === undefined ? {} : { offset: request.offset },
    })))
  }

  public readMail(request: AwikiMailReadRequest): Promise<AwikiMailMessage> {
    return this.run(async client => mailMessage(await client.readMail(request.messageId)))
  }

  public markMailRead(request: AwikiMailMarkReadRequest): Promise<AwikiMailMarkReadResult> {
    return this.run(async (client) => {
      const value: MarkMailReadResult = await client.markMailRead({
        messageIds: [...request.messageIds],
      })
      return { updated: uint32(value.updated) }
    })
  }

  public sendMail(request: AwikiMailSendRequest): Promise<AwikiMailSendResult> {
    return this.run(async (client) => {
      const value = await client.sendMail({
        to: [...request.to],
        ...request.cc === undefined ? {} : { cc: [...request.cc] },
        subject: request.subject,
        bodyText: request.bodyText,
      })
      if (!Array.isArray(value.warnings) || value.warnings.length > 100) fail()
      const messageId = value.messageId === undefined
        ? undefined
        : mailToken(value.messageId, 2_048) as AwikiMailMessageId
      return {
        accepted: boolean(value.accepted),
        ...messageId === undefined ? {} : { messageId },
        warnings: value.warnings.map(warning => remoteString(warning, 1_024)),
      }
    }, true)
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
