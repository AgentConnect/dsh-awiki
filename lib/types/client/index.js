/** AWiki browser plugin: one floating `shell.overlay` entry backed by Host Remote. */
import awikiRemote from 'dsh-awiki/remote';
import { AwikiController } from "./controller.js";
import { AwikiOverlay } from "./AwikiOverlay.js";
import { createAwikiOverlayStore } from "./store.js";
export { createAwikiOverlayStore } from "./store.js";
/** Required services: slot registry and the Client Remote carrier. */
export const inject = ['slots', 'remote'];
/**
 * Mount the optional AWiki Remote and register the frame-wide floating launcher and anchored chat panel.
 * @param ctx - browser context carrying slots and Remote.
 * @returns disposer for the slot injection and AWiki Remote contribution.
 */
export async function apply(ctx) {
    const disposeRemote = await ctx.remote.$mount(awikiRemote);
    let disposeSlot;
    try {
        const remote = ctx.get('remote.awiki');
        if (remote === undefined)
            throw new Error('ui-awiki: mounted Remote namespace is unavailable');
        disposeSlot = ctx.slots.inject('shell.overlay', () => {
            const controller = new AwikiController(remote);
            const dispose = ctx.slots.register({
                name: 'shell.overlay',
                id: 'awiki',
                order: 20,
                store: createAwikiOverlayStore,
                inject: () => ({
                    hooks: { awiki: controller },
                    open: () => controller.open(),
                    close: () => { controller.close(); },
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
            }, AwikiOverlay);
            return () => {
                dispose();
                controller.dispose();
            };
        });
    }
    catch (error) {
        await disposeRemote();
        throw error;
    }
    return async () => {
        disposeSlot();
        await disposeRemote();
    };
}
//# sourceMappingURL=index.js.map