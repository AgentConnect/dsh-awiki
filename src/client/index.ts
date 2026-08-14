/** AWiki browser plugin: one floating `shell.overlay` entry backed by Host Remote. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import awikiRemote from 'dsh-awiki/remote'
// Type-only imports supply the generated `ctx.remote.awiki` and target slot.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import {
  AWIKI_DOMAIN_FIELD,
  AWIKI_SETTINGS_NAMESPACE,
  normalizeAwikiDomain,
} from '../domain.ts'
import type { AwikiSettings } from '../settings.ts'
import { AwikiController, type AwikiRemote } from './controller.ts'
import { AwikiOverlay } from './AwikiOverlay.tsx'
import { AwikiSettingsSection, type AwikiSettingsInjected } from './AwikiSettingsSection.tsx'
import type { AwikiInjected } from './slots.ts'
import { createAwikiOverlayStore } from './store.ts'
import { en, zh } from './settings-locales.ts'

export type * from '../types.ts'
export type { AwikiActionResult, AwikiControllerStatus, AwikiRemote, AwikiView } from './controller.ts'
export type { AwikiInjected, AwikiOverlayProps } from './slots.ts'
export type { AwikiSettingsInjected, AwikiSettingsSectionProps } from './AwikiSettingsSection.tsx'
export { createAwikiOverlayStore } from './store.ts'

/** Required services: Remote, settings transport, locale, and slot registry. */
export const inject = ['slots', 'remote', 'connection', 'settingsScope', 'locale']

/**
 * Mount the optional AWiki Remote and register the frame-wide floating launcher and anchored chat panel.
 * @param ctx - browser context carrying slots and Remote.
 * @returns disposer for the slot injection and AWiki Remote contribution.
 */
export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(awikiRemote)
  let disposeOverlay: () => void
  let disposeSettings: () => void
  try {
    const remote = ctx.get('remote.awiki') as unknown as AwikiRemote | undefined
    if (remote === undefined) throw new Error('ui-awiki: mounted Remote namespace is unavailable')
    const settings = ctx.settingsScope.bind<AwikiSettings>({ namespace: AWIKI_SETTINGS_NAMESPACE })
    ctx.effect(() => {
      const disposeZh = ctx.locale.register('settings.awiki', 'zh', zh)
      const disposeEn = ctx.locale.register('settings.awiki', 'en', en)
      return () => { disposeEn(); disposeZh() }
    }, 'ui-awiki: settings dictionaries')
    disposeOverlay = ctx.slots.inject('shell.overlay', () => {
      const controller = new AwikiController(remote)
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
          loadOlderHistory: () => controller.loadOlderHistory(),
          sendText: text => controller.sendText(text),
          sendAttachment: file => controller.sendAttachment(file),
          downloadAttachment: (messageId, attachmentId) => controller.downloadAttachment(messageId, attachmentId),
        }),
      }, AwikiOverlay)
      return () => {
        dispose()
        controller.dispose()
      }
    })
    const injectedSettings = (): AwikiSettingsInjected => ({
      hooks: { awikiSettings: settings },
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
    await disposeRemote()
    throw error
  }
  return async () => {
    disposeSettings()
    disposeOverlay()
    await disposeRemote()
  }
}
