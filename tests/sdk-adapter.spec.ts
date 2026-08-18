import { describe, expect, it } from 'vitest'
import type {
  ExternalHttpAuthAttempt,
  ExternalHttpRequest,
  ImCoreNodeClient,
  NodeConversation,
  NodeIdentity,
  NodeMessage,
  Page,
  PageInput,
  SendAttachmentInput,
  SendTextInput,
} from '@awiki/im-core-node'
import { AwikiSdkError, RustSdkAdapter, downloadedAttachment } from '../src/sdk-adapter.ts'
import type { AwikiSdkSendAttachmentRequest } from '../src/provider-api.ts'

const SHA256 = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
const SENT_AT = '2026-08-14T00:00:00.002Z'

const NODE_IDENTITY: NodeIdentity = {
  identityId: 'identity-1',
  handle: 'alice',
  did: 'did:wba:alice.example',
  displayName: 'Alice',
  isDefault: true,
  registeredAtMs: '1',
}

const NODE_ATTACHMENT = {
  id: 'attachment-1',
  fileName: 'hello.txt',
  mimeType: 'text/plain',
  sizeBytes: '5',
  digestB64u: Buffer.from(SHA256, 'hex').toString('base64url'),
  sha256Hex: SHA256,
}

function nodeMessage(content: NodeMessage['content'], conversationId = 'conversation-1'): NodeMessage {
  return {
    id: 'message-1',
    conversationId,
    conversationKind: conversationId.startsWith('group:') ? 'group' : 'direct',
    senderDid: 'did:wba:alice.example',
    senderHandle: 'alice',
    senderDisplayName: 'Alice',
    sentAt: SENT_AT,
    outgoing: true,
    content,
  }
}

const DIRECT_CONVERSATION: NodeConversation = {
  id: 'conversation-1',
  kind: 'direct',
  peerDid: 'did:wba:bob.example',
  peerHandle: 'bob.example',
  title: 'Bob',
  participants: ['did:wba:alice.example', 'did:wba:bob.example'],
  unreadCount: 2,
  messageCount: 1,
  lastMessageAt: SENT_AT,
  lastMessage: nodeMessage({ kind: 'text', text: 'hello' }),
}

const GROUP_CONVERSATION: NodeConversation = {
  id: 'group:canonical-team',
  kind: 'group',
  groupDid: 'did:wba:team.example',
  participants: ['did:wba:alice.example'],
  unreadCount: 0,
  messageCount: 0,
}

interface RustFixture {
  readonly adapter: RustSdkAdapter
  readonly client: ImCoreNodeClient
  identity: NodeIdentity | null
  conversationPages: Page<NodeConversation>[]
  history: Page<NodeMessage>
  sentMessage: NodeMessage
  lastPeer: string | undefined
  lastOtp: Parameters<ImCoreNodeClient['requestRegistrationOtp']>[0] | undefined
  lastRegistration: Parameters<ImCoreNodeClient['completeRegistration']>[0] | undefined
  lastDisplayName: string | undefined
  listCalls: PageInput[]
  lastHistory: Parameters<ImCoreNodeClient['getHistory']>[0] | undefined
  lastLocalHistory: Parameters<ImCoreNodeClient['getLocalConversationTimeline']>[0] | undefined
  lastMarkedConversation: string | undefined
  lastText: SendTextInput | undefined
  lastAttachment: SendAttachmentInput | undefined
  lastDownload: Parameters<ImCoreNodeClient['downloadAttachment']>[0] | undefined
  lastExternalHttp: ExternalHttpRequest | undefined
  lastExternalResponse: Parameters<ExternalHttpAuthAttempt['handleResponse']>[0] | undefined
  localDataCleared: number
  closed: number
}

