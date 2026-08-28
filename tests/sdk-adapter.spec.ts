import { describe, expect, it } from 'vitest'
import type {
  ExternalHttpAuthAttempt,
  ExternalHttpRequest,
  GroupMemberPage,
  HandleRecoveryProgress,
  ImCoreNodeClient,
  NodeGroup,
  NodeGroupMember,
  MailAccount,
  MailInboxInput,
  MailInboxPage,
  MailMessage,
  MarkMailReadInput,
  NodeConversation,
  NodeDisplayProfile,
  NodeIdentity,
  NodeMessage,
  NodeProfile,
  Page,
  PageInput,
  SendAttachmentInput,
  SendMailInput,
  SendPayloadInput,
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
  registeredAtMs: '1',
}

const NODE_PROFILE: NodeProfile = {
  did: NODE_IDENTITY.did,
  handle: NODE_IDENTITY.handle,
  displayName: NODE_IDENTITY.displayName,
  bio: 'Builds dependable tools.',
  tags: ['Rust', 'DSH'],
  updatedAt: '2026-08-20T00:00:00Z',
}

const NODE_GROUP: NodeGroup = {
  did: 'did:wba:team.example',
  conversationId: 'group:canonical-team',
  title: 'Release Crew',
  description: 'Desktop release group',
  memberCount: 2,
  myRole: 'owner',
  membershipStatus: 'active',
}

const NODE_GROUP_MEMBERS: GroupMemberPage = {
  items: [
    { did: NODE_IDENTITY.did, handle: NODE_IDENTITY.handle, role: 'owner', status: 'active', subjectType: 'human' },
    { did: 'did:wba:bob.example', handle: 'bob.example', role: 'member', status: 'active', subjectType: 'human' },
  ],
  total: 2,
  nextCursor: 'member-page-2',
  hasMore: true,
  pageGroup: NODE_GROUP.did,
  groupStateVersion: 'version-7',
  warnings: [],
}

