/** AWiki browser plugin: one floating `shell.overlay` entry backed by Host Remote. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import awikiRemote from '@awiki/dsh-plugin/remote'
// Type-only imports supply the generated `ctx.remote.awiki` and target slot.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { AWIKI_DOMAIN_FIELD, normalizeAwikiDomain } from '../domain.ts'
import { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION, AWIKI_LOGOUT_CONFIRMATION } from '../types.ts'
import type { AwikiIntegrationFields, AwikiIntegrationView } from '../types.ts'
import { AwikiClientBridge } from './awiki-client-bridge.ts'
import { AwikiController, type AwikiActionResult, type AwikiRemote } from './controller.ts'
import { AwikiOverlay } from './AwikiOverlay.tsx'
import { AwikiSettingsSection, type AwikiSettingsInjected } from './AwikiSettingsSection.tsx'
import {
  clearIntegrationOperation,
  clearIntegrationOperations,
  durableIntegrationOperationId,
  type IntegrationOperationKind,
} from './integration-operation.ts'
import type { AwikiInjected } from './slots.ts'
import { createAwikiOverlayStore } from './store.ts'
import { en, zh } from './settings-locales.ts'
import { AwikiSettingsController } from './settings-controller.ts'

export type * from '../types.ts'
export type { AwikiActionResult, AwikiController, AwikiControllerStatus, AwikiRemote, AwikiSummaryStatus, AwikiSummaryView, AwikiView } from './controller.ts'
export type { AwikiClientBridge } from './awiki-client-bridge.ts'
export type { AwikiIdentityAccessProps } from './AwikiIdentityAccess.tsx'
export type { AwikiInjected, AwikiOverlayProps } from './slots.ts'
export type { AwikiSettingsInjected, AwikiSettingsSectionProps } from './AwikiSettingsSection.tsx'
export { createAwikiOverlayStore } from './store.ts'

async function durableIntegrationMutation<Value>(
  kind: IntegrationOperationKind,
  signature: string,
  operation: (idempotencyKey: string) => Promise<AwikiActionResult<Value>>,
): Promise<AwikiActionResult<Value>> {
  const result = await operation(durableIntegrationOperationId(kind, signature))
  if (result.ok) clearIntegrationOperation(kind)
  return result
}

/** Required services: Remote, Connection transport, locale, and slot registry. */
export const inject = ['slots', 'remote', 'connection', 'locale']

/**
 * Mount the optional AWiki Remote and register the frame-wide floating launcher and anchored chat panel.
 * @param ctx - browser context carrying slots and Remote.
 * @returns disposer for the slot injection and AWiki Remote contribution.
 */