function rustFixture(): RustFixture {
  const fixture: Omit<RustFixture, 'adapter' | 'client'> = {
    identity: NODE_IDENTITY,
    conversationPages: [{ items: [DIRECT_CONVERSATION, GROUP_CONVERSATION], hasMore: false }],
    history: { items: [], hasMore: false },
    sentMessage: nodeMessage({ kind: 'text', text: 'sent' }),
    lastPeer: undefined,
    lastOtp: undefined,
    lastRegistration: undefined,
    lastDisplayName: undefined,
    listCalls: [],
    lastHistory: undefined,
    lastLocalHistory: undefined,
    lastMarkedConversation: undefined,
    lastText: undefined,
    lastAttachment: undefined,
    lastDownload: undefined,
    lastExternalHttp: undefined,
    lastExternalResponse: undefined,
    localDataCleared: 0,
    closed: 0,
  }
  const client: ImCoreNodeClient = {
    prepareExternalHttpRequest: (input) => {
      fixture.lastExternalHttp = input
      return Promise.resolve({
        targetUrl: input.url,
        method: input.method,
        headerPatch: [{ name: 'Signature', value: 'sig1=:native:' }],
        retryCount: 0,
        handleResponse: (response) => {
          fixture.lastExternalResponse = response
          return Promise.resolve(null)
        },
      })
    },
    getDefaultIdentity: () => Promise.resolve(fixture.identity),
    listIdentities: () => Promise.resolve(fixture.identity === null ? [] : [fixture.identity]),
    forIdentity: () => Promise.resolve({
      getIdentity: () => Promise.resolve(NODE_IDENTITY),
      updateDisplayName: displayName => Promise.resolve({ ...NODE_IDENTITY, displayName }),
      resolvePeer: peer => client.resolvePeer(peer),
      syncNow: input => client.syncNow(input),
      listConversations: input => client.listConversations(input),
      getHistory: input => client.getHistory(input),
      getLocalConversationTimeline: input => client.getLocalConversationTimeline(input),
      markConversationRead: conversationId => client.markConversationRead(conversationId),
      sendText: input => client.sendText(input),
      sendAttachment: input => client.sendAttachment(input),
      downloadAttachment: input => client.downloadAttachment(input),
    }),
    provisionSkillAgentIdentity: input => Promise.resolve({
      ...NODE_IDENTITY,
      identityId: input.operationId,
      displayName: input.displayName,
      isDefault: false,
    }),
    acknowledgeSkillAgentProvision: () => Promise.resolve(),
    requestRegistrationOtp: (input) => {
      fixture.lastOtp = input
      return Promise.resolve({ retryAfterSeconds: 30, retryAt: '2026-08-14T00:00:30Z' })
    },
    completeRegistration: (input) => {
      fixture.lastRegistration = input
      return Promise.resolve(NODE_IDENTITY)
    },
    updateDisplayName: (displayName) => {
      fixture.lastDisplayName = displayName
      return Promise.resolve({ ...NODE_IDENTITY, displayName })
    },
    resolvePeer: (peer) => {
      fixture.lastPeer = peer
      return Promise.resolve({
        did: 'did:wba:bob.example',
        handle: 'bob.example',
        displayName: 'Bob',
        conversationId: 'direct:canonical-bob',
      })
    },
    syncNow: () => Promise.resolve({
      status: 'idle', eventsApplied: 0, pagesFetched: 0, messagesHydrated: 0,
      duplicatesSkipped: 0, changedConversationIds: [], warnings: [],
    }),
    listConversations: (input = {}) => {
      fixture.listCalls.push(input)
      const index = input.cursor === undefined ? 0 : Number(input.cursor.slice('page-'.length)) - 1
      const value = fixture.conversationPages[index]
      if (value === undefined) throw new Error('missing fixture conversation page')
      return Promise.resolve(value)
    },
    getHistory: (input) => {
      fixture.lastHistory = input
      return Promise.resolve(fixture.history)
    },
    getLocalConversationTimeline: (input) => {
      fixture.lastLocalHistory = input
      return Promise.resolve(fixture.history)
    },
    markConversationRead: (conversationId) => {
      fixture.lastMarkedConversation = conversationId
      return Promise.resolve({
        updatedCount: 1, remoteAcknowledged: true, partial: false, fallbackUsed: false,
        pendingRemoteAck: false, warnings: [],
      })
    },
    sendText: (input) => {
      fixture.lastText = input
      return Promise.resolve({ ...fixture.sentMessage, conversationId: input.conversationId })
    },
    sendAttachment: (input) => {
      fixture.lastAttachment = input
      return Promise.resolve({ ...fixture.sentMessage, conversationId: input.conversationId })
    },
    downloadAttachment: (input) => {
      fixture.lastDownload = input
      return Promise.resolve({ attachment: NODE_ATTACHMENT, bytes: new Uint8Array([1, 2, 3, 4, 5]) })
    },
    clearLocalData: () => {
      fixture.localDataCleared += 1
      return Promise.resolve({ cleared: true })
    },
    close: () => {
      fixture.closed += 1
      return Promise.resolve()
    },
  }
  return Object.assign(fixture, { adapter: new RustSdkAdapter(client), client })
}

