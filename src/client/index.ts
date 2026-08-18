/** AWiki browser plugin: one floating `shell.overlay` entry backed by Host Remote. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import awikiRemote from '@awiki/dsh-plugin/remote'
// Type-only imports supply the generated `ctx.remote.awiki` and target slot.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  AWIKI_DOMAIN_FIELD,
  normalizeAwikiDomain,
} from '../domain.ts'
import { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION, AWIKI_LOGOUT_CONFIRMATION } from '../types.ts'
import { AwikiController, type AwikiRemote } from './controller.ts'
import { AwikiOnboarding, type AwikiOnboardingInjected } from './AwikiOnboarding.tsx'
import { AwikiOverlay } from './AwikiOverlay.tsx'
import { AwikiSettingsSection, type AwikiSettingsInjected } from './AwikiSettingsSection.tsx'
import { AwikiModelProxyController } from './model-proxy-controller.ts'
import type { AwikiInjected } from './slots.ts'
import { createAwikiOverlayStore } from './store.ts'
import { en, zh } from './settings-locales.ts'
import { AwikiSettingsController } from './settings-controller.ts'

export type * from '../types.ts'
export type { AwikiActionResult, AwikiControllerStatus, AwikiRemote, AwikiSummaryStatus, AwikiSummaryView, AwikiView } from './controller.ts'
export type { AwikiInjected, AwikiOverlayProps } from './slots.ts'
export type { AwikiSettingsInjected, AwikiSettingsSectionProps } from './AwikiSettingsSection.tsx'
export type { AwikiOnboardingInjected, AwikiOnboardingProps } from './AwikiOnboarding.tsx'
export type { AwikiModelProxyView } from './model-proxy-controller.ts'
export { createAwikiOverlayStore } from './store.ts'

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
  let disposeOnboarding: (() => void) | undefined
  let settingsController: AwikiSettingsController | undefined
  let modelController: AwikiModelProxyController | undefined
  let onboardingController: AwikiController | undefined
  let activeController: AwikiController | undefined
  try {
    const remote = ctx.get('remote.awiki') as unknown as AwikiRemote | undefined
    if (remote === undefined) throw new Error('ui-awiki: mounted Remote namespace is unavailable')
    const connection = ctx.get('connection') as unknown as ConnectionHandle | undefined
    if (connection === undefined) throw new Error('ui-awiki: Connection service is unavailable')
    const settings = new AwikiSettingsController(connection)
    settingsController = settings
    const models = new AwikiModelProxyController(connection)
    modelController = models
    const onboardingIdentity = new AwikiController(remote)
    onboardingController = onboardingIdentity
    await settings.load()
    ctx.effect(() => {
      const disposeZh = ctx.locale.register('settings.awiki', 'zh', zh)
      const disposeEn = ctx.locale.register('settings.awiki', 'en', en)
      return () => { disposeEn(); disposeZh() }
    }, 'ui-awiki: settings dictionaries')
    disposeOverlay = ctx.slots.inject('shell.overlay', () => {
      const controller = new AwikiController(remote)
      activeController = controller
      const dispose = ctx.slots.register({
        name: 'shell.overlay',
        id: 'awiki',
        order: 20,
        store: createAwikiOverlayStore,
        inject: (): AwikiInjected => ({
          hooks: { awiki: controller },
          open: () => controller.open(),
          close: () => { controller.close() },
          sendRegistrationOtp: request => controller.sendRegistrationOtp(request),
          registerIdentity: request => controller.registerIdentity(request),
          updateDisplayName: displayName => controller.updateDisplayName(displayName),
          loadMoreConversations: () => controller.loadMoreConversations(),
          startDirectChat: handle => controller.startDirectChat(handle),
          selectConversation: conversationId => controller.selectConversation(conversationId),
          markSelectedConversationRead: () => controller.markSelectedConversationRead(),
          loadOlderHistory: () => controller.loadOlderHistory(),
          summarizeConversation: () => controller.summarizeConversation(),
          setSummaryCollapsed: (conversationId, collapsed) => { controller.setSummaryCollapsed(conversationId, collapsed) },
          sendText: text => controller.sendText(text),
          sendAttachment: file => controller.sendAttachment(file),
          downloadAttachment: (messageId, attachmentId) => controller.downloadAttachment(messageId, attachmentId),
          logout: () => controller.logout({ confirmation: AWIKI_LOGOUT_CONFIRMATION }),
          login: () => controller.login(),
        }),
      }, AwikiOverlay)
      return () => {
        dispose()
        controller.dispose()
        if (activeController === controller) activeController = undefined
      }
    })
    const injectedSettings = (): AwikiSettingsInjected => ({
      hooks: { awikiSettings: settings, awikiModelProxy: models },
      models,
      saveDomain: async (raw) => {
        const domain = normalizeAwikiDomain(raw)
        await settings.set(AWIKI_DOMAIN_FIELD, domain)
        if (settings.getSnapshot().value?.domain !== domain) {
          throw new Error('AWiki domain setting was not accepted')
        }
      },
      resetDomain: async () => {
        await settings.unset(AWIKI_DOMAIN_FIELD)
        const snapshot = settings.getSnapshot()
        const base = typeof snapshot.base === 'object' && snapshot.base !== null && !Array.isArray(snapshot.base)
          ? Reflect.get(snapshot.base, AWIKI_DOMAIN_FIELD)
          : undefined
        if (typeof base === 'string' && snapshot.value?.domain !== base) {
          throw new Error('AWiki domain setting was not reset')
        }
      },
      clearLocalData: async () => {
        const controller = activeController ?? new AwikiController(remote)
        const temporary = activeController === undefined
        try {
          const result = await controller.clearLocalData({ confirmation: AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION })
          if (!result.ok) throw new Error(result.error)
        } finally {
          if (temporary) controller.dispose()
        }
      },
    })
    disposeSettings = ctx.slots.inject('settings.section', () => ctx.slots.register({
      name: 'settings.section',
      id: 'awiki',
      order: 30,
      label: () => ctx.locale.bind('settings.awiki')('nav'),
      locale: 'settings.awiki',
      inject: injectedSettings,
    }, AwikiSettingsSection))
    disposeOnboarding = ctx.slots.inject('settings.onboarding', () => ctx.slots.register({
      name: 'settings.onboarding',
      id: 'awiki-model-proxy',
      order: -10,
      locale: 'settings.awiki',
      inject: (): AwikiOnboardingInjected => ({
        hooks: { awikiOnboarding: onboardingIdentity, awikiModelProxy: models },
        identity: onboardingIdentity,
        models,
      }),
    }, AwikiOnboarding))
  } catch (error) {
    disposeOnboarding?.()
    disposeSettings?.()
    disposeOverlay?.()
    onboardingController?.dispose()
    modelController?.dispose()
    settingsController?.dispose()
    await disposeRemote()
    throw error
  }
  return async () => {
    disposeOnboarding?.()
    disposeSettings?.()
    disposeOverlay?.()
    onboardingController?.dispose()
    modelController?.dispose()
    settingsController?.dispose()
    await disposeRemote()
  }
}
