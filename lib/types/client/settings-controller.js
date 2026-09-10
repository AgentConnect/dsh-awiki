import { decodeDesktopDistribution } from "../desktop-distribution.js";
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
    disposeGeneration;
    writeTail = Promise.resolve();
    requestVersion = 0;
    disposed = false;
    updateRequestVersion = 0;
    desktopRequestVersion = 0;
    tenantRequestVersion = 0;
    updatePolling;
    constructor(connection) {
        this.connection = connection;
        this.snapshot = connection.isLoopback ? INITIAL_HOST_SNAPSHOT : REMOTE_SNAPSHOT;
        this.tenantSnapshot = {
            status: connection.isLoopback ? 'loading' : 'unavailable',
            value: INITIAL_TENANTS,
            updateStatus: connection.isLoopback ? 'loading' : 'unavailable',
        };
        this.disposeGeneration = connection.isLoopback
            ? connection.generation.subscribe(() => { void this.load(); })
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
        await Promise.all([this.loadSettings(), this.loadDesktopUpdate(), (async () => {
                await this.loadTenants();
                await this.loadUpdatePolicy();
            })()]);
        // Version discovery must not delay mounting the launcher or settings UI.
        void this.loadUpdatePolicy(true);
        if (!this.disposed && this.updatePolling === undefined) {
            this.updatePolling = setInterval(() => {
                if (this.tenantSnapshot.updateStatus !== 'loading')
                    void this.loadUpdatePolicy();
                if (this.tenantSnapshot.desktopStatus !== 'loading')
                    void this.loadDesktopUpdate();
            }, 30_000);
        }
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
        const request = ++this.tenantRequestVersion;
        try {
            const result = await this.connection.rpc.call(AWIKI_SETTINGS_RPC_CHANNEL, AWIKI_SETTINGS_RPC_ENDPOINTS.describeTenants, {}, this.abort.signal);
            if (this.disposed || request !== this.tenantRequestVersion)
                return;
            const value = result.ok ? decodeAwikiTenantRpcView(result.value) : undefined;
            if (value === undefined)
                throw new Error('AWiki tenant catalog is unavailable');
            const changed = value.activeTenantId !== this.tenantSnapshot.value.activeTenantId
                || value.generation !== this.tenantSnapshot.value.generation;
            if (changed)
                this.updateRequestVersion++;
            this.publishTenants({ ...this.tenantSnapshot, status: 'ready', value,
                ...changed ? { update: undefined, updateStatus: 'loading' } : {} });
        }
        catch {
            if (!this.disposed && request === this.tenantRequestVersion)
                this.publishTenants({ ...this.tenantSnapshot, status: 'unavailable' });
        }
    }
    async loadUpdatePolicy(refresh = false) {
        if (!this.connection.isLoopback || this.disposed || this.tenantSnapshot.value.switching)
            return;
        const tenantId = this.tenantSnapshot.value.activeTenantId;
        if (tenantId === '')
            return;
        const request = ++this.updateRequestVersion;
        if (refresh)
            this.publishTenants({ ...this.tenantSnapshot, updateStatus: 'loading' });
        try {
            const result = await this.connection.rpc.call(AWIKI_SETTINGS_RPC_CHANNEL, refresh ? AWIKI_SETTINGS_RPC_ENDPOINTS.refreshUpdatePolicy : AWIKI_SETTINGS_RPC_ENDPOINTS.describeUpdatePolicy, {}, this.abort.signal);
            if (this.disposed || request !== this.updateRequestVersion || this.tenantSnapshot.value.activeTenantId !== tenantId)
                return;
            const update = result.ok ? decodeAwikiUpdatePolicyRpcView(result.value) : undefined;
            const tenant = this.tenantSnapshot.value.tenants.find(value => value.tenantId === tenantId);
            if (update === undefined || update.tenantId !== tenantId
                || (tenant !== undefined && update.policyOrigin !== new URL(tenant.backendBaseUrl).origin))
                throw new Error('AWiki update scope mismatch');
            this.publishTenants({ ...this.tenantSnapshot, updateStatus: 'ready', update });
        }
        catch {
            if (!this.disposed && request === this.updateRequestVersion) {
                this.publishTenants({ ...this.tenantSnapshot, updateStatus: 'unavailable' });
            }
        }
    }
    async loadDesktopUpdate(refresh = false) {
        if (!this.connection.isLoopback || this.disposed)
            return;
        const request = ++this.desktopRequestVersion;
        if (refresh)
            this.publishTenants({ ...this.tenantSnapshot, desktopStatus: 'loading' });
        try {
            const result = await this.connection.rpc.call(AWIKI_SETTINGS_RPC_CHANNEL, refresh ? AWIKI_SETTINGS_RPC_ENDPOINTS.refreshDesktopUpdate : AWIKI_SETTINGS_RPC_ENDPOINTS.describeDesktopUpdate, {}, this.abort.signal);
            if (this.disposed || request !== this.desktopRequestVersion)
                return;
            if (!result.ok)
                throw new Error('Desktop update service unavailable');
            const desktop = result.value === null ? undefined : decodeDesktopDistribution(result.value);
            if (result.value !== null && desktop === undefined)
                throw new Error('Invalid Desktop update response');
            this.publishTenants({ ...this.tenantSnapshot, desktopStatus: 'ready', desktop });
        }
        catch {
            if (!this.disposed && request === this.desktopRequestVersion)
                this.publishTenants({ ...this.tenantSnapshot, desktopStatus: 'unavailable' });
        }
    }
    async refreshUpdatePolicy() {
        await Promise.all([this.loadUpdatePolicy(true), this.loadDesktopUpdate(true)]);
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
    /** Apply domain edits atomically through the existing revision-fenced Host operation. */
    mutate(ops, expectedRevision) {
        if (ops.length === 0)
            return Promise.resolve();
        for (const operation of ops) {
            if (operation.path.length !== 1 || operation.path[0] !== AWIKI_DOMAIN_FIELD
                || (operation.op !== 'set' && operation.op !== 'unset')
                || (operation.op === 'set' && typeof operation.value !== 'string')) {
                return Promise.reject(new TypeError('AWiki settings only supports domain mutations'));
            }
        }
        const last = ops[ops.length - 1];
        const endpoint = last.op === 'set' ? AWIKI_SETTINGS_RPC_ENDPOINTS.setDomain : AWIKI_SETTINGS_RPC_ENDPOINTS.resetDomain;
        const payload = last.op === 'set' ? { domain: normalizeAwikiDomain(last.value) } : {};
        return this.enqueue(endpoint, payload, expectedRevision);
    }
    /** Stop reconnect reads and cancel outstanding transport calls. */
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        if (this.updatePolling !== undefined)
            clearInterval(this.updatePolling);
        this.requestVersion += 1;
        this.abort.abort();
        this.disposeGeneration();
        this.listeners.clear();
        this.tenantListeners.clear();
    }
    enqueue(endpoint, payload, expectedRevision) {
        const run = this.writeTail.catch(() => undefined).then(() => this.write(endpoint, payload, expectedRevision));
        this.writeTail = run;
        return run;
    }
    async write(endpoint, payload, expectedRevision) {
        const revision = expectedRevision ?? this.snapshot.revision;
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
        if (this.tenantSnapshot.value.switching)
            throw new Error('AWiki tenant switch is already in progress');
        const switching = endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.switchTenant;
        if (switching) {
            this.updateRequestVersion++;
            this.tenantRequestVersion++;
        }
        this.publishTenants({ ...this.tenantSnapshot, ...switching ? { update: undefined, updateStatus: 'loading' } : {}, value: { ...this.tenantSnapshot.value, switching: endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.switchTenant } });
        try {
            const result = await this.connection.rpc.call(AWIKI_SETTINGS_RPC_CHANNEL, endpoint, payload, this.abort.signal);
            const value = result.ok ? decodeAwikiTenantRpcView(result.value) : undefined;
            if (value === undefined) {
                const message = result.ok ? undefined : result.error.message;
                throw new Error(typeof message === 'string' ? message : 'AWiki tenant change was rejected');
            }
            if (!this.disposed)
                this.publishTenants({ ...this.tenantSnapshot, status: 'ready', value });
            if (switching) {
                // Apply the target's cached gate immediately, then await a bounded refresh.
                await this.loadUpdatePolicy();
                await this.loadUpdatePolicy(true);
            }
        }
        catch (error) {
            if (!this.disposed) {
                await this.loadTenants();
                if (switching) {
                    await this.loadUpdatePolicy();
                    void this.loadUpdatePolicy(true);
                }
            }
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