export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(awikiRemote)
  let disposeOverlay: (() => void) | undefined
  let disposeSettings: (() => void) | undefined
  let settingsController: AwikiSettingsController | undefined
  let awikiController: AwikiController | undefined
  try {
    const remote = ctx.get('remote.awiki') as unknown as AwikiRemote | undefined
    if (remote === undefined) throw new Error('ui-awiki: mounted Remote namespace is unavailable')
    const connection = ctx.get('connection') as unknown as ConnectionHandle | undefined
    if (connection === undefined) throw new Error('ui-awiki: Connection service is unavailable')
    const settings = new AwikiSettingsController(connection)
    settingsController = settings
    const awiki = new AwikiController(remote)
    awikiController = awiki
    new AwikiClientBridge(ctx, awiki)
    await settings.load()
    ctx.effect(() => {
      const disposeZh = ctx.locale.register('settings.awiki', 'zh', zh)
      const disposeEn = ctx.locale.register('settings.awiki', 'en', en)
      return () => { disposeEn(); disposeZh() }
    }, 'ui-awiki: settings dictionaries')
    disposeOverlay = ctx.slots.inject('shell.overlay', () => {
      const dispose = ctx.slots.register({
        name: 'shell.overlay',
        id: 'awiki',
        order: 20,
        store: createAwikiOverlayStore,
        inject: (): AwikiInjected => ({
          hooks: { awiki },
          open: () => awiki.open(),
          close: () => { awiki.close() },
          inspectIdentityAccess: request => awiki.inspectIdentityAccess(request),
          sendRegistrationOtp: request => awiki.sendRegistrationOtp(request),
          registerIdentity: request => awiki.registerIdentity(request),
          beginDeviceJoin: () => awiki.beginDeviceJoin(),
          getDeviceJoinStatus: () => awiki.getDeviceJoinStatus(),
          cancelDeviceJoin: () => awiki.cancelDeviceJoin(),
          refreshDeviceManagement: () => awiki.refreshDeviceManagement(),
          startDeviceJoinVerification: request => awiki.startDeviceJoinVerification(request),
          approveDeviceJoin: request => awiki.approveDeviceJoin(request),
          rejectDeviceJoin: request => awiki.rejectDeviceJoin(request),
          revokeDevice: request => awiki.revokeDevice(request),
          prepareRootTransfer: request => awiki.prepareRootTransfer(request),
          confirmRootTransfer: request => awiki.confirmRootTransfer(request),
          updateDisplayName: displayName => awiki.updateDisplayName(displayName),
          updateProfile: request => awiki.updateProfile(request),
          sendRecoveryOtp: request => awiki.sendRecoveryOtp(request),
          prepareRecovery: request => awiki.prepareRecovery(request),
          activateRecovery: () => awiki.activateRecovery(),
          refreshRecoveryStatus: () => awiki.refreshRecoveryStatus(),
          resumeRecovery: () => awiki.resumeRecovery(),
          discardRecovery: () => awiki.discardRecovery(),
          loadMoreConversations: () => awiki.loadMoreConversations(),
          hideConversation: conversationId => awiki.hideConversation(conversationId),
          restoreConversation: conversationId => awiki.restoreConversation(conversationId),
          startDirectChat: handle => awiki.startDirectChat(handle),
          createGroup: (name, members) => awiki.createGroup(name, members),
          joinGroup: groupDid => awiki.joinGroup(groupDid),
          refreshSelectedGroup: () => awiki.refreshSelectedGroup(),
          loadMoreGroupMembers: () => awiki.loadMoreGroupMembers(),
          addSelectedGroupMember: member => awiki.addSelectedGroupMember(member),
          removeSelectedGroupMember: member => awiki.removeSelectedGroupMember(member),
          leaveSelectedGroup: () => awiki.leaveSelectedGroup(),
          selectConversation: conversationId => awiki.selectConversation(conversationId),
          markSelectedConversationRead: () => awiki.markSelectedConversationRead(),
          loadOlderHistory: () => awiki.loadOlderHistory(),
          summarizeConversation: () => awiki.summarizeConversation(),
          setSummaryCollapsed: (conversationId, collapsed) => { awiki.setSummaryCollapsed(conversationId, collapsed) },
          sendText: (text, clientMessageId, mentions) => awiki.sendText(text, clientMessageId, mentions),
          sendAttachment: file => awiki.sendAttachment(file),
          downloadAttachment: (messageId, attachmentId) => awiki.downloadAttachment(messageId, attachmentId),
          logout: () => awiki.logout({ confirmation: AWIKI_LOGOUT_CONFIRMATION }),
          login: () => awiki.login(),
          clearLocalIdentity: async () => {
            const result = await awiki.clearLocalData({ confirmation: AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION })
            return result.ok ? { ok: true, value: undefined } : result
          },
          getMailAccount: () => awiki.getMailAccount(),
          listMailInbox: request => awiki.listMailInbox(request),
          readMail: request => awiki.readMail(request),
          markMailRead: request => awiki.markMailRead(request),
          sendMail: request => awiki.sendMail(request),
        }),
      }, AwikiOverlay)
      return dispose
    })
    const injectedSettings = (): AwikiSettingsInjected => ({
      hooks: { awikiTenants: settings.tenantScope, awikiSettings: settings },
      saveDomain: async (raw) => {
        const domain = normalizeAwikiDomain(raw)
        await settings.set(AWIKI_DOMAIN_FIELD, domain)
      },
      resetDomain: () => settings.unset(AWIKI_DOMAIN_FIELD),
      createTenant: (displayName, domain) => settings.createTenant(displayName, domain),
      renameTenant: (tenantId, displayName) => settings.renameTenant(tenantId, displayName),
      switchTenant: async (tenantId) => {
        await settings.switchTenant(tenantId)
        await awiki.loadSession()
      },
      archiveTenant: tenantId => settings.archiveTenant(tenantId),
      refreshUpdatePolicy: () => settings.refreshUpdatePolicy(),
      clearLocalData: async () => {
        const result = await awiki.clearLocalData({ confirmation: AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION })
        if (!result.ok) throw new Error(result.error)
      },
      loadIntegration: async () => {
        const result = await awiki.getIntegration()
        if (!result.ok && result.error === '尚未创建 Integration。') {
          clearIntegrationOperations()
          return { ok: true, value: null }
        }
        if (result.ok) clearIntegrationOperations()
        return result
      },
      saveIntegration: (fields: AwikiIntegrationFields, current: AwikiIntegrationView | null) => current === null
        ? durableIntegrationMutation('create', JSON.stringify(fields), idempotencyKey => awiki.createIntegration({ ...fields, idempotencyKey }))
        : durableIntegrationMutation(
            'update',
            JSON.stringify({ owner: current.owner.handle, revision: current.revision, fields }),
            idempotencyKey => awiki.updateIntegration({ ...fields, expectedRevision: current.revision, idempotencyKey }),
          ),
      rotateIntegrationId: current => durableIntegrationMutation(
        'rotate',
        `${current.owner.handle}:${current.id}:${current.revision}`,
        idempotencyKey => awiki.rotateIntegrationId({ expectedRevision: current.revision, idempotencyKey }),
      ),
      closeIntegration: current => durableIntegrationMutation(
        'close',
        `${current.owner.handle}:${current.id}:${current.revision}`,
        idempotencyKey => awiki.closeIntegration({ expectedRevision: current.revision, idempotencyKey }),
      ),
      reopenIntegration: (fields, current) => durableIntegrationMutation(
        'reopen',
        JSON.stringify({ owner: current.owner.handle, revision: current.revision, fields }),
        idempotencyKey => awiki.reopenIntegration({
          ...fields,
          expectedRevision: current.revision,
          idempotencyKey,
        }),
      ),
      listOwnedGroups: () => awiki.listOwnedGroups(),
      openIntegrationGuide: () => { awiki.openIntegrationGuide() },
    })
    disposeSettings = ctx.slots.inject('settings.section', () => ctx.slots.register({
      name: 'settings.section',
      id: 'awiki',
      order: 30,
      label: () => ctx.locale.bind('settings.awiki')('nav'),
      locale: 'settings.awiki',
      inject: injectedSettings,
    }, AwikiSettingsSection))
  } catch (error) {
    disposeSettings?.()
    disposeOverlay?.()
    awikiController?.dispose()
    settingsController?.dispose()
    await disposeRemote()
    throw error
  }
  return async () => {
    disposeSettings?.()
    disposeOverlay?.()
    awikiController?.dispose()
    settingsController?.dispose()
    await disposeRemote()
  }
}
