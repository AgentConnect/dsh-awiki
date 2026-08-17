/** Shared AWiki Remote test double. */

import type {
  AwikiConversation,
  AwikiConversationId,
  AwikiConversationSummary,
  AwikiCursor,
  AwikiDid,
  AwikiDirectConversation,
  AwikiHandle,
  AwikiIdentity,
  AwikiMessage,
  AwikiMessageId,
  AwikiRuntimeConfig,
  AwikiSession,
} from '@awiki/dsh/types'
import type { AwikiRemote } from '../src/client/controller.ts'

export const identity: AwikiIdentity = {
  handle: 'alice' as AwikiHandle,
  did: 'did:wba:alice' as AwikiDid,
  displayName: 'Alice',
  registeredAt: 1,
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
  historyHasMore?: boolean
  historyCursor?: AwikiCursor
  sessionStatus?: AwikiSession['status']
  summary?: AwikiConversationSummary
} = {}) {
  const calls: { method: string; request?: unknown }[] = []
  let currentIdentity = options.identity === undefined ? identity : options.identity
  let sessionStatus = options.sessionStatus ?? (currentIdentity === null ? 'unregistered' : 'active')
  const currentSession = (): AwikiSession => {
    if (sessionStatus === 'active' && currentIdentity !== null) return { status: 'active', identity: currentIdentity }
    return { status: sessionStatus === 'active' ? 'unregistered' : sessionStatus }
  }
  const remote: AwikiRemote = {
    getConfig: () => { calls.push({ method: 'getConfig' }); return carried(success(options.config ?? { pollIntervalMs: 1000, attachmentMaxBytes: 10 * 1024 * 1024 })) },
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
    sendRegistrationOtp: (request) => { calls.push({ method: 'sendRegistrationOtp', request }); return carried(success({ retryAfterSeconds: 60, retryAt: '2026-08-14T00:00:00Z' })) },
    registerIdentity: (request) => {
      calls.push({ method: 'registerIdentity', request })
      currentIdentity = identity
      sessionStatus = 'active'
      return carried(success(identity))
    },
    updateDisplayName: (request) => {
      calls.push({ method: 'updateDisplayName', request })
      const current = options.identity === undefined ? identity : options.identity
      return carried(success({ ...(current ?? identity), displayName: request.displayName }))
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
        items: options.history ?? [message],
        hasMore: options.historyHasMore ?? false,
        ...(options.historyCursor === undefined ? {} : { nextCursor: options.historyCursor }),
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
    sendText: (request) => { calls.push({ method: 'sendText', request }); return carried(success({ ...message, id: 'sent' as AwikiMessageId, outgoing: true, content: { kind: 'text', text: request.text } })) },
    sendAttachment: (request) => { calls.push({ method: 'sendAttachment', request }); return carried(success({
      ...message,
      id: 'attachment-message' as AwikiMessageId,
      outgoing: true,
      content: { kind: 'attachment', attachment: { id: 'a1' as never, fileName: request.fileName, mimeType: request.mimeType, size: 3, sha256: 'abc' } },
    })) },
    downloadAttachment: (request) => { calls.push({ method: 'downloadAttachment', request }); return carried(success({
      attachment: { id: request.attachmentId, fileName: 'a.txt', mimeType: 'text/plain', size: 3, sha256: 'abc' },
      bytesBase64: 'YWJj',
    })) },
    clearLocalData: (request) => {
      calls.push({ method: 'clearLocalData', request })
      currentIdentity = null
      sessionStatus = 'unregistered'
      return carried(success({ cleared: true }))
    },
  }
  return { remote, calls }
}
