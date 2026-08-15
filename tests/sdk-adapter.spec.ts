import { describe, expect, it } from 'vitest'
import type {
  AwikiConversation as SdkConversation,
  AwikiCursor as SdkCursor,
  AwikiIdentity as SdkIdentity,
  AwikiImClient,
  AwikiMessage as SdkMessage,
  AwikiPage as SdkPage,
} from '@anp/typescript-sdk'
import { TypeScriptSdkAdapter, downloadedAttachment } from '../src/sdk-adapter.ts'
import type { AwikiSdkSendAttachmentRequest } from '../src/provider-api.ts'

const SDK_IDENTITY: SdkIdentity = {
  handle: 'alice' as never,
  did: 'did:wba:alice.example' as never,
  displayName: 'Alice',
  registeredAt: 1,
}

const SDK_ATTACHMENT = {
  id: 'attachment-1' as never,
  fileName: 'hello.txt',
  mimeType: 'text/plain',
  size: 5,
  sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
}

function sdkMessage(
  content: SdkMessage['content'],
  senderHandle?: string,
  senderDisplayName?: string,
): SdkMessage {
  return {
    id: 'message-1' as never,
    conversationId: 'conversation-1' as never,
    conversationKind: 'direct',
    senderDid: 'did:wba:alice.example' as never,
    ...senderHandle === undefined ? {} : { senderHandle: senderHandle as never },
    ...senderDisplayName === undefined ? {} : { senderDisplayName },
    sentAt: 2,
    outgoing: true,
    content,
  }
}

interface SdkFixture {
  readonly adapter: TypeScriptSdkAdapter
  readonly client: AwikiImClient
  identity: SdkIdentity | null
  conversations: readonly SdkConversation[]
  conversationCursor: SdkCursor | undefined
  history: readonly SdkMessage[]
  historyCursor: SdkCursor | undefined
  sentMessage: SdkMessage
  lastPeer: string | undefined
  lastOtp: Parameters<AwikiImClient['sendRegistrationOtp']>[0] | undefined
  lastRegistration: Parameters<AwikiImClient['registerIdentity']>[0] | undefined
  lastDisplayNameUpdate: Parameters<AwikiImClient['updateDisplayName']>[0] | undefined
  lastList: Parameters<AwikiImClient['listConversations']>[0] | undefined
  lastHistory: Parameters<AwikiImClient['getHistory']>[0] | undefined
  lastMarkedConversation: Parameters<AwikiImClient['markConversationRead']>[0] | undefined
  lastText: Parameters<AwikiImClient['sendText']>[0] | undefined
  lastAttachment: Parameters<AwikiImClient['sendAttachment']>[0] | undefined
  lastDownload: Parameters<AwikiImClient['downloadAttachment']>[0] | undefined
  localDataCleared: number
  disposed: number
}

function sdkFixture(): SdkFixture {
  const fixture: Omit<SdkFixture, 'adapter' | 'client'> = {
    identity: SDK_IDENTITY,
    conversations: [],
    conversationCursor: undefined,
    history: [],
    historyCursor: undefined,
    sentMessage: sdkMessage({ kind: 'text', text: 'sent' }),
    lastPeer: undefined,
    lastOtp: undefined,
    lastRegistration: undefined,
    lastDisplayNameUpdate: undefined,
    lastList: undefined,
    lastHistory: undefined,
    lastMarkedConversation: undefined,
    lastText: undefined,
    lastAttachment: undefined,
    lastDownload: undefined,
    localDataCleared: 0,
    disposed: 0,
  }
  const client: AwikiImClient = {
    getIdentity: () => Promise.resolve(fixture.identity),
    sendRegistrationOtp: (request) => {
      fixture.lastOtp = request
      return Promise.resolve({ retryAfterSeconds: 30, retryAt: '2026-08-14T00:00:30Z' })
    },
    registerIdentity: (request) => {
      fixture.lastRegistration = request
      return Promise.resolve(SDK_IDENTITY)
    },
    updateDisplayName: (request) => {
      fixture.lastDisplayNameUpdate = request
      return Promise.resolve({ ...SDK_IDENTITY, displayName: request.displayName })
    },
    resolvePeer: (peer) => {
      fixture.lastPeer = peer
      return Promise.resolve({
        did: 'did:wba:bob.example' as SdkIdentity['did'],
        handle: 'bob.example' as SdkIdentity['handle'],
        displayName: 'Bob',
        conversationId: 'c-bob' as SdkConversation['id'],
      })
    },
    listConversations: (request) => {
      fixture.lastList = request
      return Promise.resolve({
        items: fixture.conversations,
        ...fixture.conversationCursor === undefined ? {} : { nextCursor: fixture.conversationCursor },
        hasMore: fixture.conversationCursor !== undefined,
      } satisfies SdkPage<SdkConversation>)
    },
    getHistory: (request) => {
      fixture.lastHistory = request
      return Promise.resolve({
        items: fixture.history,
        ...fixture.historyCursor === undefined ? {} : { nextCursor: fixture.historyCursor },
        hasMore: fixture.historyCursor !== undefined,
      } satisfies SdkPage<SdkMessage>)
    },
    markConversationRead: (conversationId) => {
      fixture.lastMarkedConversation = conversationId
      return Promise.resolve(1)
    },
    sendText: (request) => {
      fixture.lastText = request
      return Promise.resolve(fixture.sentMessage)
    },
    sendAttachment: (request) => {
      fixture.lastAttachment = request
      return Promise.resolve(fixture.sentMessage)
    },
    downloadAttachment: (request) => {
      fixture.lastDownload = request
      return Promise.resolve({ attachment: SDK_ATTACHMENT, bytes: new Uint8Array([1, 2, 3]) })
    },
    clearLocalData: () => {
      fixture.localDataCleared += 1
      return Promise.resolve({ cleared: true })
    },
    dispose: () => {
      fixture.disposed += 1
      return Promise.resolve()
    },
  }
  return Object.assign(fixture, { adapter: new TypeScriptSdkAdapter(client), client })
}