describe('AWiki Rust SDK adapter', () => {
  it('copies external HTTP bytes, header patches, and response metadata', async () => {
    const fixture = rustFixture()
    const body = new Uint8Array([1, 2, 3])
    const attempt = await fixture.adapter.prepareExternalHttpRequest({
      url: 'https://api.example/orders',
      method: 'POST',
      headers: [{ name: 'content-type', value: 'application/octet-stream' }],
      body,
    })
    body[0] = 9
    expect(fixture.lastExternalHttp?.body).toEqual(new Uint8Array([1, 2, 3]))
    expect(attempt).toMatchObject({
      targetUrl: 'https://api.example/orders',
      method: 'POST',
      headerPatch: [{ name: 'Signature', value: 'sig1=:native:' }],
      retryCount: 0,
    })
    await expect(attempt.handleResponse({
      statusCode: 200,
      headers: [{ name: 'authentication-info', value: 'access_token="redacted"' }],
    })).resolves.toBeNull()
    expect(fixture.lastExternalResponse).toEqual({
      statusCode: 200,
      headers: [{ name: 'authentication-info', value: 'access_token="redacted"' }],
    })
  })

  it('copies identity, registration, display-name, and peer values', async () => {
    const fixture = rustFixture()
    await expect(fixture.adapter.getIdentity()).resolves.toEqual({
      identityId: 'identity-1', handle: 'alice', did: 'did:wba:alice.example',
      displayName: 'Alice', registeredAt: 1, isDefault: true,
    })
    fixture.identity = null
    await expect(fixture.adapter.getIdentity()).resolves.toBeNull()

    await expect(fixture.adapter.sendRegistrationOtp({ handle: 'alice', phone: '+15555550123' })).resolves.toEqual({
      retryAfterSeconds: 30,
      retryAt: '2026-08-14T00:00:30Z',
    })
    expect(fixture.lastOtp).toEqual({ handle: 'alice', phone: '+15555550123' })
    await expect(fixture.adapter.registerIdentity({ handle: 'alice', phone: '+15555550123', otp: '123456' })).resolves.toMatchObject({
      handle: 'alice', did: 'did:wba:alice.example', registeredAt: 1,
    })
    expect(fixture.lastRegistration).toEqual({ handle: 'alice', phone: '+15555550123', otp: '123456' })
    await expect(fixture.adapter.updateDisplayName({ displayName: '新昵称' })).resolves.toMatchObject({ displayName: '新昵称' })
    expect(fixture.lastDisplayName).toBe('新昵称')
    await expect(fixture.adapter.resolvePeer('bob.example')).resolves.toEqual({
      did: 'did:wba:bob.example', handle: 'bob.example', displayName: 'Bob',
      conversationId: 'direct:canonical-bob',
    })
    expect(fixture.lastPeer).toBe('bob.example')
  })

  it('copies canonical conversations, pagination, previews, and mark-read results', async () => {
    const fixture = rustFixture()
    await expect(fixture.adapter.listConversations({ cursor: 'page-1' as never, limit: 2 })).resolves.toEqual({
      items: [
        {
          kind: 'direct', id: 'conversation-1', peerDid: 'did:wba:bob.example',
          peerHandle: 'bob.example', title: 'Bob', unreadCount: 2,
          lastMessageAt: Date.parse(SENT_AT), lastMessagePreview: 'hello',
        },
        {
          kind: 'group', id: 'group:canonical-team', groupDid: 'did:wba:team.example',
          title: 'did:wba:team.example', unreadCount: 0,
        },
      ],
      hasMore: false,
    })
    expect(fixture.listCalls).toEqual([{ cursor: 'page-1', limit: 2 }])
    await expect(fixture.adapter.markConversationRead('conversation-1' as never)).resolves.toBe(1)
    expect(fixture.lastMarkedConversation).toBe('conversation-1')
  })

  it('uses canonical conversation ids for direct and paginated group sends', async () => {
    const fixture = rustFixture()
    await fixture.adapter.sendText({
      target: { kind: 'direct', peer: 'bob.example' }, text: 'hello', idempotencyKey: 'text-1',
    })
    expect(fixture.lastText).toEqual({
      conversationId: 'direct:canonical-bob', text: 'hello', idempotencyKey: 'text-1',
    })

    fixture.conversationPages = [
      { items: [DIRECT_CONVERSATION], nextCursor: 'page-2', hasMore: true },
      { items: [GROUP_CONVERSATION], hasMore: false },
    ]
    fixture.sentMessage = nodeMessage({ kind: 'attachment', attachment: NODE_ATTACHMENT, caption: 'sent file' }, 'group:canonical-team')
    const upload: AwikiSdkSendAttachmentRequest = {
      target: { kind: 'group', group: 'did:wba:team.example' },
      attachment: { fileName: 'hello.txt', mimeType: 'text/plain', bytes: new Uint8Array([1, 2, 3]) },
      caption: 'sent file',
      idempotencyKey: 'attachment-1',
    }
    await expect(fixture.adapter.sendAttachment(upload)).resolves.toMatchObject({
      conversationId: 'group:canonical-team',
      content: { kind: 'attachment', caption: 'sent file' },
    })
    expect(fixture.listCalls.slice(-2)).toEqual([
      { limit: 100 },
      { cursor: 'page-2', limit: 100 },
    ])
    expect(fixture.lastAttachment).toEqual({
      conversationId: 'group:canonical-team', fileName: 'hello.txt', mimeType: 'text/plain',
      bytes: upload.attachment.bytes, caption: 'sent file', idempotencyKey: 'attachment-1',
    })
  })

  it('normalizes newest-first Rust history to chronological order and downloads through the cached conversation', async () => {
    const fixture = rustFixture()
    const withoutHex = { ...NODE_ATTACHMENT, sha256Hex: undefined }
    fixture.history = {
      items: [
        nodeMessage({ kind: 'attachment', attachment: withoutHex, caption: 'caption' }),
        {
          ...nodeMessage({ kind: 'text', text: 'hello' }),
          id: 'message-old' as never,
          sentAt: '2026-08-14T00:00:00.001Z',
        },
      ],
      nextCursor: 'next-history',
      hasMore: true,
    }
    await expect(fixture.adapter.getHistory({
      conversationId: 'conversation-1' as never,
      cursor: 'history-cursor' as never,
      limit: 2,
    })).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: 'message-old',
          content: { kind: 'text', text: 'hello' },
          sentAt: Date.parse('2026-08-14T00:00:00.001Z'),
        }),
        expect.objectContaining({
          content: {
            kind: 'attachment',
            attachment: {
              id: 'attachment-1', fileName: 'hello.txt', mimeType: 'text/plain', size: 5, sha256: SHA256,
            },
            caption: 'caption',
          },
        }),
      ],
      nextCursor: 'next-history',
      hasMore: true,
    })
    expect(fixture.lastHistory).toEqual({
      conversationId: 'conversation-1', cursor: 'history-cursor', limit: 2,
    })
    await expect(fixture.adapter.getLocalHistory({
      conversationId: 'conversation-1' as never,
      limit: 2,
    })).resolves.toEqual({
      items: [
        expect.objectContaining({ id: 'message-old' }),
        expect.objectContaining({ content: expect.objectContaining({ kind: 'attachment' }) }),
      ],
      nextCursor: 'next-history',
      hasMore: true,
    })
    expect(fixture.lastLocalHistory).toEqual({ conversationId: 'conversation-1', limit: 2 })

    const result = await fixture.adapter.downloadAttachment({
      attachmentId: 'attachment-1' as never,
      messageId: 'message-1' as never,
    })
    expect(fixture.lastDownload).toEqual({
      conversationId: 'conversation-1', attachmentId: 'attachment-1', messageId: 'message-1',
    })
    expect(result).toEqual({
      attachment: { id: 'attachment-1', fileName: 'hello.txt', mimeType: 'text/plain', size: 5, sha256: SHA256 },
      bytes: new Uint8Array([1, 2, 3, 4, 5]),
    })
    expect(downloadedAttachment(result)).toEqual({
      attachment: result.attachment,
      bytesBase64: 'AQIDBAU=',
    })
    await expect(fixture.adapter.clearLocalData()).resolves.toEqual({ cleared: true })
    expect(fixture.localDataCleared).toBe(1)
  })

  it('maps native safe errors, fails closed for unknown shapes, and closes once', async () => {
    const fixture = rustFixture()
    fixture.client.resolvePeer = () => Promise.reject(Object.assign(new Error('safe'), {
      name: 'ImCoreNodeError', code: 'transport_unavailable',
    }))
    await expect(fixture.adapter.resolvePeer('bob')).rejects.toMatchObject({
      name: 'AwikiSdkError', code: 'network',
    })
    fixture.client.resolvePeer = () => Promise.reject(Object.assign(new Error('locked'), {
      name: 'ImCoreNodeError', code: 'state_in_use',
    }))
    await expect(fixture.adapter.resolvePeer('bob')).rejects.toMatchObject({
      name: 'AwikiSdkError', code: 'conflict',
    })
    fixture.client.resolvePeer = () => Promise.reject(Object.assign(new Error('join'), {
      name: 'ImCoreNodeError', code: 'join_required',
    }))
    await expect(fixture.adapter.resolvePeer('bob')).rejects.toMatchObject({
      name: 'AwikiSdkError', code: 'handle-unavailable',
    })
    fixture.client.resolvePeer = () => Promise.reject(new Error('private'))
    await expect(fixture.adapter.resolvePeer('bob')).rejects.toEqual(new AwikiSdkError('remote'))
    await expect(rustFixture().adapter.downloadAttachment({
      attachmentId: 'missing' as never,
      messageId: 'missing' as never,
    })).rejects.toMatchObject({ code: 'not-found' })

    const failedOpen = new RustSdkAdapter(Promise.reject(Object.assign(new Error('locked'), {
      name: 'ImCoreNodeError', code: 'state_in_use',
    })))
    await expect(failedOpen.getIdentity()).rejects.toMatchObject({ code: 'conflict' })
    await expect(failedOpen.dispose()).resolves.toBeUndefined()
    await expect(failedOpen.dispose()).resolves.toBeUndefined()

    await Promise.all([fixture.adapter.dispose(), fixture.adapter.dispose()])
    expect(fixture.closed).toBe(1)
  })
})
