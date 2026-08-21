/** Model Proxy projection of whether any Harness model provider can serve requests. */
const INITIAL = Object.freeze({
    status: 'idle',
    usable: false,
    error: null,
});
/**
 * Join the public provider, settings, and credential APIs into one onboarding fact.
 * Active routes without a credential reference authenticate through their provider's own path.
 */
export class ModelAvailabilityController {
    connection;
    view = INITIAL;
    listeners = new Set();
    generation = 0;
    disposed = false;
    constructor(connection) {
        this.connection = connection;
    }
    getSnapshot = () => this.view;
    subscribe = (listener) => {
        if (this.disposed)
            return () => { };
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    };
    async load() {
        if (this.disposed)
            return;
        const generation = ++this.generation;
        this.publish({ ...this.view, status: 'loading', error: null });
        try {
            const [providersResponse, settingsResponse] = await Promise.all([
                this.connection.api.llm.providers({}),
                this.connection.api.settings.describe({}),
            ]);
            if (!providersResponse.result.ok)
                throw new Error(providersResponse.result.error.message);
            if (!settingsResponse.result.ok)
                throw new Error(settingsResponse.result.error.message);
            const namespaces = new Map(settingsResponse.result.value.namespaces.map(namespace => [namespace.ns, namespace]));
            const activeProviders = providersResponse.result.value.providers.filter(provider => provider.active);
            const credentialRefs = activeProviders.map(provider => credentialRef(provider, namespaces));
            let usable = credentialRefs.some(ref => ref === undefined);
            if (!usable) {
                const refs = [...new Set(credentialRefs.filter((ref) => ref !== undefined))];
                if (refs.length > 0) {
                    const credentialsResponse = await this.connection.api.credentials.describe({ refs });
                    const credentialsResult = credentialsResponse.result;
                    if (!credentialsResult.ok)
                        throw new Error(credentialsResult.error.message);
                    const credentials = credentialsResult.value.credentials;
                    usable = refs.some(ref => credentials[ref]?.configured === true);
                }
            }
            if (generation !== this.generation || this.disposed)
                return;
            this.publish({ status: 'ready', usable, error: null });
        }
        catch (error) {
            if (generation !== this.generation || this.disposed)
                return;
            this.publish({ status: 'unavailable', usable: false, error: message(error) });
        }
    }
    refreshIfLoaded() {
        if (this.view.status === 'idle')
            return;
        void this.load();
    }
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.generation += 1;
        this.listeners.clear();
    }
    publish(view) {
        if (this.disposed)
            return;
        this.view = view;
        for (const listener of this.listeners)
            listener();
    }
}
function credentialRef(provider, namespaces) {
    const namespace = namespaces.get(provider.settingsNs);
    if (namespace === undefined)
        return undefined;
    const profile = valueAtPath(namespace.value, provider.settingsPath);
    if (!isRecord(profile))
        return undefined;
    const value = profile.apiKeyEnv;
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}
function valueAtPath(value, path) {
    let current = value;
    for (const segment of path) {
        if (!isRecord(current))
            return undefined;
        current = current[segment];
    }
    return current;
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function message(error) {
    return error instanceof Error && error.message !== '' ? error.message : '模型可用性暂时无法确认';
}
//# sourceMappingURL=model-availability-controller.js.map