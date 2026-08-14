import { Context } from '@deepseek-ai/cordis'
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
  AwikiHandle,
  AwikiIdentity,
  AwikiMessage,
  AwikiMessageId,
  AwikiPage,
  AwikiResolvedPeer,
} from '../src/types.ts'
import type { AwikiClientOptions, AwikiSdkClient } from '../src/provider-api.ts'

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

/** Deterministic high-level client used by Host unit and Loader tests. */
export class FakeAwikiClient implements AwikiSdkClient {
  disposed = 0
  sentTexts = 0
  sentAttachments = 0
  attachmentBytes: Uint8Array | undefined
  markedConversation: AwikiConversationId | undefined
  failure: unknown

  private async reject<Value>(value: Value): Promise<Value> {
    if (this.failure !== undefined) throw this.failure
    return value
  }

  getIdentity() { return this.reject<AwikiIdentity | null>(IDENTITY) }
  sendRegistrationOtp(_request: Parameters<AwikiSdkClient['sendRegistrationOtp']>[0]) {
    return this.reject({ retryAfterSeconds: 60, retryAt: '2026-08-14T00:01:00Z' })
  }
  registerIdentity(_request: Parameters<AwikiSdkClient['registerIdentity']>[0]) { return this.reject(IDENTITY) }
  updateDisplayName(request: Parameters<AwikiSdkClient['updateDisplayName']>[0]) {
    return this.reject({ ...IDENTITY, displayName: request.displayName })
  }
  resolvePeer(peer: string) {
    return this.reject<AwikiResolvedPeer>({
      did: 'did:awiki:bob' as AwikiDid,
      handle: 'bob' as AwikiHandle,
      conversationId: MESSAGE.conversationId,
      ...(peer.trim() === '' ? { did: 'did:awiki:bob' as AwikiDid } : {}),
    })
  }
  listConversations(_request?: Parameters<AwikiSdkClient['listConversations']>[0]) { return this.reject(CONVERSATIONS) }
  getHistory(_request: Parameters<AwikiSdkClient['getHistory']>[0]) {
    return this.reject({ items: [MESSAGE], hasMore: false })
  }
  markConversationRead(conversationId: Parameters<AwikiSdkClient['markConversationRead']>[0]) {
    this.markedConversation = conversationId
    return this.reject(1)
  }
  sendText(_request: Parameters<AwikiSdkClient['sendText']>[0]) {
    this.sentTexts += 1
    return this.reject(MESSAGE)
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
    statePath: '/tmp/awiki-test-state.json',
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
