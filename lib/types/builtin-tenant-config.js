/** Build-injected two-slot tenant catalog with a source-tree default for tests. */
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function definition(value) {
    if (!record(value) || !record(value.display_name)
        || typeof value.display_name['zh-CN'] !== 'string' || value.display_name['zh-CN'].trim() === ''
        || typeof value.display_name.en !== 'string' || value.display_name.en.trim() === ''
        || typeof value.backend_origin !== 'string' || typeof value.did_host !== 'string') {
        throw new Error('awiki: invalid built-in tenant definition');
    }
    const origin = new URL(value.backend_origin);
    const loopback = origin.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname);
    if ((origin.protocol !== 'https:' && !loopback) || origin.username !== '' || origin.password !== ''
        || origin.pathname !== '/' || origin.search !== '' || origin.hash !== ''
        || (!loopback && origin.port !== '')) {
        throw new Error('awiki: built-in tenant origin must be an HTTPS origin');
    }
    const didHost = value.did_host.trim().toLowerCase().replace(/\.$/u, '');
    if (origin.hostname !== didHost)
        throw new Error('awiki: built-in tenant DID host must match its origin');
    return {
        displayName: {
            'zh-CN': value.display_name['zh-CN'].trim(),
            en: value.display_name.en.trim(),
        },
        backendOrigin: origin.origin,
        didHost,
    };
}
export function decodeBuiltinTenantConfig(value) {
    if (!record(value) || value.schema_version !== 1
        || (value.default_slot !== 'primary' && value.default_slot !== 'secondary')
        || !record(value.tenants)
        || Object.keys(value.tenants).sort().join(',') !== 'primary,secondary') {
        throw new Error('awiki: invalid built-in tenant config');
    }
    const primary = definition(value.tenants.primary);
    const secondary = definition(value.tenants.secondary);
    if (primary.backendOrigin === secondary.backendOrigin || primary.didHost === secondary.didHost) {
        throw new Error('awiki: built-in tenant slots must use distinct endpoints');
    }
    return {
        schemaVersion: 1,
        defaultSlot: value.default_slot,
        tenants: { primary, secondary },
    };
}
function rawConfig() {
    if (typeof __DSH_AWIKI_BUILTIN_TENANTS_JSON__ === 'string') {
        return JSON.parse(__DSH_AWIKI_BUILTIN_TENANTS_JSON__);
    }
    throw new Error('awiki: built-in tenant config was not injected by the build');
}
export const AWIKI_BUILTIN_TENANT_CONFIG = decodeBuiltinTenantConfig(rawConfig());
export const AWIKI_DEFAULT_BUILTIN_TENANT = AWIKI_BUILTIN_TENANT_CONFIG.tenants[AWIKI_BUILTIN_TENANT_CONFIG.defaultSlot];
//# sourceMappingURL=builtin-tenant-config.js.map