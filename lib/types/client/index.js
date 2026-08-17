/** AWiki browser plugin: one floating `shell.overlay` entry backed by Host Remote. */
import awikiRemote from '@awiki/dsh/remote';
import { AWIKI_DOMAIN_FIELD, normalizeAwikiDomain, } from "../domain.js";
import { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION, AWIKI_LOGOUT_CONFIRMATION } from "../types.js";
import { AwikiController } from "./controller.js";
import { AwikiOverlay } from "./AwikiOverlay.js";
import { AwikiSettingsSection } from "./AwikiSettingsSection.js";
import { createAwikiOverlayStore } from "./store.js";
import { en, zh } from "./settings-locales.js";
import { AwikiSettingsController } from "./settings-controller.js";
export { createAwikiOverlayStore } from "./store.js";
/** Required services: Remote, Connection transport, locale, and slot registry. */
export const inject = ['slots', 'remote', 'connection', 'locale'];
/**
 * Mount the optional AWiki Remote and register the frame-wide floating launcher and anchored chat panel.
 * @param ctx - browser context carrying slots and Remote.
 * @returns disposer for the slot injection and AWiki Remote contribution.
 */
export async function apply(ctx) {
    const disposeRemote = await ctx.remote.$mount(awikiRemote);
    let disposeOverlay;
    let disposeSettings;
    let settingsController;
    let activeController;
    try {
        const remote = ctx.get('remote.awiki');
        if (remote === undefined)
            throw new Error('ui-awiki: mounted Remote namespace is unavailable');
        const connection = ctx.get('connection');
        if (connection === undefined)
            throw new Error('ui-awiki: Connection service is unavailable');
        const settings = new AwikiSettingsController(connection);
        settingsController = settings;
        await settings.load();
        ctx.effect(() => {
            const disposeZh = ctx.locale.register('settings.awiki', 'zh', zh);
            const disposeEn = ctx.locale.register('settings.awiki', 'en', en);
            return () => { disposeEn(); disposeZh(); };
        }, 'ui-awiki: settings dictionaries');
        disposeOverlay = ctx.slots.inject('shell.overlay', () => {
            const controller = new AwikiController(remote);
            activeController = controller;
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
                    summarizeConversation: () => controller.summarizeConversation(),
                    setSummaryCollapsed: (conversationId, collapsed) => { controller.setSummaryCollapsed(conversationId, collapsed); },
                    sendText: text => controller.sendText(text),
                    sendAttachment: file => controller.sendAttachment(file),
                    downloadAttachment: (messageId, attachmentId) => controller.downloadAttachment(messageId, attachmentId),
                    logout: () => controller.logout({ confirmation: AWIKI_LOGOUT_CONFIRMATION }),
                    login: () => controller.login(),
                }),
            }, AwikiOverlay);
            return () => {
                dispose();
                controller.dispose();
                if (activeController === controller)
                    activeController = undefined;
            };
        });
        const injectedSettings = () => ({
            hooks: { awikiSettings: settings },
            saveDomain: async (raw) => {
                const domain = normalizeAwikiDomain(raw);
                await settings.set(AWIKI_DOMAIN_FIELD, domain);
                if (settings.getSnapshot().value?.domain !== domain) {
                    throw new Error('AWiki domain setting was not accepted');
                }
            },
            resetDomain: async () => {
                await settings.unset(AWIKI_DOMAIN_FIELD);
                const snapshot = settings.getSnapshot();
                const base = typeof snapshot.base === 'object' && snapshot.base !== null && !Array.isArray(snapshot.base)
                    ? Reflect.get(snapshot.base, AWIKI_DOMAIN_FIELD)
                    : undefined;
                if (typeof base === 'string' && snapshot.value?.domain !== base) {
                    throw new Error('AWiki domain setting was not reset');
                }
            },
            clearLocalData: async () => {
                const controller = activeController ?? new AwikiController(remote);
                const temporary = activeController === undefined;
                try {
                    const result = await controller.clearLocalData({ confirmation: AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION });
                    if (!result.ok)
                        throw new Error(result.error);
                }
                finally {
                    if (temporary)
                        controller.dispose();
                }
            },
        });
        disposeSettings = ctx.slots.inject('settings.section', () => ctx.slots.register({
            name: 'settings.section',
            id: 'awiki',
            order: 30,
            label: () => ctx.locale.bind('settings.awiki')('nav'),
            locale: 'settings.awiki',
            inject: injectedSettings,
        }, AwikiSettingsSection));
    }
    catch (error) {
        settingsController?.dispose();
        await disposeRemote();
        throw error;
    }
    return async () => {
        disposeSettings();
        disposeOverlay();
        settingsController?.dispose();
        await disposeRemote();
    };
}
//# sourceMappingURL=index.js.map