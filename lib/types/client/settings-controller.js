/** Reactive browser mirror for AWiki's loopback-only settings channel. */
import { AWIKI_DOMAIN_FIELD, normalizeAwikiDomain } from "../domain.js";
import { AWIKI_SETTINGS_RPC_CHANNEL, AWIKI_SETTINGS_RPC_ENDPOINTS, decodeAwikiSettingsRpcView, decodeAwikiTenantRpcView, decodeAwikiUpdatePolicyRpcView, } from "../settings-rpc-contract.js";
const INITIAL_HOST_SNAPSHOT = {
    status: 'loading',
    value: undefined,
    base: undefined,
    user: undefined,
    revision: undefined,
    writable: false,
    mode: 'host',
};
const REMOTE_SNAPSHOT = {
    ...INITIAL_HOST_SNAPSHOT,
    status: 'unavailable',
    mode: 'memory',
};
const INITIAL_TENANTS = {
    schemaVersion: 1,
    officialCatalogVersion: 1,
    generation: 0,
    activeTenantId: '',
    tenants: [],
    switching: false,
};
/** Plugin-owned SettingsScope implementation independent of the core settings allowlist. */
export class AwikiSettingsController {
    connection;
    snapshot;
    listeners = new Set();
    tenantSnapshot;
    tenantListeners = new Set();
    abort = new AbortController();
    disposeHostDescription;
    writeTail = Promise.resolve();
    requestVersion = 0;
    disposed = false;
    constructor(connection) {
        this.connection = connection;
        this.snapshot = connection.isLoopback ? INITIAL_HOST_SNAPSHOT : REMOTE_SNAPSHOT;
        this.tenantSnapshot = {
            status: connection.isLoopback ? 'loading' : 'unavailable',
            value: INITIAL_TENANTS,
            updateStatus: connection.isLoopback ? 'loading' : 'unavailable',
        };
        this.disposeHostDescription = connection.isLoopback
            ? connection.hostDescription.subscribe(() => { void this.load(); })
            : () => { };
    }
    getSnapshot() {
        return this.snapshot;
    }
    subscribe(listener) {
        if (this.disposed)
            return () => { };
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
    getTenantSnapshot() {
        return this.tenantSnapshot;
    }
    subscribeTenants(listener) {
        if (this.disposed)
            return () => { };
        this.tenantListeners.add(listener);
        return () => { this.tenantListeners.delete(listener); };
    }
    tenantScope = {
        getSnapshot: () => this.getTenantSnapshot(),
        subscribe: listener => this.subscribeTenants(listener),
    };
    /** Load or reload the Host view; transport failures become a disabled UI state. */
    async load() {
        if (!this.connection.isLoopback || this.disposed)
            return;
        await Promise.all([this.loadSettings(), this.loadTenants(), this.loadUpdatePolicy()]);
    }
    async loadSettings() {
        const version = ++this.requestVersion;
        try {
            const result = await this.connection.rpc.call(AWIKI_SETTINGS_RPC_CHANNEL, AWIKI_SETTINGS_RPC_ENDPOINTS.describe, {}, this.abort.signal);
            const view = result.ok ? decodeAwikiSettingsRpcView(result.value) : undefined;
            if (view === undefined)
                throw new Error('AWiki settings view is unavailable');
            if (version !== this.requestVersion || this.disposed)
                return;
            this.publish({
                status: 'ready',
                value: view.value,
                base: view.base,
                user: view.user,
                revision: view.revision,
                writable: view.writable,
                mode: 'host',
            });
        }
        catch {
            if (version !== this.requestVersion || this.disposed)
                return;
            this.publish({ ...this.snapshot, status: 'unavailable', writable: false, mode: 'host' });
        }
    }
    async loadTenants() {
        if (!this.connection.isLoopback || this.disposed)
            return;
        try {
            const result = await this.connection.rpc.call(AWIKI_SETTINGS_RPC_CHANNEL, AWIKI_SETTINGS_RPC_ENDPOINTS.describeTenants, {}, this.abort.signal);
            const value = result.ok ? decodeAwikiTenantRpcView(result.value) : undefined;
            if (value === undefined)
                throw new Error('AWiki tenant catalog is unavailable');
            if (this.disposed)
                return;
            this.publishTenants({ ...this.tenantSnapshot, status: 'ready', value });
        }
        catch {
            if (!this.disposed)
                this.publishTenants({ ...this.tenantSnapshot, status: 'unavailable' });
        }
    }
    async loadUpdatePolicy(refresh = false) {
        if (!this.connection.isLoopback || this.disposed)
            return;
        this.publishTenants({ ...this.tenantSnapshot, updateStatus: 'loading' });
        try {
            const result = await this.connection.rpc.call(AWIKI_SETTINGS_RPC_CHANNEL, refresh
                ? AWIKI_SETTINGS_RPC_ENDPOINTS.refreshUpdatePolicy
                : AWIKI_SETTINGS_RPC_ENDPOINTS.describeUpdatePolicy, {}, this.abort.signal);
            const update = result.ok ? decodeAwikiUpdatePolicyRpcView(result.value) : undefined;
            if (update === undefined)
                throw new Error('AWiki update policy is unavailable');
            if (!this.disposed)
                this.publishTenants({ ...this.tenantSnapshot, updateStatus: 'ready', update });
        }
        catch {
            if (!this.disposed)
                this.publishTenants({
                    status: this.tenantSnapshot.status,
                    value: this.tenantSnapshot.value,
                    updateStatus: 'unavailable',
                });
        }
    }
    refreshUpdatePolicy() {
        return this.loadUpdatePolicy(true);
    }
    createTenant(displayName, domain) {
        return this.writeTenant(AWIKI_SETTINGS_RPC_ENDPOINTS.createTenant, { displayName, domain });
    }
    renameTenant(tenantId, displayName) {
        return this.writeTenant(AWIKI_SETTINGS_RPC_ENDPOINTS.renameTenant, { tenantId, displayName });
    }
    switchTenant(tenantId) {
        return this.writeTenant(AWIKI_SETTINGS_RPC_ENDPOINTS.switchTenant, { tenantId });
    }
    archiveTenant(tenantId) {
        return this.writeTenant(AWIKI_SETTINGS_RPC_ENDPOINTS.archiveTenant, { tenantId });
    }
    set(field, value) {
        if (field !== AWIKI_DOMAIN_FIELD || typeof value !== 'string') {
            return Promise.reject(new TypeError('AWiki settings only supports a string domain field'));
        }
        const domain = normalizeAwikiDomain(value);
        return this.enqueue(AWIKI_SETTINGS_RPC_ENDPOINTS.setDomain, { domain });
    }
    unset(field) {
        if (field !== AWIKI_DOMAIN_FIELD) {
            return Promise.reject(new TypeError('AWiki settings only supports the domain field'));
        }
        return this.enqueue(AWIKI_SETTINGS_RPC_ENDPOINTS.resetDomain, {});
    }
    /** Stop reconnect reads and cancel outstanding transport calls. */
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        this.requestVersion += 1;
        this.abort.abort();
        this.disposeHostDescription();
        this.listeners.clear();
        this.tenantListeners.clear();
    }
    enqueue(endpoint, payload) {
        const run = this.writeTail.catch(() => undefined).then(() => this.write(endpoint, payload));
        this.writeTail = run;
        return run;
    }
    async write(endpoint, payload) {
        const revision = this.snapshot.revision;
        if (this.disposed
            || !this.connection.isLoopback
            || this.snapshot.status !== 'ready'
            || !this.snapshot.writable
            || revision === undefined) {
            throw new Error('AWiki settings are not writable');
        }
        const version = ++this.requestVersion;
        try {
            const result = await this.connection.rpc.call(AWIKI_SETTINGS_RPC_CHANNEL, endpoint, { ...payload, expectedRevision: revision }, this.abort.signal);
            const view = result.ok ? decodeAwikiSettingsRpcView(result.value) : undefined;
            if (view === undefined)
                throw new Error('AWiki settings change was rejected');
            if (version !== this.requestVersion || this.disposed)
                return;
            this.publish({
                status: 'ready',
                value: view.value,
                base: view.base,
                user: view.user,
                revision: view.revision,
                writable: view.writable,
                mode: 'host',
            });
        }
        catch {
            if (!this.disposed)
                await this.load();
            throw new Error('AWiki settings change was rejected');
        }
    }
    publish(next) {
        this.snapshot = next;
        for (const listener of [...this.listeners])
            listener();
    }
    async writeTenant(endpoint, payload) {
        if (this.disposed || !this.connection.isLoopback || this.tenantSnapshot.status !== 'ready') {
            throw new Error('AWiki tenant catalog is unavailable');
        }
        this.publishTenants({ ...this.tenantSnapshot, value: { ...this.tenantSnapshot.value, switching: endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.switchTenant } });
        try {
            const result = await this.connection.rpc.call(AWIKI_SETTINGS_RPC_CHANNEL, endpoint, payload, this.abort.signal);
            const value = result.ok ? decodeAwikiTenantRpcView(result.value) : undefined;
            if (value === undefined) {
                const message = result.ok ? undefined : result.error.message;
                throw new Error(typeof message === 'string' ? message : 'AWiki tenant change was rejected');
            }
            if (!this.disposed)
                this.publishTenants({ ...this.tenantSnapshot, status: 'ready', value });
            if (endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.switchTenant)
                await this.loadUpdatePolicy();
        }
        catch (error) {
            if (!this.disposed)
                await this.loadTenants();
            throw error;
        }
    }
    publishTenants(next) {
        this.tenantSnapshot = next;
        for (const listener of [...this.tenantListeners])
            listener();
    }
}
//# sourceMappingURL=settings-controller.js.map