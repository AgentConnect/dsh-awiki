/** Shared AWiki Remote test double. */

import type {
  AwikiConversation,
  AwikiConversationPreferences,
  AwikiConversationId,
  AwikiConversationSummary,
  AwikiCursor,
  AwikiDid,
  AwikiDirectConversation,
  AwikiFailure,
  AwikiHandle,
  AwikiIdentity,
  AwikiIdentityAccessInspection,
  AwikiIdentityAccessResult,
  AwikiGroupMemberRecord,
  AwikiGroupSnapshot,
  AwikiMessage,
  AwikiMessageId,
  AwikiMailAccount,
  AwikiMailInboxPage,
  AwikiMailMessage,
  AwikiMailMessageId,
  AwikiMailSummary,
  AwikiMailSendResult,
  AwikiRuntimeConfig,
  AwikiProfile,
  AwikiRecoveryProgress,
  AwikiSession,
} from '@awiki/dsh-plugin/types'
import type { AwikiRemote } from '../src/client/controller.ts'

export const identity: AwikiIdentity = {
  handle: 'alice' as AwikiHandle,
  did: 'did:wba:alice' as AwikiDid,
  displayName: 'Alice',
  registeredAt: 1,
}

export const profile: AwikiProfile = {
  did: identity.did,
  handle: identity.handle,
  displayName: 'Alice',
  bio: '',
  tags: [],
}

export const direct: AwikiDirectConversation = {
  kind: 'direct',
  id: 'c1' as AwikiConversationId,
  peerDid: 'did:wba:bob' as AwikiDid,
  peerHandle: 'bob' as AwikiHandle,
  title: 'Bob',
  lastMessageAt: 10,
  lastMessagePreview: '你好',
}

export const group: AwikiConversation = {
  kind: 'group',
  id: 'g1' as AwikiConversationId,
  groupDid: 'did:wba:group' as AwikiDid,
  title: 'Harness Team',
  lastMessageAt: 8,
  lastMessagePreview: '群消息',
}

export const groupSnapshot: AwikiGroupSnapshot = {
  groupDid: group.groupDid,
  conversationId: group.id,
  title: group.title,
  myRole: 'owner',
  membershipStatus: 'active',
  memberCount: 2,
}

export const groupMembers: readonly AwikiGroupMemberRecord[] = [
  { did: identity.did, handle: identity.handle, displayName: identity.displayName, role: 'owner', status: 'active', subjectType: 'human' },
  { did: direct.peerDid, handle: direct.peerHandle, displayName: 'Bob', role: 'member', status: 'active', subjectType: 'human' },
]

export const message: AwikiMessage = {
  id: 'm1' as AwikiMessageId,
  conversationId: direct.id,
  conversationKind: 'direct',
  senderDid: direct.peerDid,
  senderHandle: 'bob' as AwikiHandle,
  sentAt: 10,
  outgoing: false,
  content: { kind: 'text', text: '你好' },
}

export const attachmentMessage: AwikiMessage = {
  ...message,
  id: 'attachment-message' as AwikiMessageId,
  content: {
    kind: 'attachment',
    attachment: {
      id: 'a1' as never,
      fileName: 'a.txt',
      mimeType: 'text/plain',
      size: 3,
      sha256: 'abc',
    },
  },
}

export const summary: AwikiConversationSummary = {
  range: {
    kind: 'recent',
    messageCount: 1,
    firstMessageId: message.id,
    lastMessageId: message.id,
    startedAt: message.sentAt,
    endedAt: message.sentAt,
    truncated: false,
  },
  highlights: ['确认了本次沟通重点'],
  conclusions: ['双方已达成一致'],
  todos: [{ text: '整理后续材料', owner: 'Alice' }],
}

export const mailAccount: AwikiMailAccount = {
  mailboxAddress: 'alice@awiki.example',
  displayName: 'Alice',
  status: 'active',
}

export const mailSummary = {
  id: 'mail-1' as AwikiMailMessageId,
  folder: 'inbox',
  from: ['bob@example.com'],
  to: ['alice@awiki.example'],
  cc: [],
  subject: 'Release status',
  subjectTruncated: false,
  preview: 'The release is ready for review.',
  previewTruncated: false,
  receivedAt: '2026-08-19T08:00:00Z',
  unread: true,
  hasAttachments: true,
  attachmentCount: 1,
} as const