const NODE_RECOVERY: HandleRecoveryProgress = {
  operationId: 'recovery-1',
  ownerIdentityId: NODE_IDENTITY.identityId,
  fullHandle: 'alice.example',
  previousDid: 'did:wba:alice.old.example',
  currentDid: NODE_IDENTITY.did,
  phase: 'ready_to_commit',
  retryable: false,
  impact: {
    localOrdinaryDataWillMigrate: true,
    otherDevicesMustRejoin: true,
  },
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

const NODE_MAIL_ACCOUNT: MailAccount = {
  mailboxAddress: 'alice@awiki.example',
  displayName: 'Alice',
  status: 'active',
}

const NODE_MAIL_SUMMARY = {
  id: 'mail-1',
  folder: 'inbox',
  from: ['sender@example.com'],
  to: ['alice@awiki.example'],
  cc: [] as string[],
  subject: 'Status update',
  subjectTruncated: false,
  preview: 'Untrusted mail preview',
  previewTruncated: false,
  receivedAt: '2026-08-18T06:00:00Z',
  unread: true,
  hasAttachments: true,
  attachmentCount: 1,
}

const NODE_MAIL_MESSAGE: MailMessage = {
  summary: NODE_MAIL_SUMMARY,
  bodyText: 'Untrusted mail body',
  bodyTruncated: false,
  hasHtmlBody: true,
  attachments: [{ index: 0, fileName: 'report.txt', contentType: 'text/plain', sizeBytes: '42' }],
}

interface RustFixture {
  readonly adapter: RustSdkAdapter
  readonly client: ImCoreNodeClient
  identity: NodeIdentity | null
  conversationPages: Page<NodeConversation>[]
  history: Page<NodeMessage>
  sentMessage: NodeMessage
  lastPeer: string | undefined
  profiles: NodeDisplayProfile[]
  lastProfilePeers: readonly string[] | undefined
  lastCreatedGroup: Parameters<ImCoreNodeClient['createGroup']>[0] | undefined
  lastAddedGroupMember: Parameters<ImCoreNodeClient['addGroupMember']>[0] | undefined
  syncReasons: string[]
  syncStatus: 'idle' | 'changed' | 'recovery_required' | 'retryable_failure' | 'auth_revoked'
  syncWarnings: string[]
  realtimeStarts: number
  realtimeStops: number
  lastOtp: Parameters<ImCoreNodeClient['requestRegistrationOtp']>[0] | undefined
  lastRegistration: Parameters<ImCoreNodeClient['completeRegistration']>[0] | undefined
  lastDisplayName: string | undefined
  profile: NodeProfile
  lastProfileUpdate: Parameters<ImCoreNodeClient['updateProfile']>[0] | undefined
  group: NodeGroup
  groupMembers: GroupMemberPage
  lastGroupRequest: Parameters<ImCoreNodeClient['getGroup']>[0] | undefined
  lastJoinedGroup: Parameters<ImCoreNodeClient['joinGroup']>[0] | undefined
  lastLeftGroup: Parameters<ImCoreNodeClient['leaveGroup']>[0] | undefined
  lastGroupMembersRequest: Parameters<ImCoreNodeClient['listGroupMembers']>[0] | undefined
  lastRemovedGroupMember: Parameters<ImCoreNodeClient['removeGroupMember']>[0] | undefined
  recoveryProgress: HandleRecoveryProgress
  lastRecoveryOtp: Parameters<ImCoreNodeClient['requestHandleRecoveryOtp']>[0] | undefined
  lastRecoveryPrepare: Parameters<ImCoreNodeClient['prepareHandleRecovery']>[0] | undefined
  lastRecoveryOperation: Parameters<ImCoreNodeClient['getHandleRecoveryStatus']>[0] | undefined
  lastRecoveryAttestation: Parameters<ImCoreNodeClient['issueHandleRecoveryAttestation']>[0] | undefined
  listCalls: PageInput[]
  lastHistory: Parameters<ImCoreNodeClient['getHistory']>[0] | undefined
  lastLocalHistory: Parameters<ImCoreNodeClient['getLocalConversationTimeline']>[0] | undefined
  lastMarkedConversation: string | undefined
  lastText: SendTextInput | undefined
  lastPayload: SendPayloadInput | undefined
  lastAttachment: SendAttachmentInput | undefined
  lastDownload: Parameters<ImCoreNodeClient['downloadAttachment']>[0] | undefined
  lastExternalHttp: ExternalHttpRequest | undefined
  lastExternalResponse: Parameters<ExternalHttpAuthAttempt['handleResponse']>[0] | undefined
  mailAccount: MailAccount
  mailInbox: MailInboxPage
  mailMessage: MailMessage
  lastMailInbox: MailInboxInput | undefined
  lastMailRead: string | undefined
  lastMailMarkRead: MarkMailReadInput | undefined
  lastMailSend: SendMailInput | undefined
  mailSendCalls: number
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
    profiles: [],
    lastProfilePeers: undefined,
    lastCreatedGroup: undefined,
    lastAddedGroupMember: undefined,
    syncReasons: [],
    syncStatus: 'idle',
    syncWarnings: [],
    realtimeStarts: 0,
    realtimeStops: 0,
    lastOtp: undefined,
    lastRegistration: undefined,
    lastDisplayName: undefined,
    profile: NODE_PROFILE,
    lastProfileUpdate: undefined,
    group: NODE_GROUP,
    groupMembers: NODE_GROUP_MEMBERS,
    lastGroupRequest: undefined,
    lastJoinedGroup: undefined,
    lastLeftGroup: undefined,
    lastGroupMembersRequest: undefined,
    lastRemovedGroupMember: undefined,
    recoveryProgress: NODE_RECOVERY,
    lastRecoveryOtp: undefined,
    lastRecoveryPrepare: undefined,
    lastRecoveryOperation: undefined,
    lastRecoveryAttestation: undefined,
    listCalls: [],
    lastHistory: undefined,
    lastLocalHistory: undefined,
    lastMarkedConversation: undefined,
    lastText: undefined,
    lastPayload: undefined,
    lastAttachment: undefined,
    lastDownload: undefined,
    lastExternalHttp: undefined,
    lastExternalResponse: undefined,
    mailAccount: NODE_MAIL_ACCOUNT,
    mailInbox: { items: [NODE_MAIL_SUMMARY], nextOffset: 1, hasMore: true },
    mailMessage: NODE_MAIL_MESSAGE,
    lastMailInbox: undefined,
    lastMailRead: undefined,
    lastMailMarkRead: undefined,
    lastMailSend: undefined,
    mailSendCalls: 0,
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
    requestRegistrationOtp: (input) => {
      fixture.lastOtp = input
      return Promise.resolve({ retryAfterSeconds: 30, retryAt: '2026-08-14T00:00:30Z' })
    },
    completeRegistration: (input) => {
      fixture.lastRegistration = input
      return Promise.resolve(NODE_IDENTITY)
    },
    completeRegistrationWithOutcome: (input) => {
      fixture.lastRegistration = input
      return Promise.resolve({ status: 'registered', identity: NODE_IDENTITY, warnings: [] })
    },
    updateDisplayName: (displayName) => {
      fixture.lastDisplayName = displayName
      return Promise.resolve({ ...NODE_IDENTITY, displayName })
    },
    getProfile: () => Promise.resolve(fixture.profile),
    updateProfile: (input) => {
      fixture.lastProfileUpdate = input
      fixture.profile = { ...fixture.profile, ...input, tags: [...(input.tags ?? [])] }
      return Promise.resolve(fixture.profile)
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
    hydrateDisplayProfiles: (input) => {
      fixture.lastProfilePeers = input.peers
      return Promise.resolve(fixture.profiles)
    },
    createGroup: (input) => {
      fixture.lastCreatedGroup = input
      return Promise.resolve<NodeGroup>({
        did: 'did:wba:team.example',
        conversationId: 'group:did:wba:team.example',
        title: input.name,
        memberCount: 1,
      })
    },
    addGroupMember: (input) => {
      fixture.lastAddedGroupMember = input
      return Promise.resolve<NodeGroupMember>({
        did: 'did:wba:bob.example',
        handle: 'bob.example',
      })
    },
    getGroup: (input) => {
      fixture.lastGroupRequest = input
      return Promise.resolve({ ...fixture.group, did: input.groupDid })
    },
    listGroups: () => Promise.resolve({ items: [fixture.group], hasMore: false }),
    joinGroup: (input) => {
      fixture.lastJoinedGroup = input
      return Promise.resolve({ ...fixture.group, did: input.groupDid })
    },
    leaveGroup: (input) => {
      fixture.lastLeftGroup = input
      return Promise.resolve()
    },
    listGroupMembers: (input) => {
      fixture.lastGroupMembersRequest = input
      return Promise.resolve({ ...fixture.groupMembers, pageGroup: input.groupDid })
    },
    removeGroupMember: (input) => {
      fixture.lastRemovedGroupMember = input
      return Promise.resolve({ did: 'did:wba:bob.example', handle: 'bob.example' })
    },
    syncNow: (input) => {
      fixture.syncReasons.push(input?.reason ?? 'manual_refresh')
      return Promise.resolve({
        status: fixture.syncStatus, eventsApplied: 0, pagesFetched: 0, messagesHydrated: 0,
        duplicatesSkipped: 0, changedConversationIds: [], warnings: fixture.syncWarnings,
      })
    },
    startRealtime: () => {
      fixture.realtimeStarts += 1
      return Promise.resolve({
        nextEvent: () => Promise.resolve({
          kind: 'sync_required' as const,
          cause: 'connection_ready' as const,
          dirty: false,
          gapDetected: false,
        }),
        getStatus: () => Promise.resolve({ connected: true, state: 'connected' as const }),
        stop: () => { fixture.realtimeStops += 1; return Promise.resolve() },
      })
    },
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
    sendPayload: (input) => {
      fixture.lastPayload = input
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
    getMailAccount: () => Promise.resolve(fixture.mailAccount),
    listMailInbox: (input = {}) => {
      fixture.lastMailInbox = input
      return Promise.resolve(fixture.mailInbox)
    },
    readMail: (messageId) => {
      fixture.lastMailRead = messageId
      return Promise.resolve(fixture.mailMessage)
    },
    markMailRead: (input) => {
      fixture.lastMailMarkRead = input
      return Promise.resolve({ updated: input.messageIds.length })
    },
    sendMail: (input) => {
      fixture.mailSendCalls += 1
      fixture.lastMailSend = input
      return Promise.resolve({ accepted: true, messageId: 'mail-sent-1', warnings: [] })
    },
    requestHandleRecoveryOtp: (input) => {
      fixture.lastRecoveryOtp = input
      return Promise.resolve({
        ownerIdentityId: NODE_IDENTITY.identityId,
        fullHandle: input.fullHandle,
        operationId: fixture.recoveryProgress.operationId,
        accepted: true,
        retryAfterSeconds: 60,
        retryAt: '2026-08-20T00:01:00Z',
      })
    },
    prepareHandleRecovery: (input) => {
      fixture.lastRecoveryPrepare = input
      return Promise.resolve(fixture.recoveryProgress)
    },
    activateHandleRecovery: (input) => {
      fixture.lastRecoveryOperation = input
      return Promise.resolve({ ...fixture.recoveryProgress, phase: 'applied' })
    },
    getHandleRecoveryStatus: (input) => {
      fixture.lastRecoveryOperation = input
      return Promise.resolve(fixture.recoveryProgress)
    },
    resumeHandleRecovery: (input) => {
      fixture.lastRecoveryOperation = input
      return Promise.resolve({ ...fixture.recoveryProgress, phase: 'applied' })
    },
    issueHandleRecoveryAttestation: (input) => {
      fixture.lastRecoveryAttestation = input
      return Promise.resolve({
        attestation: 'header.payload.signature',
        expiresAt: '2026-08-22T12:02:00Z',
      })
    },
    discardHandleRecovery: (input) => {
      fixture.lastRecoveryOperation = input
      return Promise.resolve({
        operationId: input.operationId,
        ownerIdentityId: NODE_IDENTITY.identityId,
        fullHandle: fixture.recoveryProgress.fullHandle,
        lifecycle: 'discarded',
        commitAttempted: false,
        keyState: 'active',
        createdAt: '2026-08-20T00:00:00Z',
        updatedAt: '2026-08-20T00:02:00Z',
      })
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
      handle: 'alice', did: 'did:wba:alice.example', displayName: 'Alice', registeredAt: 1,
    })
    fixture.identity = null
    await expect(fixture.adapter.getIdentity()).resolves.toBeNull()

    await expect(fixture.adapter.sendRegistrationOtp({ handle: 'alice', phone: '+15555550123' })).resolves.toEqual({
      retryAfterSeconds: 30,
      retryAt: '2026-08-14T00:00:30Z',
    })
    expect(fixture.lastOtp).toEqual({ handle: 'alice', phone: '+15555550123' })
    await expect(fixture.adapter.registerIdentity({ handle: 'alice', phone: '+15555550123', otp: '123456' })).resolves.toMatchObject({
      status: 'registered', identity: { handle: 'alice', did: 'did:wba:alice.example', registeredAt: 1 },
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

  it('maps existing-Handle Join, SAS, and ready-admin device management without raw Node objects', async () => {
    const fixture = rustFixture()
    fixture.client.completeRegistrationWithOutcome = () => Promise.resolve({
      status: 'existing_handle',
      existingHandle: {
        continuationId: 'continuation-1', fullHandle: 'alice.awiki.info',
        expectedDid: 'did:wba:awiki.info:alice', mode: 'ordinary', requiresUserPresence: false,
      },
      warnings: [],
    })
    await expect(fixture.adapter.registerIdentity({ handle: 'alice', phone: '+15555550123', otp: '123456' }))
      .resolves.toEqual({
        status: 'join-required', continuationId: 'continuation-1', fullHandle: 'alice.awiki.info',
        mode: 'ordinary', requiresUserPresence: false,
      })
    fixture.client.beginPreparedRegistrationJoin = input => Promise.resolve({
      joinSessionId: 'join-1', did: 'did:wba:awiki.info:alice', localPhase: 'response_verified',
      remoteState: 'response_verified', expiresAt: '2026-08-23T12:00:00Z', sas: '123456',
      completed: false,
      ...(input.userPresenceConfirmed ? { identity: NODE_IDENTITY } : {}),
    })
    await expect(fixture.adapter.beginDeviceJoin({
      continuationId: 'continuation-1', operationId: 'operation-1', userPresenceConfirmed: false,
    })).resolves.toMatchObject({ sas: '123456', completed: false })

    fixture.client.getCurrentDeviceSummary = () => Promise.resolve({
      identityId: 'identity-1', did: NODE_IDENTITY.did, mode: 'v_next', protocolDeviceId: 'device-1',
      role: 'admin', readiness: 'admin_ready', canManage: true,
    })
    fixture.client.getDeviceRegistry = () => Promise.resolve({
      did: NODE_IDENTITY.did, registryVersion: '7', devices: [{
        protocolDeviceId: 'device-1', signingKeyId: 'sign-1', e2eeKeyId: 'e2ee-1', status: 'active',
        role: 'admin', managementReady: true, isCurrent: true, authGeneration: '9',
      }],
    })
    await expect(fixture.adapter.getCurrentDeviceSummary()).resolves.toEqual({
      role: 'admin', readiness: 'admin_ready', canManage: true,
    })
    await expect(fixture.adapter.getDeviceRegistry()).resolves.toEqual([{
      deviceId: 'device-1', status: 'active', role: 'admin', managementReady: true, isCurrent: true,
    }])
  })

  it('maps editable profiles and every durable recovery stage without exposing native-only fields', async () => {
    const fixture = rustFixture()
    await expect(fixture.adapter.getProfile()).resolves.toEqual({
      did: NODE_IDENTITY.did,
      handle: NODE_IDENTITY.handle,
      displayName: NODE_IDENTITY.displayName,
      bio: 'Builds dependable tools.',
      tags: ['Rust', 'DSH'],
      updatedAt: '2026-08-20T00:00:00Z',
    })
    await expect(fixture.adapter.updateProfile({
      displayName: 'Alice Zhang',
      bio: 'Desktop maintainer',
      tags: ['Desktop'],
    })).resolves.toMatchObject({
      displayName: 'Alice Zhang',
      bio: 'Desktop maintainer',
      tags: ['Desktop'],
    })
    expect(fixture.lastProfileUpdate).toEqual({
      displayName: 'Alice Zhang',
      bio: 'Desktop maintainer',
      tags: ['Desktop'],
    })

    await expect(fixture.adapter.sendRecoveryOtp({
      fullHandle: 'alice.example',
      phone: '+15555550123',
    })).resolves.toEqual({
      operationId: 'recovery-1',
      fullHandle: 'alice.example',
      retryAfterSeconds: 60,
      retryAt: '2026-08-20T00:01:00Z',
    })
    expect(fixture.lastRecoveryOtp).toEqual({ fullHandle: 'alice.example', phone: '+15555550123' })
    await expect(fixture.adapter.prepareRecovery({
      operationId: 'recovery-1',
      phone: '+15555550123',
      otp: '123456',
    })).resolves.toEqual({
      operationId: 'recovery-1',
      fullHandle: 'alice.example',
      previousDid: 'did:wba:alice.old.example',
      currentDid: NODE_IDENTITY.did,
      phase: 'ready_to_commit',
      retryable: false,
      localOrdinaryDataWillMigrate: true,
      otherDevicesMustRejoin: true,
    })
    expect(fixture.lastRecoveryPrepare).toEqual({
      operationId: 'recovery-1', phone: '+15555550123', otp: '123456',
    })
    await expect(fixture.adapter.activateRecovery({ operationId: 'recovery-1' }))
      .resolves.toMatchObject({ phase: 'applied' })
    await expect(fixture.adapter.getRecoveryStatus({ operationId: 'recovery-1' }))
      .resolves.toMatchObject({ phase: 'ready_to_commit' })
    await expect(fixture.adapter.resumeRecovery({ operationId: 'recovery-1' }))
      .resolves.toMatchObject({ phase: 'applied' })
    await expect(fixture.adapter.issueRecoveryAttestation({ operationId: 'recovery-1' })).resolves.toEqual({
      attestation: 'header.payload.signature',
      expiresAt: '2026-08-22T12:02:00Z',
    })
    expect(fixture.lastRecoveryAttestation).toEqual({ operationId: 'recovery-1' })
    await expect(fixture.adapter.discardRecovery({ operationId: 'recovery-1' })).resolves.toBeUndefined()
    expect(fixture.lastRecoveryOperation).toEqual({ operationId: 'recovery-1' })
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

  it('joins persisted peer profiles onto sparse direct roster rows', async () => {
    const fixture = rustFixture()
    fixture.conversationPages = [{
      items: [{
        ...DIRECT_CONVERSATION,
        title: 'howard.awiki.ai',
        // The Core roster may temporarily expose the Handle in this legacy field.
        peerDid: 'howard.awiki.ai',
        peerHandle: 'howard.awiki.ai',
      }],
      hasMore: false,
    }]
    fixture.profiles = [{
      did: 'did:wba:awiki.ai:howard:e1_peer',
      handle: 'howard.awiki.ai',
      displayName: '厉飞雨',
      cacheHit: true,
      isStale: false,
    }]

    await expect(fixture.adapter.listConversations()).resolves.toEqual({
      items: [expect.objectContaining({
        kind: 'direct',
        peerDid: 'did:wba:awiki.ai:howard:e1_peer',
        peerHandle: 'howard.awiki.ai',
        displayName: '厉飞雨',
        title: '厉飞雨',
      })],
      hasMore: false,
    })
    expect(fixture.lastProfilePeers).toEqual(['howard.awiki.ai'])
  })

  it('creates a canonical group and delegates member resolution to Rust', async () => {
    const fixture = rustFixture()
    await expect(fixture.adapter.createGroup('Release Crew')).resolves.toEqual({
      kind: 'group',
      id: 'group:did:wba:team.example',
      groupDid: 'did:wba:team.example',
      title: 'Release Crew',
      unreadCount: 0,
    })
    expect(fixture.lastCreatedGroup).toEqual({ name: 'Release Crew' })
    await expect(fixture.adapter.addGroupMember('did:wba:team.example' as never, 'bob.example')).resolves.toEqual({
      did: 'did:wba:bob.example',
      handle: 'bob.example',
    })
    expect(fixture.lastAddedGroupMember).toEqual({
      groupDid: 'did:wba:team.example',
      member: 'bob.example',
    })
  })

  it('maps authoritative group lifecycle data and hydrates member labels only for display', async () => {
    const fixture = rustFixture()
    fixture.profiles = [
      { did: NODE_IDENTITY.did, handle: 'alice', displayName: 'Alice Zhang', cacheHit: true, isStale: false },
      { did: 'did:wba:bob.example', handle: 'bob.example', displayName: 'Bob Li', cacheHit: true, isStale: false },
    ]
    await expect(fixture.adapter.getGroup(NODE_GROUP.did as never)).resolves.toEqual({
      groupDid: NODE_GROUP.did,
      conversationId: NODE_GROUP.conversationId,
      title: NODE_GROUP.title,
      description: NODE_GROUP.description,
      myRole: 'owner',
      membershipStatus: 'active',
      memberCount: 2,
    })
    expect(fixture.lastGroupRequest).toEqual({ groupDid: NODE_GROUP.did })
    await expect(fixture.adapter.joinGroup(NODE_GROUP.did as never)).resolves.toMatchObject({
      groupDid: NODE_GROUP.did,
      membershipStatus: 'active',
    })
    expect(fixture.lastJoinedGroup).toEqual({ groupDid: NODE_GROUP.did })

    await expect(fixture.adapter.listGroupMembers({
      groupDid: NODE_GROUP.did as never,
      cursor: 'member-page-1' as never,
      limit: 2,
    })).resolves.toEqual({
      items: [
        expect.objectContaining({ did: NODE_IDENTITY.did, displayName: 'Alice Zhang', role: 'owner' }),
        expect.objectContaining({ did: 'did:wba:bob.example', displayName: 'Bob Li', role: 'member' }),
      ],
      total: 2,
      nextCursor: 'member-page-2',
      hasMore: true,
      pageGroup: NODE_GROUP.did,
      groupStateVersion: 'version-7',
      warnings: [],
    })
    expect(fixture.lastProfilePeers).toEqual([NODE_IDENTITY.did, 'did:wba:bob.example'])
    expect(fixture.lastGroupMembersRequest).toEqual({
      groupDid: NODE_GROUP.did, cursor: 'member-page-1', limit: 2,
    })
    await expect(fixture.adapter.removeGroupMember(NODE_GROUP.did as never, 'bob.example'))
      .resolves.toEqual({ did: 'did:wba:bob.example', handle: 'bob.example' })
    expect(fixture.lastRemovedGroupMember).toEqual({ groupDid: NODE_GROUP.did, member: 'bob.example' })
    await expect(fixture.adapter.leaveGroup(NODE_GROUP.did as never)).resolves.toBeUndefined()
    expect(fixture.lastLeftGroup).toEqual({ groupDid: NODE_GROUP.did })
  })

  it('maps membership recovery errors without exposing service details', async () => {
    const fixture = rustFixture()
    for (const [nativeCode, publicCode] of [
      ['group_not_member', 'group-membership-required'],
      ['group_identity_stale', 'group-identity-stale'],
    ] as const) {
      fixture.client.getGroup = () => Promise.reject(Object.assign(new Error('private group service detail'), {
        name: 'ImCoreNodeError',
        code: nativeCode,
      }))
      await expect(fixture.adapter.getGroup(NODE_GROUP.did as never)).rejects.toEqual(new AwikiSdkError(publicCode))
    }
  })

  it('uses canonical conversation ids for direct and paginated group sends', async () => {
    const fixture = rustFixture()
    await fixture.adapter.sendText({
      target: { kind: 'direct', peer: 'bob.example' }, text: 'hello',
      idempotencyKey: 'msg-12345678-1234-1234-1234-123456789abc',
    })
    expect(fixture.lastText).toEqual({
      conversationId: 'direct:canonical-bob', text: 'hello',
      clientMessageId: 'msg-12345678-1234-1234-1234-123456789abc',
      idempotencyKey: 'msg-12345678-1234-1234-1234-123456789abc',
    })
    await fixture.adapter.sendText({
      target: { kind: 'direct', peer: 'bob.example' }, text: 'agent hello', idempotencyKey: 'text-1',
    })
    expect(fixture.lastText).toEqual({
      conversationId: 'direct:canonical-bob', text: 'agent hello', idempotencyKey: 'text-1',
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
      idempotencyKey: 'msg-abcdefab-cdef-abcd-efab-cdefabcdefab',
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
      bytes: upload.attachment.bytes, caption: 'sent file',
      clientMessageId: 'msg-abcdefab-cdef-abcd-efab-cdefabcdefab',
      idempotencyKey: 'msg-abcdefab-cdef-abcd-efab-cdefabcdefab',
    })
  })

  it('sends P9 mentions with Unicode code-point ranges and degrades malformed metadata to text', async () => {
    const fixture = rustFixture()
    const text = '😀 hello @Bob'
    const payload = {
      text,
      mentions: [{
        id: 'mention-bob',
        range: { start: 8, end: 12, unit: 'unicode_code_point' },
        target: { kind: 'human', did: 'did:wba:bob.example', display_name: 'Bob' },
        mention_role: 'addressee',
      }],
    }
    fixture.sentMessage = nodeMessage({ kind: 'payload', payloadJson: JSON.stringify(payload) }, 'group:canonical-team')
    await expect(fixture.adapter.sendText({
      target: { kind: 'group', group: NODE_GROUP.did },
      text,
      mentions: [{
        id: 'mention-bob', start: 8, end: 12, did: 'did:wba:bob.example' as never, displayName: 'Bob',
      }],
      idempotencyKey: 'msg-12345678-1234-1234-1234-123456789abc',
    })).resolves.toMatchObject({
      content: {
        kind: 'text',
        text,
        mentions: [{ id: 'mention-bob', start: 8, end: 12, did: 'did:wba:bob.example', displayName: 'Bob' }],
      },
    })
    expect(fixture.lastPayload).toMatchObject({
      conversationId: 'group:canonical-team',
      clientMessageId: 'msg-12345678-1234-1234-1234-123456789abc',
      idempotencyKey: 'msg-12345678-1234-1234-1234-123456789abc',
    })
    expect(JSON.parse(fixture.lastPayload!.payloadJson)).toEqual(payload)

    fixture.history = {
      items: [
        { ...nodeMessage({
          kind: 'payload',
          payloadJson: JSON.stringify({
            text: 'hello Bob',
            mentions: [{
              id: 'not-visible',
              range: { start: 6, end: 9, unit: 'unicode_code_point' },
              target: { kind: 'human', did: 'did:wba:bob.example' },
            }],
          }),
        }, 'group:canonical-team'), id: 'payload-not-at' },
        { ...nodeMessage({
          kind: 'payload',
          payloadJson: JSON.stringify({
            text: '@Bob @Alice',
            mentions: [
              { id: 'first', range: { start: 0, end: 4, unit: 'unicode_code_point' }, target: { kind: 'human', did: 'did:wba:bob.example' } },
              { id: 'overlap', range: { start: 3, end: 10, unit: 'unicode_code_point' }, target: { kind: 'human', did: NODE_IDENTITY.did } },
            ],
          }),
        }, 'group:canonical-team'), id: 'payload-overlap' },
      ],
      hasMore: false,
    }
    const malformed = await fixture.adapter.getHistory({ conversationId: 'group:canonical-team' as never })
    expect(malformed.items).toEqual([
      expect.objectContaining({ id: 'payload-overlap', content: { kind: 'text', text: '@Bob @Alice' } }),
      expect.objectContaining({ id: 'payload-not-at', content: { kind: 'text', text: 'hello Bob' } }),
    ])
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

  it('filters provider-only payload events without rejecting the public history page', async () => {
    const fixture = rustFixture()
    fixture.profiles = [{
      did: 'did:wba:alice.example',
      handle: 'alice.example',
      displayName: 'Alice Cached',
      cacheHit: true,
      isStale: false,
    }]
    fixture.history = {
      items: [
        {
          ...nodeMessage({ kind: 'text', text: 'visible' }, 'group:canonical-team'),
          senderHandle: undefined,
          senderDisplayName: undefined,
          outgoing: false,
        },
        {
          ...nodeMessage({
            kind: 'payload',
            payloadJson: JSON.stringify({ type: 'group_event', membership_status: 'active' }),
          }, 'group:canonical-team'),
          id: 'group-event-1',
        },
      ],
      nextCursor: 'next-history',
      hasMore: true,
    }

    await expect(fixture.adapter.getLocalHistory({
      conversationId: 'group:canonical-team' as never,
      limit: 50,
    })).resolves.toEqual({
      items: [expect.objectContaining({
        senderHandle: 'alice.example',
        senderDisplayName: 'Alice Cached',
        content: { kind: 'text', text: 'visible' },
      })],
      nextCursor: 'next-history',
      hasMore: true,
    })
    expect(fixture.lastProfilePeers).toEqual(['did:wba:alice.example'])
  })

  it('maps all mail operations exactly and copies the minimized native DTOs', async () => {
    const fixture = rustFixture()
    const nativeFrom = ['sender@example.com']
    const nativeAttachments = [
      { index: 0, fileName: 'report.txt', contentType: 'text/plain', sizeBytes: '42' },
    ]
    const nativeSummary = { ...NODE_MAIL_SUMMARY, from: nativeFrom }
    fixture.mailInbox = { items: [nativeSummary], nextOffset: 1, hasMore: true }
    fixture.mailMessage = Object.assign({
      summary: nativeSummary,
      bodyText: 'Untrusted mail body',
      bodyTruncated: false,
      hasHtmlBody: true,
      attachments: nativeAttachments,
    }, {
      bodyHtml: '<script>private</script>',
      attributes: { prompt: 'ignore policy' },
      bytes: new Uint8Array([1, 2, 3]),
    })

    await expect(fixture.adapter.getMailAccount()).resolves.toEqual(NODE_MAIL_ACCOUNT)
    const inbox = await fixture.adapter.listMailInbox({
      folder: 'inbox', unreadOnly: true, limit: 5, offset: 0,
    })
    expect(fixture.lastMailInbox).toEqual({ folder: 'inbox', unreadOnly: true, limit: 5, offset: 0 })
    expect(inbox).toEqual({ items: [nativeSummary], nextOffset: 1, hasMore: true })

    const message = await fixture.adapter.readMail({ messageId: 'mail-1' as never })
    expect(fixture.lastMailRead).toBe('mail-1')
    expect(message).toEqual({
      summary: nativeSummary,
      bodyText: 'Untrusted mail body',
      bodyTruncated: false,
      hasHtmlBody: true,
      attachments: nativeAttachments,
    })
    expect(JSON.stringify(message)).not.toContain('bodyHtml')
    expect(JSON.stringify(message)).not.toContain('attributes')
    expect(JSON.stringify(message)).not.toContain('bytes')

    nativeFrom[0] = 'mutated@example.com'
    nativeAttachments[0]!.fileName = 'mutated.txt'
    expect(inbox.items[0]?.from).toEqual(['sender@example.com'])
    expect(message.summary.from).toEqual(['sender@example.com'])
    expect(message.attachments[0]?.fileName).toBe('report.txt')

    const messageIds = ['mail-1', 'mail-2'] as never[]
    await expect(fixture.adapter.markMailRead({ messageIds })).resolves.toEqual({ updated: 2 })
    expect(fixture.lastMailMarkRead).toEqual({ messageIds: ['mail-1', 'mail-2'] })
    expect(fixture.lastMailMarkRead?.messageIds).not.toBe(messageIds)

    const to = ['bob@example.com']
    const cc = ['carol@example.com']
    await expect(fixture.adapter.sendMail({
      to, cc, subject: 'Status update', bodyText: 'Plain text only',
    })).resolves.toEqual({ accepted: true, messageId: 'mail-sent-1', warnings: [] })
    expect(fixture.lastMailSend).toEqual({
      to: ['bob@example.com'], cc: ['carol@example.com'], subject: 'Status update', bodyText: 'Plain text only',
    })
    expect(fixture.lastMailSend?.to).not.toBe(to)
    expect(fixture.lastMailSend?.cc).not.toBe(cc)
  })

  it('fails closed on malformed mail responses and preserves send delivery ambiguity without retry', async () => {
    const fixture = rustFixture()
    fixture.mailInbox = {
      items: Array.from({ length: 101 }, () => NODE_MAIL_SUMMARY),
      hasMore: false,
    }
    await expect(fixture.adapter.listMailInbox()).rejects.toEqual(new AwikiSdkError('remote'))

    fixture.mailAccount = { mailboxAddress: 'alice\u0007@awiki.example' }
    await expect(fixture.adapter.getMailAccount()).rejects.toEqual(new AwikiSdkError('remote'))

    fixture.client.readMail = () => Promise.reject(Object.assign(new Error('private timeout'), {
      name: 'ImCoreNodeError', code: 'timeout',
    }))
    await expect(fixture.adapter.readMail({ messageId: 'mail-1' as never }))
      .rejects.toEqual(new AwikiSdkError('network'))

    for (const code of ['timeout', 'transport_unavailable']) {
      let calls = 0
      fixture.client.sendMail = () => {
        calls += 1
        return Promise.reject(Object.assign(new Error('private transport detail'), {
          name: 'ImCoreNodeError', code,
        }))
      }
      await expect(fixture.adapter.sendMail({
        to: ['bob@example.com'], subject: 'One attempt', bodyText: 'Do not retry',
      })).rejects.toEqual(new AwikiSdkError('delivery-unknown'))
      expect(calls).toBe(1)
    }
  })

  it('exposes only high-level realtime scheduling and opaque ignored listener content', async () => {
    const fixture = rustFixture()
    const payload = nodeMessage({ kind: 'payload', payloadJson: '{"encrypted":true}' })
    fixture.conversationPages = [{
      items: [{ ...DIRECT_CONVERSATION, lastMessage: payload }],
      hasMore: false,
    }]
    fixture.history = {
      items: [payload, { ...nodeMessage({ kind: 'text', text: 'plain' }), id: 'plain-message' }],
      hasMore: false,
    }
    await expect(fixture.adapter.realtime.syncNow('session_start')).resolves.toBeUndefined()
    expect(fixture.syncReasons).toEqual(['session_start'])
    await expect(fixture.adapter.agentInbox.listConversations()).resolves.toMatchObject({
      items: [{ kind: 'direct', id: 'conversation-1', peerDid: 'did:wba:bob.example' }],
    })
    await expect(fixture.adapter.agentInbox.getHistory({ conversationId: 'conversation-1' as never }))
      .resolves.toMatchObject({
        items: [
          { id: 'plain-message', content: { kind: 'text', text: 'plain' } },
          { id: 'message-1', content: { kind: 'ignored' } },
        ],
      })
    const realtime = await fixture.adapter.realtime.startRealtime()
    await expect(realtime.nextEvent()).resolves.toEqual({
      kind: 'sync_required', cause: 'connection_ready', dirty: false, gapDetected: false,
    })
    await expect(realtime.getStatus()).resolves.toEqual({ connected: true })
    await realtime.stop()
    expect(fixture.realtimeStarts).toBe(1)
    expect(fixture.realtimeStops).toBe(1)

    fixture.syncStatus = 'retryable_failure'
    fixture.syncWarnings = [
      'sync.retry.local_state_unavailable',
      'sync.retry.local_state.database_busy',
    ]
    await expect(fixture.adapter.realtime.syncNow('websocket_hint')).rejects.toMatchObject({
      code: 'network',
      realtimeFailureCode: 'sync.retry.local_state.database_busy',
    })
  })

  it('maps native safe errors, fails closed for unknown shapes, and closes once', async () => {
    const fixture = rustFixture()
    fixture.client.resolvePeer = () => Promise.reject(Object.assign(new Error('revoked'), {
      name: 'ImCoreNodeError', code: 'auth_revoked',
    }))
    await expect(fixture.adapter.resolvePeer('bob')).rejects.toMatchObject({
      name: 'AwikiSdkError', code: 'identity-recovery-required',
    })
    fixture.client.resolvePeer = () => Promise.reject(Object.assign(new Error('denied'), {
      name: 'ImCoreNodeError', code: 'permission_denied',
    }))
    await expect(fixture.adapter.resolvePeer('bob')).rejects.toMatchObject({
      name: 'AwikiSdkError', code: 'forbidden',
    })
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
