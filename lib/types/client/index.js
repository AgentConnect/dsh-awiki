/** AWiki browser plugin: one floating `shell.overlay` entry backed by Host Remote. */
import awikiRemote from '@awiki/dsh-plugin/remote';
import { AWIKI_DOMAIN_FIELD, normalizeAwikiDomain, } from "../domain.js";
import { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION, AWIKI_LOGOUT_CONFIRMATION } from "../types.js";
import { AwikiClientBridge } from "./awiki-client-bridge.js";
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
    let awikiController;
    try {
        const remote = ctx.get('remote.awiki');
        if (remote === undefined)
            throw new Error('ui-awiki: mounted Remote namespace is unavailable');
        const connection = ctx.get('connection');
        if (connection === undefined)
            throw new Error('ui-awiki: Connection service is unavailable');
        const settings = new AwikiSettingsController(connection);
        settingsController = settings;
        const awiki = new AwikiController(remote);
        awikiController = awiki;
        new AwikiClientBridge(ctx, awiki);
        await settings.load();
        ctx.effect(() => {
            const disposeZh = ctx.locale.register('settings.awiki', 'zh', zh);
            const disposeEn = ctx.locale.register('settings.awiki', 'en', en);
            return () => { disposeEn(); disposeZh(); };
        }, 'ui-awiki: settings dictionaries');
        disposeOverlay = ctx.slots.inject('shell.overlay', () => {
            const dispose = ctx.slots.register({
                name: 'shell.overlay',
                id: 'awiki',
                order: 20,
                store: createAwikiOverlayStore,
                inject: () => ({
                    hooks: { awiki },
                    open: () => awiki.open(),
                    close: () => { awiki.close(); },
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
                    setSummaryCollapsed: (conversationId, collapsed) => { awiki.setSummaryCollapsed(conversationId, collapsed); },
                    sendText: (text, clientMessageId, mentions) => awiki.sendText(text, clientMessageId, mentions),
                    sendAttachment: file => awiki.sendAttachment(file),
                    downloadAttachment: (messageId, attachmentId) => awiki.downloadAttachment(messageId, attachmentId),
                    logout: () => awiki.logout({ confirmation: AWIKI_LOGOUT_CONFIRMATION }),
                    login: () => awiki.login(),
                    clearLocalIdentity: async () => {
                        const result = await awiki.clearLocalData({ confirmation: AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION });
                        return result.ok ? { ok: true, value: undefined } : result;
                    },
                    getMailAccount: () => awiki.getMailAccount(),
                    listMailInbox: request => awiki.listMailInbox(request),
                    readMail: request => awiki.readMail(request),
                    markMailRead: request => awiki.markMailRead(request),
                    sendMail: request => awiki.sendMail(request),
                }),
            }, AwikiOverlay);
            return dispose;
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
                const result = await awiki.clearLocalData({ confirmation: AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION });
                if (!result.ok)
                    throw new Error(result.error);
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
        disposeSettings?.();
        disposeOverlay?.();
        awikiController?.dispose();
        settingsController?.dispose();
        await disposeRemote();
        throw error;
    }
    return async () => {
        disposeSettings?.();
        disposeOverlay?.();
        awikiController?.dispose();
        settingsController?.dispose();
        await disposeRemote();
    };
}
//# sourceMappingURL=index.js.map