export const mailMessage: AwikiMailMessage = {
  summary: mailSummary,
  bodyText: 'The release is ready for review.\nPlease confirm the checklist.',
  bodyTruncated: false,
  hasHtmlBody: true,
  attachments: [{ index: 0, fileName: 'release.txt', contentType: 'text/plain', sizeBytes: '42' }],
}

export const sentMailSummary: AwikiMailSummary = {
  id: 'mail-sent-1' as AwikiMailMessageId,
  folder: 'sent',
  from: ['alice@awiki.example'],
  to: ['bob@example.com'],
  cc: ['carol@example.com'],
  subject: 'Release approval',
  subjectTruncated: false,
  preview: 'Please approve the release.',
  previewTruncated: false,
  sentAt: '2026-08-19T09:00:00Z',
  unread: false,
  hasAttachments: false,
  attachmentCount: 0,
}

export const sentMailMessage: AwikiMailMessage = {
  summary: sentMailSummary,
  bodyText: 'Please approve the release.',
  bodyTruncated: false,
  hasHtmlBody: false,
  attachments: [],
}

export const carried = <T>(value: T) => Promise.resolve({ ok: true as const, value })
export const success = <T>(value: T) => ({ ok: true as const, value })

/** Build one successful generated Remote and its call log. */
export function fakeRemote(options: {
  identity?: AwikiIdentity | null
  config?: AwikiRuntimeConfig
  conversations?: readonly AwikiConversation[]
  conversationsHasMore?: boolean
  conversationsCursor?: AwikiCursor
  history?: readonly AwikiMessage[]
  localHistory?: readonly AwikiMessage[]
  historyHasMore?: boolean
  historyCursor?: AwikiCursor
  sessionStatus?: AwikiSession['status']
  summary?: AwikiConversationSummary
  mailAccount?: AwikiMailAccount
  mailInbox?: AwikiMailInboxPage
  mailInboxes?: Partial<Record<'inbox' | 'sent', AwikiMailInboxPage>>
  mailMessage?: AwikiMailMessage
  mailMessages?: Readonly<Record<string, AwikiMailMessage>>
  mailSendResult?: AwikiMailSendResult
  profile?: AwikiProfile
  groupSnapshot?: AwikiGroupSnapshot
  groupMembers?: readonly AwikiGroupMemberRecord[]
  recoveryProgress?: AwikiRecoveryProgress
  identityAccessInspection?: AwikiIdentityAccessInspection
  conversationPreferences?: AwikiConversationPreferences
  registrationOutcome?: AwikiIdentityAccessResult
} = {}) {
  const calls: { method: string; request?: unknown }[] = []
  let currentIdentity = options.identity === undefined ? identity : options.identity
  let sessionStatus = options.sessionStatus ?? (currentIdentity === null ? 'unregistered' : 'active')
  let currentProfile = options.profile ?? profile
  let currentGroupMembers = [...(options.groupMembers ?? groupMembers)]
  let recoveryProgress = options.recoveryProgress ?? null
  let conversationPreferences: AwikiConversationPreferences = options.conversationPreferences ?? { hiddenConversations: [] }
  const currentSession = (): AwikiSession => {
    if (sessionStatus === 'active' && currentIdentity !== null) return { status: 'active', identity: currentIdentity }
    return { status: sessionStatus === 'active' ? 'unregistered' : sessionStatus }
  }
  const historyItems = (
    conversationId: AwikiConversationId,
    configured: readonly AwikiMessage[] | undefined,
  ): readonly AwikiMessage[] => {
    if (configured !== undefined) return configured
    const conversation = (options.conversations ?? [direct]).find(value => value.id === conversationId)
    return [{
      ...message,
      conversationId,
      conversationKind: conversation?.kind ?? 'direct',
    }]
  }
  const remote: AwikiRemote = {
    getConfig: () => { calls.push({ method: 'getConfig' }); return carried(success(options.config ?? { pollIntervalMs: 1000, attachmentMaxBytes: 10 * 1024 * 1024, handleRecoveryPhoneEnabled: false, integrationGuideUrl: 'https://awiki.info/guest/guide/integration' })) },
    getIdentity: () => { calls.push({ method: 'getIdentity' }); return carried(success(currentIdentity)) },
    getSession: () => {
      calls.push({ method: 'getSession' })
      return carried(success(currentSession()))
    },
    logout: (request) => {
      calls.push({ method: 'logout', request })
      sessionStatus = 'signed-out'
      return carried(success({ status: 'signed-out' as const }))
    },
    login: () => {
      calls.push({ method: 'login' })
      sessionStatus = currentIdentity === null ? 'unregistered' : 'active'
      return carried(success(currentSession()))
    },
    inspectIdentityAccess: (request) => {
      calls.push({ method: 'inspectIdentityAccess', request })
      return carried(success(options.identityAccessInspection ?? {
        status: 'available' as const,
        fullHandle: `${request.handle}.awiki.info`,
      }))
    },
    sendRegistrationOtp: (request) => { calls.push({ method: 'sendRegistrationOtp', request }); return carried(success({ retryAfterSeconds: 60, retryAt: '2026-08-14T00:00:00Z' })) },
    registerIdentity: (request) => {
      calls.push({ method: 'registerIdentity', request })
      const outcome = options.registrationOutcome ?? { status: 'registered' as const, identity }
      if (outcome.status === 'registered') {
        currentIdentity = outcome.identity
        sessionStatus = 'active'
      }
      return carried(success(outcome))
    },
    beginDeviceJoin: () => { calls.push({ method: 'beginDeviceJoin' }); return carried(success({ phase: 'pending' as const, expiresAt: '2026-08-23T12:00:00Z', completed: false })) },
    getDeviceJoinStatus: () => { calls.push({ method: 'getDeviceJoinStatus' }); return carried(success(null)) },
    cancelDeviceJoin: () => { calls.push({ method: 'cancelDeviceJoin' }); return carried(success({ completed: true as const })) },
    refreshDeviceManagement: () => { calls.push({ method: 'refreshDeviceManagement' }); return carried(success({ canManage: false, role: 'member' as const, readiness: 'member_ready' as const, devices: [], requests: [] })) },
    startDeviceJoinVerification: request => { calls.push({ method: 'startDeviceJoinVerification', request }); return carried(success({ requestRef: request.requestRef, phase: 'verifying' as const, expiresAt: '2026-08-23T12:00:00Z' })) },
    approveDeviceJoin: request => { calls.push({ method: 'approveDeviceJoin', request }); return carried(success({ requestRef: request.requestRef, phase: 'authorized' as const, expiresAt: '2026-08-23T12:00:00Z' })) },
    rejectDeviceJoin: request => { calls.push({ method: 'rejectDeviceJoin', request }); return carried(success({ requestRef: request.requestRef, phase: 'rejected' as const, expiresAt: '2026-08-23T12:00:00Z' })) },
    revokeDevice: request => { calls.push({ method: 'revokeDevice', request }); return carried(success({ canManage: true, role: 'admin' as const, readiness: 'admin_ready' as const, devices: [], requests: [] })) },
    updateDisplayName: (request) => {
      calls.push({ method: 'updateDisplayName', request })
      const current = options.identity === undefined ? identity : options.identity
      return carried(success({ ...(current ?? identity), displayName: request.displayName }))
    },
    getProfile: () => {
      calls.push({ method: 'getProfile' })
      return carried(success(currentProfile))
    },
    updateProfile: (request) => {
      calls.push({ method: 'updateProfile', request })
      currentProfile = { ...currentProfile, ...request }
      if (currentIdentity !== null) currentIdentity = { ...currentIdentity, displayName: request.displayName }
      return carried(success(currentProfile))
    },
    sendRecoveryOtp: (request) => {
      calls.push({ method: 'sendRecoveryOtp', request })
      return carried(success({ operationId: 'recovery-1', fullHandle: request.fullHandle, retryAfterSeconds: 60, retryAt: '2026-08-20T00:00:00Z' }))
    },
    prepareRecovery: (request) => {
      calls.push({ method: 'prepareRecovery', request })
      recoveryProgress = {
        operationId: request.operationId,
        fullHandle: 'alice.awiki.info',
        previousDid: identity.did,
        currentDid: identity.did,
        phase: 'ready_to_commit',
        retryable: false,
        localOrdinaryDataWillMigrate: true,
        otherDevicesMustRejoin: true,
      }
      return carried(success(recoveryProgress))
    },
    activateRecovery: (request) => {
      calls.push({ method: 'activateRecovery', request })
      recoveryProgress = { ...(recoveryProgress!), phase: 'applied' }
      currentIdentity = identity
      sessionStatus = 'active'
      return carried(success(recoveryProgress))
    },
    getRecoveryStatus: (request) => {
      calls.push({ method: 'getRecoveryStatus', request })
      return carried(success(recoveryProgress ?? {
        operationId: request.operationId,
        fullHandle: 'alice.awiki.info',
        currentDid: identity.did,
        phase: 'awaiting_factor' as const,
        retryable: false,
        localOrdinaryDataWillMigrate: true,
        otherDevicesMustRejoin: true,
      }))
    },
    resumeRecovery: (request) => {
      calls.push({ method: 'resumeRecovery', request })
      recoveryProgress = { ...(recoveryProgress!), phase: 'applied' }
      currentIdentity = identity
      sessionStatus = 'active'
      return carried(success(recoveryProgress))
    },
    discardRecovery: (request) => {
      calls.push({ method: 'discardRecovery', request })
      recoveryProgress = null
      return carried(success({ completed: true as const }))
    },
    resolvePeer: (request) => {
      calls.push({ method: 'resolvePeer', request })
      const peer = request.peer
      if (peer.includes('missing')) {
        return carried({ ok: false, error: { code: 'not-found', message: 'AWiki resource was not found' } })
      }
      if (peer === direct.peerDid || peer === direct.peerHandle) {
        return carried(success({
          did: direct.peerDid,
          handle: direct.peerHandle as AwikiHandle,
          displayName: direct.title,
          conversationId: direct.id,
        }))
      }
      return carried(success({
        did: 'did:wba:carol' as AwikiDid,
        handle: 'carol' as AwikiHandle,
        displayName: 'Carol',
        conversationId: 'c-carol' as AwikiConversationId,
      }))
    },
    createGroup: (request) => {
      calls.push({ method: 'createGroup', request })
      return carried(success({
        conversation: {
          kind: 'group' as const,
          id: 'group:did:wba:release-crew' as AwikiConversationId,
          groupDid: 'did:wba:release-crew' as AwikiDid,
          title: request.name,
          unreadCount: 0,
        },
        addedMembers: request.members.map(member => ({
          did: `did:wba:${member}` as AwikiDid,
          handle: member as AwikiHandle,
        })),
        failedMembers: [],
      }))
    },
    getGroup: (request) => {
      calls.push({ method: 'getGroup', request })
      return carried(success(options.groupSnapshot ?? { ...groupSnapshot, groupDid: request.groupDid }))
    },
    joinGroup: (request) => {
      calls.push({ method: 'joinGroup', request })
      return carried(success({ ...(options.groupSnapshot ?? groupSnapshot), groupDid: request.groupDid }))
    },
    leaveGroup: (request) => {
      calls.push({ method: 'leaveGroup', request })
      return carried(success({ completed: true as const }))
    },
    listGroupMembers: (request) => {
      calls.push({ method: 'listGroupMembers', request })
      return carried(success({ items: currentGroupMembers, total: currentGroupMembers.length, hasMore: false, pageGroup: request.groupDid, warnings: [] }))
    },
    addGroupMember: (request) => {
      calls.push({ method: 'addGroupMember', request })
      const added = { did: `did:wba:${request.member}` as AwikiDid, handle: request.member as AwikiHandle }
      currentGroupMembers.push({ ...added, role: 'member', status: 'active', subjectType: 'human' })
      return carried(success(added))
    },
    removeGroupMember: (request) => {
      calls.push({ method: 'removeGroupMember', request })
      const removed = currentGroupMembers.find(member => member.did === request.member || member.handle === request.member)
      currentGroupMembers = currentGroupMembers.filter(member => member !== removed)
      return carried(success({ did: removed?.did ?? request.member as AwikiDid, ...(removed?.handle === undefined ? {} : { handle: removed.handle }) }))
    },
    getConversationPreferences: () => {
      calls.push({ method: 'getConversationPreferences' })
      return carried(success(conversationPreferences))
    },
    updateConversationPreference: (request) => {
      calls.push({ method: 'updateConversationPreference', request })
      if (request.action === 'hide') {
        conversationPreferences = {
          ...conversationPreferences,
          hiddenConversations: [
            { conversation: request.conversation, hiddenAt: Date.now() },
            ...conversationPreferences.hiddenConversations.filter(item => item.conversation.id !== request.conversation.id),
          ],
        }
      } else if (request.action === 'restore') {
        conversationPreferences = {
          ...conversationPreferences,
          hiddenConversations: conversationPreferences.hiddenConversations.filter(item => item.conversation.id !== request.conversationId),
        }
      }
      return carried(success(conversationPreferences))
    },
    listConversations: (request) => {
      calls.push({ method: 'listConversations', request })
      return carried(success({
        items: options.conversations ?? [direct],
        hasMore: options.conversationsHasMore ?? false,
        ...(options.conversationsCursor === undefined ? {} : { nextCursor: options.conversationsCursor }),
      }))
    },
    getHistory: (request) => {
      calls.push({ method: 'getHistory', request })
      return carried(success({
        items: historyItems(request.conversationId, options.history),
        hasMore: options.historyHasMore ?? false,
        ...(options.historyCursor === undefined ? {} : { nextCursor: options.historyCursor }),
      }))
    },
    getLocalHistory: (request) => {
      calls.push({ method: 'getLocalHistory', request })
      return carried(success({
        items: historyItems(request.conversationId, options.localHistory ?? options.history),
        hasMore: false,
      }))
    },
    summarizeConversation: (request) => {
      calls.push({ method: 'summarizeConversation', request })
      return carried(success(options.summary ?? summary))
    },
    markConversationRead: (request) => {
      calls.push({ method: 'markConversationRead', request })
      return carried(success(1))
    },
    sendText: (request) => { calls.push({ method: 'sendText', request }); return carried(success({ ...message, id: (request.idempotencyKey.startsWith('msg-') ? request.idempotencyKey : 'sent') as AwikiMessageId, outgoing: true, content: { kind: 'text', text: request.text, ...(request.mentions === undefined ? {} : { mentions: request.mentions }) } })) },
    sendAttachment: (request) => { calls.push({ method: 'sendAttachment', request }); return carried(success({
      ...message,
      id: (request.idempotencyKey.startsWith('msg-') ? request.idempotencyKey : 'attachment-message') as AwikiMessageId,
      outgoing: true,
      content: { kind: 'attachment', attachment: { id: 'a1' as never, fileName: request.fileName, mimeType: request.mimeType, size: 3, sha256: 'abc' } },
    })) },
    downloadAttachment: (request) => { calls.push({ method: 'downloadAttachment', request }); return carried(success({
      attachment: { id: request.attachmentId, fileName: 'a.txt', mimeType: 'text/plain', size: 3, sha256: 'abc' },
      bytesBase64: 'YWJj',
    })) },
    getMailAccount: () => {
      calls.push({ method: 'getMailAccount' })
      return carried(success(options.mailAccount ?? mailAccount))
    },
    listMailInbox: (request) => {
      calls.push({ method: 'listMailInbox', request })
      const requestedFolder = request?.folder ?? 'inbox'
      const page = requestedFolder === 'sent'
        ? options.mailInboxes?.sent ?? { items: [], hasMore: false }
        : options.mailInboxes?.inbox ?? options.mailInbox ?? { items: [mailSummary], hasMore: false }
      return carried(success(page))
    },
    readMail: (request) => {
      calls.push({ method: 'readMail', request })
      return carried(success(options.mailMessages?.[request.messageId] ?? options.mailMessage ?? mailMessage))
    },
    markMailRead: (request) => {
      calls.push({ method: 'markMailRead', request })
      return carried(success({ updated: request.messageIds.length }))
    },
    sendMail: (request) => {
      calls.push({ method: 'sendMail', request })
      return carried(success(options.mailSendResult ?? {
        accepted: true,
        messageId: 'mail-sent-1' as AwikiMailMessageId,
        warnings: [],
      }))
    },
    clearLocalData: (request) => {
      calls.push({ method: 'clearLocalData', request })
      currentIdentity = null
      sessionStatus = 'unregistered'
      return carried(success({ cleared: true }))
    },
  }
  return { remote, calls }
}
