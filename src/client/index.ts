/** AWiki browser plugin: one floating `shell.overlay` entry backed by Host Remote. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import awikiRemote from 'dsh-awiki/remote'
// Type-only imports supply the generated `ctx.remote.awiki` and target slot.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { AwikiController, type AwikiRemote } from './controller.ts'
import { AwikiOverlay } from './AwikiOverlay.tsx'
import type { AwikiInjected } from './slots.ts'
import { createAwikiOverlayStore } from './store.ts'

export type * from '../types.ts'
export type { AwikiActionResult, AwikiControllerStatus, AwikiRemote, AwikiView } from './controller.ts'
export type { AwikiInjected, AwikiOverlayProps } from './slots.ts'
export { createAwikiOverlayStore } from './store.ts'

/** Required services: slot registry and the Client Remote carrier. */
export const inject = ['slots', 'remote']

/**
 * Mount the optional AWiki Remote and register the frame-wide floating launcher and anchored chat panel.
 * @param ctx - browser context carrying slots and Remote.
 * @returns disposer for the slot injection and AWiki Remote contribution.
 */
export async function apply(ctx: ClientContext): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(awikiRemote)
  let disposeSlot: () => void
  try {
    const remote = ctx.get('remote.awiki') as unknown as AwikiRemote | undefined
    if (remote === undefined) throw new Error('ui-awiki: mounted Remote namespace is unavailable')
    disposeSlot = ctx.slots.inject('shell.overlay', () => {
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
  } catch (error) {
    await disposeRemote()
    throw error
  }
  return async () => {
    disposeSlot()
    await disposeRemote()
  }
}
