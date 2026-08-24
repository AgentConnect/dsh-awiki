/** Model Proxy browser plugin: Quick Recharge settings and hosted-model onboarding. */
import { AwikiOnboarding } from "./AwikiOnboarding.js";
import { ModelProxySettingsSection } from "./ModelProxySettingsSection.js";
import { contactModelProxyDeveloper } from "./contact-developer.js";
import { ModelAvailabilityController } from "./model-availability-controller.js";
import { AwikiModelProxyController } from "./model-proxy-controller.js";
import { AWIKI_RECHARGE_ENABLED } from "./recharge-availability.js";
import { en, zh } from "./settings-locales.js";
export { AWIKI_MODEL_PROXY_DEVELOPER_HANDLE, AWIKI_PLUGIN_INSTALL_COMMAND, contactModelProxyDeveloper, } from "./contact-developer.js";
/** Required services supplied by the main AWiki client and DSH browser runtime. */
export const inject = ['slots', 'remote', 'connection', 'locale', 'awikiClient'];
/** Register Model Proxy-owned Browser surfaces only when this package is installed. */
export async function apply(ctx) {
    const connection = ctx.get('connection');
    if (connection === undefined)
        throw new Error('ui-awiki-model-proxy: Connection service is unavailable');
    const awikiClient = ctx.get('awikiClient');
    if (awikiClient === undefined)
        throw new Error('ui-awiki-model-proxy: AWiki client bridge is unavailable');
    const identity = awikiClient.identity;
    const availability = new ModelAvailabilityController(connection);
    const models = new AwikiModelProxyController(connection, identity, AWIKI_RECHARGE_ENABLED);
    let disposeSettings;
    let disposeOnboarding;
    try {
        await models.probe();
        ctx.effect(() => {
            const disposeZh = ctx.locale.register('settings.awiki-model-proxy', 'zh', zh);
            const disposeEn = ctx.locale.register('settings.awiki-model-proxy', 'en', en);
            return () => { disposeEn(); disposeZh(); };
        }, 'ui-awiki-model-proxy: settings dictionaries');
        ctx.effect(() => {
            const refresh = () => { availability.refreshIfLoaded(); };
            const disposers = [
                ctx.remote.$on('settings/document-updated', refresh),
                ctx.remote.$on('credentials/reference-updated', refresh),
                ctx.remote.$on('llm/adapters-updated', refresh),
                ctx.on('connection/reset', refresh),
            ];
            return () => { for (const dispose of disposers)
                dispose(); };
        }, 'ui-awiki-model-proxy: model availability invalidations');
        disposeSettings = ctx.slots.inject('settings.section', () => ctx.slots.register({
            name: 'settings.section',
            id: 'awiki-model-proxy',
            order: 31,
            label: () => ctx.locale.bind('settings.awiki-model-proxy')('nav'),
            locale: 'settings.awiki-model-proxy',
            inject: () => ({
                hooks: { awikiModelProxy: models, awikiSession: identity },
                identity,
                models,
                rechargeEnabled: AWIKI_RECHARGE_ENABLED,
                contactDeveloper: () => contactModelProxyDeveloper(awikiClient),
            }),
        }, ModelProxySettingsSection));
        disposeOnboarding = ctx.slots.inject('settings.onboarding', () => ctx.slots.register({
            name: 'settings.onboarding',
            id: 'awiki-model-proxy',
            order: -10,
            locale: 'settings.awiki-model-proxy',
            inject: () => ({
                hooks: { awikiOnboarding: identity, awikiModelAvailability: availability, awikiModelProxy: models },
                identity,
                IdentityAccess: awikiClient.IdentityAccess,
                clearLocalIdentity: awikiClient.clearLocalIdentity,
                availability,
                models,
                rechargeEnabled: AWIKI_RECHARGE_ENABLED,
            }),
        }, AwikiOnboarding));
    }
    catch (error) {
        const cleanupErrors = cleanupModelProxy(disposeOnboarding, disposeSettings, models, availability);
        throw combineSetupAndCleanupErrors(error, cleanupErrors);
    }
    return () => {
        throwCleanupErrors(cleanupModelProxy(disposeOnboarding, disposeSettings, models, availability));
    };
}
function cleanupModelProxy(disposeOnboarding, disposeSettings, models, availability) {
    const errors = [];
    for (const dispose of [
        disposeOnboarding,
        disposeSettings,
        () => { models.dispose(); },
        () => { availability.dispose(); },
    ]) {
        if (dispose === undefined)
            continue;
        try {
            dispose();
        }
        catch (error) {
            errors.push(error);
        }
    }
    return errors;
}
function combineSetupAndCleanupErrors(setupError, cleanupErrors) {
    if (cleanupErrors.length === 0)
        return setupError;
    return new AggregateError([setupError, ...cleanupErrors], 'ui-awiki-model-proxy setup failed and cleanup also failed', { cause: setupError });
}
function throwCleanupErrors(errors) {
    if (errors.length === 0)
        return;
    if (errors.length === 1)
        throw errors[0];
    throw new AggregateError(errors, 'ui-awiki-model-proxy cleanup failed');
}
//# sourceMappingURL=index.js.map