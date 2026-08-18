/** Reactive browser mirror for AWiki's loopback-only settings channel. */
import { AWIKI_DOMAIN_FIELD, normalizeAwikiDomain } from "../domain.js";
import { AWIKI_SETTINGS_RPC_CHANNEL, AWIKI_SETTINGS_RPC_ENDPOINTS, decodeAwikiSettingsRpcView, } from "../settings-rpc-contract.js";
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
/** Plugin-owned SettingsScope implementation independent of the core settings allowlist. */
export class AwikiSettingsController {
    connection;
    snapshot;
    listeners = new Set();
    abort = new AbortController();
    disposeHostDescription;
    writeTail = Promise.resolve();
    requestVersion = 0;
    disposed = false;
    constructor(connection) {
        this.connection = connection;
        this.snapshot = connection.isLoopback ? INITIAL_HOST_SNAPSHOT : REMOTE_SNAPSHOT;
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
    /** Load or reload the Host view; transport failures become a disabled UI state. */
    async load() {
        if (!this.connection.isLoopback || this.disposed)
            return;
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
}
//# sourceMappingURL=settings-controller.js.map