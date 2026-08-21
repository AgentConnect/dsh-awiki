import { Context } from '@deepseek-ai/cordis'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import AgentRegistry, { Inbox } from '@deepseek-ai/dsh-agent'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { CallId } from '@deepseek-ai/dsh-llm'
import { Session, SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import { SettingsProvider, type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import AwikiService from '../src/index.ts'
import type {
  AwikiAttachment,
  AwikiAttachmentId,
  AwikiConversation,
  AwikiConversationId,
  AwikiDid,
  AwikiGroupConversation,
  AwikiGroupMember,
  AwikiGroupMemberPage,
  AwikiGroupMembersRequest,
  AwikiGroupSnapshot,
  AwikiHandle,
  AwikiIdentity,
  AwikiMailAccount,
  AwikiMailInboxPage,
  AwikiMailMessage,
  AwikiMailMessageId,
  AwikiMessage,
  AwikiMessageId,
  AwikiPage,
  AwikiProfile,
  AwikiRecoveryProgress,
  AwikiResolvedPeer,
} from '../src/types.ts'
import type {
  AwikiClientOptions,
  AwikiSdkClient,
  AwikiSdkExternalHttpAttempt,
  AwikiSdkExternalHttpRequest,
  AwikiSdkExternalHttpResponse,
} from '../src/provider-api.ts'

const IDENTITY: AwikiIdentity = {
  handle: 'alice' as AwikiHandle,
  did: 'did:awiki:alice' as AwikiDid,
  registeredAt: 1,
}

export const ATTACHMENT: AwikiAttachment = {
  id: 'attachment-1' as AwikiAttachmentId,
  fileName: 'hello.txt',
  mimeType: 'text/plain',
  size: 5,
  sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
}

const MESSAGE: AwikiMessage = {
  id: 'message-1' as AwikiMessageId,
  conversationId: 'conversation-1' as AwikiConversationId,
  conversationKind: 'direct',
  senderDid: IDENTITY.did,
  senderHandle: IDENTITY.handle,
  sentAt: 2,
  outgoing: true,
  content: { kind: 'text', text: 'hello' },
}

const CONVERSATIONS: AwikiPage<AwikiConversation> = {
  items: [{
    kind: 'direct',
    id: MESSAGE.conversationId,
    peerDid: 'did:awiki:bob' as AwikiDid,
    peerHandle: 'bob' as AwikiHandle,
    title: 'Bob',
    unreadCount: 2,
    lastMessageAt: MESSAGE.sentAt,
    lastMessagePreview: 'hello',
  }],
  hasMore: false,
}

const CREATED_GROUP: AwikiGroupConversation = {
  kind: 'group',
  id: 'group:did:awiki:release-crew' as AwikiConversationId,
  groupDid: 'did:awiki:release-crew' as AwikiDid,
  title: 'Release Crew',
  unreadCount: 0,
}

const PROFILE: AwikiProfile = {
  did: IDENTITY.did,
  handle: IDENTITY.handle,
  displayName: 'Alice',
  bio: '',
  tags: [],
}

const GROUP_SNAPSHOT: AwikiGroupSnapshot = {
  groupDid: CREATED_GROUP.groupDid,
  conversationId: CREATED_GROUP.id,
  title: CREATED_GROUP.title,
  myRole: 'owner',
  membershipStatus: 'active',
  memberCount: 2,
}

const RECOVERY_PROGRESS: AwikiRecoveryProgress = {
  operationId: 'recovery-1',
  fullHandle: 'alice.awiki.example',
  previousDid: IDENTITY.did,
  currentDid: IDENTITY.did,
  phase: 'awaiting_factor',
  retryable: false,
  localOrdinaryDataWillMigrate: true,
  otherDevicesMustRejoin: true,
  unsupportedE2eeGroupCount: 0,
  unsupportedDidOnlyGroupCount: 0,
}

export const MAIL_ACCOUNT: AwikiMailAccount = {
  mailboxAddress: 'alice@awiki.example',
  displayName: 'Alice',
  status: 'active',
}

export const MAIL_MESSAGE: AwikiMailMessage = {
  summary: {
    id: 'mail-1' as AwikiMailMessageId,
    folder: 'inbox',
    from: ['sender@example.com'],
    to: ['alice@awiki.example'],
    cc: [],
    subject: 'Status update',
    subjectTruncated: false,
    preview: 'Untrusted mail preview',
    previewTruncated: false,
    receivedAt: '2026-08-18T06:00:00Z',
    unread: true,
    hasAttachments: true,
    attachmentCount: 1,
  },
  bodyText: 'Untrusted mail body',
  bodyTruncated: false,
  hasHtmlBody: true,
  attachments: [{ index: 0, fileName: 'report.txt', contentType: 'text/plain', sizeBytes: '42' }],
}

export const MAIL_INBOX: AwikiMailInboxPage = {
  items: [MAIL_MESSAGE.summary],
  nextOffset: 1,
  hasMore: true,
}

/** Deterministic high-level client used by Host unit and Loader tests. */
export class FakeAwikiClient implements AwikiSdkClient {
  identity: AwikiIdentity | null = IDENTITY
  profile: AwikiProfile = PROFILE
  recoveryProgress: AwikiRecoveryProgress = RECOVERY_PROGRESS
  groupSnapshot: AwikiGroupSnapshot = GROUP_SNAPSHOT
  groupMembers: AwikiGroupMemberPage = {
    items: [
      { did: IDENTITY.did, handle: IDENTITY.handle, role: 'owner', status: 'active', subjectType: 'human' },
      { did: 'did:awiki:bob' as AwikiDid, handle: 'bob' as AwikiHandle, role: 'member', status: 'active', subjectType: 'human' },
    ],
    total: 2,
    hasMore: false,
    pageGroup: GROUP_SNAPSHOT.groupDid,
    groupStateVersion: 'group-version-1',
    warnings: [],
  }
  disposed = 0
  sentTexts = 0
  sentAttachments = 0
  attachmentBytes: Uint8Array | undefined
  markedConversation: AwikiConversationId | undefined
  localDataCleared = 0
  failure: unknown
  history: AwikiMessage[] = [MESSAGE]
  historyHasMore = false
  historyRequest: Parameters<AwikiSdkClient['getHistory']>[0] | undefined
  externalHttpRequests: AwikiSdkExternalHttpRequest[] = []
  externalHttpResponses: AwikiSdkExternalHttpResponse[] = []
  externalHttpFactory: ((request: AwikiSdkExternalHttpRequest) => AwikiSdkExternalHttpAttempt) | undefined
  createdGroupNames: string[] = []
  addedGroupMembers: { readonly groupDid: AwikiDid; readonly member: string }[] = []
  removedGroupMembers: { readonly groupDid: AwikiDid; readonly member: string }[] = []
  groupRecoveryCalls = 0
  groupMemberPages: AwikiGroupMembersRequest[] = []
  leftGroups: AwikiDid[] = []
  groupMemberFailures = new Set<string>()
  mailAccount: AwikiMailAccount = MAIL_ACCOUNT
  mailInbox: AwikiMailInboxPage = MAIL_INBOX
  mailMessage: AwikiMailMessage = MAIL_MESSAGE
  mailInboxRequest: Parameters<AwikiSdkClient['listMailInbox']>[0] | undefined
  mailReadRequest: Parameters<AwikiSdkClient['readMail']>[0] | undefined
  mailMarkReadRequest: Parameters<AwikiSdkClient['markMailRead']>[0] | undefined
  mailSendRequest: Parameters<AwikiSdkClient['sendMail']>[0] | undefined
  mailAccountCalls = 0
  mailInboxCalls = 0
  mailReadCalls = 0
  mailMarkReadCalls = 0
  mailSendCalls = 0

  private async reject<Value>(value: Value): Promise<Value> {
    if (this.failure !== undefined) throw this.failure
    return value
  }

  prepareExternalHttpRequest(request: AwikiSdkExternalHttpRequest) {
    const copied = {
      url: request.url,
      method: request.method,
      headers: request.headers.map(header => ({ ...header })),
      ...request.body === undefined ? {} : { body: Uint8Array.from(request.body) },
    }
    this.externalHttpRequests.push(copied)
    const attempt = this.externalHttpFactory?.(copied) ?? {
      targetUrl: copied.url,
      method: copied.method,
      headerPatch: [{ name: 'Signature', value: 'sig1=:fixture:' }],
      retryCount: 0,
      handleResponse: (response: AwikiSdkExternalHttpResponse) => {
        this.externalHttpResponses.push({
          statusCode: response.statusCode,
          headers: response.headers.map(header => ({ ...header })),
        })
        return Promise.resolve(null)
      },
    }
    return this.reject(attempt)
  }

  getIdentity() { return this.reject(this.identity) }
  sendRegistrationOtp(_request: Parameters<AwikiSdkClient['sendRegistrationOtp']>[0]) {
    return this.reject({ retryAfterSeconds: 60, retryAt: '2026-08-14T00:01:00Z' })
  }
  registerIdentity(_request: Parameters<AwikiSdkClient['registerIdentity']>[0]) {
    this.identity = IDENTITY
    return this.reject(IDENTITY)
  }
  updateDisplayName(request: Parameters<AwikiSdkClient['updateDisplayName']>[0]) {
    return this.reject({ ...IDENTITY, displayName: request.displayName })
  }
  getProfile() { return this.reject(this.profile) }
  updateProfile(request: Parameters<AwikiSdkClient['updateProfile']>[0]) {
    this.profile = { ...this.profile, ...request, tags: [...request.tags] }
    this.identity = this.identity === null ? null : { ...this.identity, displayName: request.displayName }
    return this.reject(this.profile)
  }
  sendRecoveryOtp(request: Parameters<AwikiSdkClient['sendRecoveryOtp']>[0]) {
    this.recoveryProgress = { ...RECOVERY_PROGRESS, fullHandle: request.fullHandle }
    return this.reject({
      operationId: this.recoveryProgress.operationId,
      fullHandle: request.fullHandle,
      retryAfterSeconds: 60,
      retryAt: '2026-08-20T00:01:00Z',
    })
  }
  prepareRecovery(request: Parameters<AwikiSdkClient['prepareRecovery']>[0]) {
    this.recoveryProgress = { ...this.recoveryProgress, operationId: request.operationId, phase: 'ready_to_commit' }
    return this.reject(this.recoveryProgress)
  }
  activateRecovery(_request: Parameters<AwikiSdkClient['activateRecovery']>[0]) {
    this.recoveryProgress = { ...this.recoveryProgress, phase: 'applied' }
    this.identity = IDENTITY
    return this.reject(this.recoveryProgress)
  }
  getRecoveryStatus(_request: Parameters<AwikiSdkClient['getRecoveryStatus']>[0]) {
    return this.reject(this.recoveryProgress)
  }
  resumeRecovery(_request: Parameters<AwikiSdkClient['resumeRecovery']>[0]) {
    this.recoveryProgress = { ...this.recoveryProgress, phase: 'applied' }
    this.identity = IDENTITY
    return this.reject(this.recoveryProgress)
  }
  discardRecovery(_request: Parameters<AwikiSdkClient['discardRecovery']>[0]) {
    return this.reject(undefined)
  }
  resolvePeer(peer: string) {
    return this.reject<AwikiResolvedPeer>({
      did: 'did:awiki:bob' as AwikiDid,
      handle: 'bob' as AwikiHandle,
      conversationId: MESSAGE.conversationId,
      ...(peer.trim() === '' ? { did: 'did:awiki:bob' as AwikiDid } : {}),
    })
  }
  createGroup(name: string) {
    this.createdGroupNames.push(name)
    return this.reject({ ...CREATED_GROUP, title: name })
  }
  addGroupMember(groupDid: AwikiDid, member: string) {
    this.addedGroupMembers.push({ groupDid, member })
    if (this.groupMemberFailures.has(member)) {
      return Promise.reject(Object.assign(new Error('private group member failure'), {
        name: 'AwikiSdkError', code: 'not-found', privateToken: 'must-not-leak',
      }))
    }
    return this.reject<AwikiGroupMember>({
      did: `did:awiki:${member}` as AwikiDid,
      handle: member as AwikiHandle,
    })
  }
  getGroup(groupDid: AwikiDid) {
    return this.reject({ ...this.groupSnapshot, groupDid })
  }
  joinGroup(groupDid: AwikiDid) {
    this.groupSnapshot = { ...this.groupSnapshot, groupDid, membershipStatus: 'active' }
    return this.reject(this.groupSnapshot)
  }
  leaveGroup(groupDid: AwikiDid) {
    this.leftGroups.push(groupDid)
    return this.reject(undefined)
  }
  listGroupMembers(request: AwikiGroupMembersRequest) {
    this.groupMemberPages.push({ ...request })
    return this.reject({ ...this.groupMembers, pageGroup: request.groupDid })
  }
  removeGroupMember(groupDid: AwikiDid, member: string) {
    this.removedGroupMembers.push({ groupDid, member })
    return this.reject<AwikiGroupMember>({
      did: (member.startsWith('did:') ? member : `did:awiki:${member}`) as AwikiDid,
      ...member.startsWith('did:') ? {} : { handle: member as AwikiHandle },
    })
  }
  resumeGroupRebindRecovery() {
    this.groupRecoveryCalls += 1
    return this.reject({ processed: 0, completed: 0, pending: 0, blocked: 0, items: [] })
  }
  listConversations(_request?: Parameters<AwikiSdkClient['listConversations']>[0]) { return this.reject(CONVERSATIONS) }
  getHistory(request: Parameters<AwikiSdkClient['getHistory']>[0]) {
    this.historyRequest = request
    return this.reject({ items: this.history, hasMore: this.historyHasMore })
  }
  getLocalHistory(request: Parameters<AwikiSdkClient['getLocalHistory']>[0]) {
    this.historyRequest = request
    return this.reject({ items: this.history, hasMore: this.historyHasMore })
  }
  markConversationRead(conversationId: Parameters<AwikiSdkClient['markConversationRead']>[0]) {
    this.markedConversation = conversationId
    return this.reject(1)
  }
  sendText(request: Parameters<AwikiSdkClient['sendText']>[0]) {
    this.sentTexts += 1
    return this.reject({
      ...MESSAGE,
      conversationKind: request.target.kind,
      content: {
        kind: 'text' as const,
        text: request.text,
        ...request.mentions === undefined ? {} : { mentions: request.mentions },
      },
    })
  }
  sendAttachment(request: Parameters<AwikiSdkClient['sendAttachment']>[0]) {
    this.sentAttachments += 1
    this.attachmentBytes = request.attachment.bytes.slice()
    return this.reject({
      ...MESSAGE,
      content: {
        kind: 'attachment' as const,
        attachment: { ...ATTACHMENT, size: request.attachment.bytes.byteLength },
        ...request.caption === undefined ? {} : { caption: request.caption },
      },
    })
  }
  downloadAttachment(_request: Parameters<AwikiSdkClient['downloadAttachment']>[0]) {
    return this.reject({ attachment: ATTACHMENT, bytes: new TextEncoder().encode('hello') })
  }
  getMailAccount() {
    this.mailAccountCalls += 1
    return this.reject(this.mailAccount)
  }
  listMailInbox(request?: Parameters<AwikiSdkClient['listMailInbox']>[0]) {
    this.mailInboxCalls += 1
    this.mailInboxRequest = request
    return this.reject(this.mailInbox)
  }
  readMail(request: Parameters<AwikiSdkClient['readMail']>[0]) {
    this.mailReadCalls += 1
    this.mailReadRequest = request
    return this.reject(this.mailMessage)
  }
  markMailRead(request: Parameters<AwikiSdkClient['markMailRead']>[0]) {
    this.mailMarkReadCalls += 1
    this.mailMarkReadRequest = { messageIds: [...request.messageIds] }
    return this.reject({ updated: request.messageIds.length })
  }
  sendMail(request: Parameters<AwikiSdkClient['sendMail']>[0]) {
    this.mailSendCalls += 1
    this.mailSendRequest = {
      to: [...request.to],
      ...request.cc === undefined ? {} : { cc: [...request.cc] },
      subject: request.subject,
      bodyText: request.bodyText,
    }
    return this.reject({ accepted: true, messageId: 'mail-sent-1' as AwikiMailMessageId, warnings: [] })
  }
  clearLocalData() {
    this.localDataCleared += 1
    this.identity = null
    return this.reject({ cleared: true })
  }
  async dispose() { this.disposed += 1 }
}

export interface TestHarness {
  readonly ctx: Context
  readonly serviceFiber: ReturnType<Context['plugin']>
  readonly providerFiber: ReturnType<Context['plugin']>
  readonly client: FakeAwikiClient
  readonly options: AwikiClientOptions
}

class TestSettingsProvider extends SettingsProvider {
  override readonly writable = true

  protected load(): Promise<Record<string, unknown>> {
    return Promise.resolve({})
  }

  protected persist(_ns: SettingsNamespace, _section: Record<string, unknown>): Promise<void> {
    return Promise.resolve()
  }
}

export async function installTestSettings(ctx: Context): Promise<void> {
  await ctx.plugin(TestSettingsProvider)
}

/** Mount the shipping service and one effect-owned fake provider. */
export async function setup(config: Partial<ConstructorParameters<typeof AwikiService>[1]> = {}): Promise<TestHarness> {
  const ctx = new Context()
  const generatedStateRoot = config.stateRoot === undefined
    ? await mkdtemp(join(tmpdir(), 'dsh-awiki-host-test-'))
    : undefined
  if (generatedStateRoot !== undefined) {
    ctx.effect(() => () => rm(generatedStateRoot, { recursive: true, force: true }), 'remove AWiki test state')
  }
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(ApprovalService)
  await installTestSettings(ctx)
  const serviceFiber = ctx.plugin(AwikiService, {
    userServiceUrl: 'https://users.awiki.example',
    userServiceDomain: 'awiki.example',
    messageServiceUrl: 'https://messages.awiki.example',
    messageServicePublicUrl: 'https://messages.awiki.example',
    messageServiceDid: 'did:wba:messages.awiki.example',
    stateRoot: generatedStateRoot,
    ...config,
  })
  await serviceFiber
  const client = new FakeAwikiClient()
  let options: AwikiClientOptions | undefined
  const providerPlugin = Object.assign((providerCtx: Context) => {
    providerCtx.effect(() => providerCtx.awiki.registerClientFactory((value) => {
      options = value
      return client
    }), 'fake AWiki client')
  }, { inject: ['awiki'] })
  const providerFiber = ctx.plugin(providerPlugin)
  await providerFiber
  if (options === undefined) throw new Error('AWiki fake provider did not receive its resolved options')
  return { ctx, serviceFiber, providerFiber, client, options }
}

/** Live-enough Agent with an open turn for approval audit. */
export function testAgent(ctx: Context): Agent {
  const scope = ctx.plugin(() => {})
  const id = SessionId('awiki-agent')
  const session = Session.create(id)
  session.append('turn/start', { turn: 1 })
  const agent: Agent = {
    id,
    options: {},
    session,
    inbox: new Inbox(session, { inserted: () => {}, discarded: () => {}, claimed: () => {} }),
    status: 'idle',
    ctx: scope.ctx,
    followup: () => {},
    steer: () => {},
    inject: () => {},
    send: () => {},
    cancel: () => {},
    runMaintenance: task => task(new AbortController().signal),
    whenIdle: () => Promise.resolve(),
  }
  ctx.agents.register(agent)
  return agent
}

/** Execute one tool with stable execution identity. */
export function executeTool(ctx: Context, agent: Agent, name: string, args: unknown) {
  return ctx.tools.execute({
    signal: new AbortController().signal,
    callId: CallId(`call-${name}`),
    name,
    arguments: args,
    agent,
  })
}
