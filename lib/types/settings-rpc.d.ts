/** Loopback-only Host transport for AWiki's durable plugin settings. */
import { type SettingsProvider } from '@deepseek-ai/dsh-settings';
import type { ConnectionRpcHandler } from '@deepseek-ai/dsh-client-connection';
import type { AwikiTenantRegistryView } from './tenant-registry.ts';
export interface AwikiTenantRpcManagement {
    describe(): AwikiTenantRegistryView;
    create(displayName: string, domain: string): AwikiTenantRegistryView;
    rename(tenantId: string, displayName: string): AwikiTenantRegistryView;
    switch(tenantId: string): Promise<AwikiTenantRegistryView>;
    archive(tenantId: string): AwikiTenantRegistryView;
}
/** Build a handler whose provider lookup remains correct across Cordis reinjection. */
export declare function createAwikiSettingsRpcHandler(getProvider: () => SettingsProvider | undefined, tenantManagement?: AwikiTenantRpcManagement): ConnectionRpcHandler;
//# sourceMappingURL=settings-rpc.d.ts.map