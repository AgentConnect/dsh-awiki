/** Reactive browser mirror for AWiki's loopback-only settings channel. */
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client';
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client';
import type { AwikiSettings } from '../settings.ts';
import { type AwikiTenantRpcView, type AwikiUpdatePolicyRpcView } from '../settings-rpc-contract.ts';
export interface AwikiTenantScopeSnapshot {
    readonly status: 'loading' | 'ready' | 'unavailable';
    readonly value: AwikiTenantRpcView;
    readonly updateStatus: 'loading' | 'ready' | 'unavailable';
    readonly update?: AwikiUpdatePolicyRpcView;
}
export interface AwikiTenantScope {
    getSnapshot(): AwikiTenantScopeSnapshot;
    subscribe(listener: () => void): () => void;
}
/** Plugin-owned SettingsScope implementation independent of the core settings allowlist. */
export declare class AwikiSettingsController implements SettingsScope<AwikiSettings> {
    private readonly connection;
    private snapshot;
    private readonly listeners;
    private tenantSnapshot;
    private readonly tenantListeners;
    private readonly abort;
    private readonly disposeHostDescription;
    private writeTail;
    private requestVersion;
    private disposed;
    constructor(connection: ConnectionHandle);
    getSnapshot(): SettingsScopeSnapshot<AwikiSettings>;
    subscribe(listener: () => void): () => void;
    getTenantSnapshot(): AwikiTenantScopeSnapshot;
    subscribeTenants(listener: () => void): () => void;
    readonly tenantScope: AwikiTenantScope;
    /** Load or reload the Host view; transport failures become a disabled UI state. */
    load(): Promise<void>;
    private loadSettings;
    loadTenants(): Promise<void>;
    loadUpdatePolicy(refresh?: boolean): Promise<void>;
    refreshUpdatePolicy(): Promise<void>;
    createTenant(displayName: string, domain: string): Promise<void>;
    renameTenant(tenantId: string, displayName: string): Promise<void>;
    switchTenant(tenantId: string): Promise<void>;
    archiveTenant(tenantId: string): Promise<void>;
    set(field: string, value: unknown): Promise<void>;
    unset(field: string): Promise<void>;
    /** Stop reconnect reads and cancel outstanding transport calls. */
    dispose(): void;
    private enqueue;
    private write;
    private publish;
    private writeTenant;
    private publishTenants;
}
//# sourceMappingURL=settings-controller.d.ts.map