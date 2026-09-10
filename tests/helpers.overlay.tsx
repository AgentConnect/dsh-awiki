import { useSyncExternalStore } from 'react'
import { render } from '@testing-library/react'
import { AwikiController } from '../src/client/controller.ts'
import { AwikiOverlay } from '../src/client/AwikiOverlay.tsx'
import { createAwikiOverlayStore } from '../src/client/store.ts'
import type { AwikiOverlayProps } from '../src/client/slots.ts'
import { fakeRemote } from './helpers.client.ts'

/** Render the pure component with real observable/controller/store products. */
export function renderOverlay(options: Parameters<typeof fakeRemote>[0] & { registered?: boolean } = {}) {
  const { registered, ...remoteOptions } = options
  const identityOption = registered === false
    ? { identity: null }
    : remoteOptions.identity === undefined ? {} : { identity: remoteOptions.identity }
  const fake = fakeRemote({ ...remoteOptions, ...identityOption })
  const controller = new AwikiController(fake.remote)
  const instance = createAwikiOverlayStore().create()
  const useStore: AwikiOverlayProps['useStore'] = selector =>
    useSyncExternalStore(
      (listener: () => void) => instance.subscribe(listener),
      () => selector(instance.getSnapshot()),
    )
  const useAwiki: AwikiOverlayProps['useAwiki'] = selector =>
    useSyncExternalStore(
      (listener: () => void) => controller.subscribe(listener),
      () => selector(controller.getSnapshot()),
    )
  const props: AwikiOverlayProps = {
    drafts: controller.drafts,
    refreshIdentityAccess: () => controller.refreshIdentityAccess(),
    selectRecovery: id => controller.selectRecovery(id),
    leaveRecovery: () => controller.leaveRecovery(),
    continueRecoveryForHandle: handle => controller.continueRecoveryForHandle(handle),
    enterRecoveredSession: () => controller.enterRecoveredSession(),
    useStore,
    actions: instance.actions,
    useAwiki,
    open: () => controller.open(),
    close: () => { controller.close() },
    inspectIdentityAccess: request => controller.inspectIdentityAccess(request),
    sendRegistrationOtp: request => controller.sendRegistrationOtp(request),
    registerIdentity: request => controller.registerIdentity(request),
    beginDeviceJoin: () => controller.beginDeviceJoin(),
    getDeviceJoinStatus: () => controller.getDeviceJoinStatus(),
    cancelDeviceJoin: () => controller.cancelDeviceJoin(),
    beginRecoveryFromDeviceJoin: request => controller.beginRecoveryFromDeviceJoin(request),
    retireDeviceIdentityForRejoin: () => controller.retireDeviceIdentityForRejoin(),
    refreshDeviceManagement: () => controller.refreshDeviceManagement(),
    startDeviceJoinVerification: request => controller.startDeviceJoinVerification(request),
    approveDeviceJoin: request => controller.approveDeviceJoin(request),
    rejectDeviceJoin: request => controller.rejectDeviceJoin(request),
    revokeDevice: request => controller.revokeDevice(request),
    prepareRootTransfer: request => controller.prepareRootTransfer(request),
    confirmRootTransfer: request => controller.confirmRootTransfer(request),
    updateDisplayName: displayName => controller.updateDisplayName(displayName),
    updateProfile: request => controller.updateProfile(request),
    sendRecoveryOtp: request => controller.sendRecoveryOtp(request),
    prepareRecovery: request => controller.prepareRecovery(request),
    activateRecovery: () => controller.activateRecovery(),
    refreshRecoveryStatus: () => controller.refreshRecoveryStatus(),
    resumeRecovery: () => controller.resumeRecovery(),
    discardRecovery: () => controller.discardRecovery(),
    loadMoreConversations: () => controller.loadMoreConversations(),
    hideConversation: conversationId => controller.hideConversation(conversationId),
    restoreConversation: conversationId => controller.restoreConversation(conversationId),
    startDirectChat: handle => controller.startDirectChat(handle),
    createGroup: (name, members) => controller.createGroup(name, members),
    joinGroup: groupDid => controller.joinGroup(groupDid),
    refreshSelectedGroup: () => controller.refreshSelectedGroup(),
    loadMoreGroupMembers: () => controller.loadMoreGroupMembers(),
    addSelectedGroupMember: member => controller.addSelectedGroupMember(member),
    removeSelectedGroupMember: member => controller.removeSelectedGroupMember(member),
    leaveSelectedGroup: () => controller.leaveSelectedGroup(),
    selectConversation: id => controller.selectConversation(id),
    markSelectedConversationRead: () => controller.markSelectedConversationRead(),
    loadOlderHistory: () => controller.loadOlderHistory(),
    summarizeConversation: () => controller.summarizeConversation(),
    setSummaryCollapsed: (conversationId, collapsed) => { controller.setSummaryCollapsed(conversationId, collapsed) },
    sendText: (text, clientMessageId, mentions) => controller.sendText(text, clientMessageId, mentions),
    sendAttachment: file => controller.sendAttachment(file),
    downloadAttachment: (messageId, attachmentId) => controller.downloadAttachment(messageId, attachmentId),
    logout: () => controller.logout({ confirmation: 'logout-awiki-session' }),
    login: () => controller.login(),
    clearLocalIdentity: async () => {
      const result = await controller.clearLocalData({ confirmation: 'clear-awiki-local-data' })
      return result.ok ? { ok: true, value: undefined } : result
    },
    getMailAccount: () => controller.getMailAccount(),
    listMailInbox: request => controller.listMailInbox(request),
    readMail: request => controller.readMail(request),
    markMailRead: request => controller.markMailRead(request),
    sendMail: request => controller.sendMail(request),
    useSessions: (() => undefined) as never,
    useWorkspaces: (() => undefined) as never,
  }
  render(<AwikiOverlay {...props} />)
  return { fake, controller, instance, props }
}