describe('AWiki TypeScript SDK adapter', () => {
  it('copies identity and registration values in both identity states', async () => {
    const fixture = sdkFixture()
    await expect(fixture.adapter.getIdentity()).resolves.toEqual({
      handle: 'alice', did: 'did:wba:alice.example', displayName: 'Alice', registeredAt: 1,
    })
    fixture.identity = null
    await expect(fixture.adapter.getIdentity()).resolves.toBeNull()

    await expect(fixture.adapter.sendRegistrationOtp({ handle: 'alice', phone: '+15555550123' })).resolves.toEqual({
      retryAfterSeconds: 30,
      retryAt: '2026-08-14T00:00:30Z',
    })
    expect(fixture.lastOtp).toEqual({ handle: 'alice', phone: '+15555550123' })
    await expect(fixture.adapter.registerIdentity({ handle: 'alice', phone: '+15555550123', otp: '123456' })).resolves.toEqual({
      handle: 'alice', did: 'did:wba:alice.example', displayName: 'Alice', registeredAt: 1,
    })
    expect(fixture.lastRegistration).toEqual({ handle: 'alice', phone: '+15555550123', otp: '123456' })
    await expect(fixture.adapter.updateDisplayName({ displayName: '新昵称' })).resolves.toEqual({
      handle: 'alice', did: 'did:wba:alice.example', displayName: '新昵称', registeredAt: 1,
    })
    expect(fixture.lastDisplayNameUpdate).toEqual({ displayName: '新昵称' })
    await expect(fixture.adapter.resolvePeer('bob.example')).resolves.toEqual({
      did: 'did:wba:bob.example',
      handle: 'bob.example',
      displayName: 'Bob',
      conversationId: 'c-bob',
    })
    expect(fixture.lastPeer).toBe('bob.example')
    fixture.client.resolvePeer = () => Promise.resolve({
      did: 'did:wba:erin.example' as SdkIdentity['did'],
      conversationId: 'c-erin' as SdkConversation['id'],
    })
    await expect(fixture.adapter.resolvePeer('did:wba:erin.example')).resolves.toEqual({
      did: 'did:wba:erin.example',
      conversationId: 'c-erin',
    })
  })

  it('copies every conversation variant and optional field', async () => {
    const fixture = sdkFixture()
    fixture.conversations = [
      {
        kind: 'direct', id: 'direct-1' as never, peerDid: 'did:wba:bob.example' as never,
        peerHandle: 'bob' as never, displayName: 'Bob', title: 'Bob', unreadCount: 2, lastMessageAt: 3,
        lastMessagePreview: 'hello',
      },
      {
        kind: 'direct', id: 'direct-2' as never, peerDid: 'did:wba:carol.example' as never,
        title: 'Carol',
      },
      {
        kind: 'group', id: 'group-1' as never, groupDid: 'did:wba:group.example' as never,
        title: 'Group', lastMessageAt: 4, lastMessagePreview: '[附件] report.txt',
      },
      {
        kind: 'group', id: 'group-2' as never, groupDid: 'did:wba:quiet-group.example' as never,
        title: 'Quiet group',
      },
    ]
    fixture.conversationCursor = 'next-conversations' as SdkCursor
    await expect(fixture.adapter.listConversations({ cursor: 'input-cursor' as never, limit: 4 })).resolves.toEqual({
      items: [
        expect.objectContaining({ kind: 'direct', peerHandle: 'bob', displayName: 'Bob', unreadCount: 2, lastMessageAt: 3, lastMessagePreview: 'hello' }),
        { kind: 'direct', id: 'direct-2', peerDid: 'did:wba:carol.example', title: 'Carol' },
        expect.objectContaining({ kind: 'group', lastMessageAt: 4, lastMessagePreview: '[附件] report.txt' }),
        { kind: 'group', id: 'group-2', groupDid: 'did:wba:quiet-group.example', title: 'Quiet group' },
      ],
      nextCursor: 'next-conversations',
      hasMore: true,
    })
    expect(fixture.lastList).toEqual({ cursor: 'input-cursor', limit: 4 })

    await expect(fixture.adapter.markConversationRead('direct-1' as never)).resolves.toBe(1)
    expect(fixture.lastMarkedConversation).toBe('direct-1')

    fixture.conversations = [{ kind: 'unsupported' } as unknown as SdkConversation]
    await expect(fixture.adapter.listConversations()).rejects.toThrow('unsupported conversation kind')
    expect(fixture.lastList).toBeUndefined()
  })

  it('copies text and attachment messages, pagination, and send requests', async () => {
    const fixture = sdkFixture()
    fixture.history = [
      sdkMessage({ kind: 'text', text: 'hello' }),
      sdkMessage({ kind: 'attachment', attachment: SDK_ATTACHMENT }),
      sdkMessage(
        { kind: 'attachment', attachment: SDK_ATTACHMENT, caption: 'caption' },
        'alice',
        'Alice',
      ),
    ]
    fixture.historyCursor = 'next-history' as SdkCursor
    await expect(fixture.adapter.getHistory({
      conversationId: 'conversation-1' as never,
      cursor: 'history-cursor' as never,
      limit: 3,
    })).resolves.toEqual({
      items: [
        {
          id: 'message-1', conversationId: 'conversation-1', conversationKind: 'direct',
          senderDid: 'did:wba:alice.example', sentAt: 2, outgoing: true,
          content: { kind: 'text', text: 'hello' },
        },
        {
          id: 'message-1', conversationId: 'conversation-1', conversationKind: 'direct',
          senderDid: 'did:wba:alice.example', sentAt: 2, outgoing: true,
          content: { kind: 'attachment', attachment: SDK_ATTACHMENT },
        },
        {
          id: 'message-1', conversationId: 'conversation-1', conversationKind: 'direct',
          senderDid: 'did:wba:alice.example', senderHandle: 'alice', senderDisplayName: 'Alice',
          sentAt: 2, outgoing: true,
          content: { kind: 'attachment', attachment: SDK_ATTACHMENT, caption: 'caption' },
        },
      ],
      nextCursor: 'next-history',
      hasMore: true,
    })
    expect(fixture.lastHistory).toEqual({ conversationId: 'conversation-1', cursor: 'history-cursor', limit: 3 })

    fixture.history = []
    fixture.historyCursor = undefined
    await expect(fixture.adapter.getHistory({ conversationId: 'conversation-2' as never })).resolves.toEqual({
      items: [], hasMore: false,
    })
    expect(fixture.lastHistory).toEqual({ conversationId: 'conversation-2' })

    fixture.sentMessage = sdkMessage({ kind: 'text', text: 'outgoing' })
    await expect(fixture.adapter.sendText({
      target: { kind: 'direct', peer: 'bob' }, text: 'outgoing', idempotencyKey: 'text-1',
    })).resolves.toMatchObject({ content: { kind: 'text', text: 'outgoing' } })
    expect(fixture.lastText).toEqual({ target: { kind: 'direct', peer: 'bob' }, text: 'outgoing', idempotencyKey: 'text-1' })

    fixture.sentMessage = sdkMessage({ kind: 'attachment', attachment: SDK_ATTACHMENT, caption: 'sent file' })
    const upload: AwikiSdkSendAttachmentRequest = {
      target: { kind: 'group', group: 'group-1' },
      attachment: { fileName: 'hello.txt', mimeType: 'text/plain', bytes: new Uint8Array([1, 2, 3]) },
      caption: 'sent file',
      idempotencyKey: 'attachment-1',
    }
    await expect(fixture.adapter.sendAttachment(upload)).resolves.toMatchObject({
      content: { kind: 'attachment', caption: 'sent file' },
    })
    expect(fixture.lastAttachment).toEqual(upload)
    const { caption: _caption, ...noCaption } = upload
    await fixture.adapter.sendAttachment(noCaption)
    expect(fixture.lastAttachment).not.toHaveProperty('caption')
  })

  it('copies downloads, detaches bytes, renders Base64, and delegates disposal', async () => {
    const fixture = sdkFixture()
    const result = await fixture.adapter.downloadAttachment({
      attachmentId: 'attachment-1' as never,
      messageId: 'message-1' as never,
    })
    expect(fixture.lastDownload).toEqual({ attachmentId: 'attachment-1', messageId: 'message-1' })
    expect(result).toEqual({ attachment: SDK_ATTACHMENT, bytes: new Uint8Array([1, 2, 3]) })
    expect(result.bytes).not.toBe((await fixture.client.downloadAttachment(fixture.lastDownload!)).bytes)
    expect(downloadedAttachment(result)).toEqual({ attachment: SDK_ATTACHMENT, bytesBase64: 'AQID' })
    await expect(fixture.adapter.clearLocalData()).resolves.toEqual({ cleared: true })
    expect(fixture.localDataCleared).toBe(1)
    await fixture.adapter.dispose()
    expect(fixture.disposed).toBe(1)
  })
})
