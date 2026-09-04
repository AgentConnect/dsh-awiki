/** Build-injected two-slot tenant catalog with a source-tree default for tests. */
export type AwikiBuiltinTenantSlot = 'primary' | 'secondary';
export interface AwikiBuiltinTenantDefinition {
    readonly displayName: Readonly<{
        'zh-CN': string;
        en: string;
    }>;
    readonly backendOrigin: string;
    readonly didHost: string;
}
export interface AwikiBuiltinTenantConfig {
    readonly schemaVersion: 1;
    readonly defaultSlot: AwikiBuiltinTenantSlot;
    readonly tenants: Readonly<Record<AwikiBuiltinTenantSlot, AwikiBuiltinTenantDefinition>>;
}
export declare function decodeBuiltinTenantConfig(value: unknown): AwikiBuiltinTenantConfig;
export declare const AWIKI_BUILTIN_TENANT_CONFIG: AwikiBuiltinTenantConfig;
export declare const AWIKI_DEFAULT_BUILTIN_TENANT: AwikiBuiltinTenantDefinition;
//# sourceMappingURL=builtin-tenant-config.d.ts.map