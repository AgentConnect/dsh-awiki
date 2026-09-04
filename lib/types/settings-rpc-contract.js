/** Client-safe contract for AWiki's plugin-owned settings transport. */
import { normalizeAwikiDomain } from "./domain.js";
/** Dedicated Connection channel; the Host registers it with loopback authority. */
export const AWIKI_SETTINGS_RPC_CHANNEL = '/awiki-settings';
/** Supported channel-relative operations. */
export const AWIKI_SETTINGS_RPC_ENDPOINTS = {
    describe: 'describe',
    setDomain: 'set-domain',
    resetDomain: 'reset-domain',
    describeTenants: 'describe-tenants',
    createTenant: 'create-tenant',
    renameTenant: 'rename-tenant',
    switchTenant: 'switch-tenant',
    archiveTenant: 'archive-tenant',
    describeUpdatePolicy: 'describe-update-policy',
    refreshUpdatePolicy: 'refresh-update-policy',
};
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function decodeLayer(value) {
    if (!isRecord(value))
        return undefined;
    if (!Object.hasOwn(value, 'domain'))
        return {};
    if (typeof value.domain !== 'string')
        return undefined;
    try {
        const domain = normalizeAwikiDomain(value.domain);
        if (domain !== value.domain)
            return undefined;
        return { domain };
    }
    catch {
        return undefined;
    }
}
/** Fail closed when the Host response is not exactly usable by the settings UI. */
export function decodeAwikiSettingsRpcView(value) {
    if (!isRecord(value)
        || !isRecord(value.value)
        || typeof value.value.domain !== 'string'
        || !Number.isSafeInteger(value.revision)
        || value.revision < 0
        || typeof value.writable !== 'boolean')
        return undefined;
    let domain;
    try {
        domain = normalizeAwikiDomain(value.value.domain);
    }
    catch {
        return undefined;
    }
    if (domain !== value.value.domain)
        return undefined;
    const base = value.base === undefined ? undefined : decodeLayer(value.base);
    const user = value.user === undefined ? undefined : decodeLayer(value.user);
    if ((value.base !== undefined && base === undefined)
        || (value.user !== undefined && user === undefined))
        return undefined;
    return {
        value: { domain },
        ...base === undefined ? {} : { base },
        ...user === undefined ? {} : { user },
        revision: value.revision,
        writable: value.writable,
    };
}
function decodeTenant(value) {
    const displayNames = value !== null && isRecord(value) && value.displayNames !== undefined
        && isRecord(value.displayNames)
        && typeof value.displayNames['zh-CN'] === 'string' && value.displayNames['zh-CN'].length > 0
        && typeof value.displayNames.en === 'string' && value.displayNames.en.length > 0
        ? { 'zh-CN': value.displayNames['zh-CN'], en: value.displayNames.en }
        : undefined;
    if (!isRecord(value)
        || typeof value.tenantId !== 'string' || value.tenantId.length === 0
        || typeof value.storageScopeId !== 'string' || value.storageScopeId.length === 0
        || (value.kind !== 'built_in' && value.kind !== 'custom')
        || typeof value.displayName !== 'string' || value.displayName.length === 0
        || typeof value.backendBaseUrl !== 'string'
        || typeof value.didHost !== 'string'
        || (value.lifecycle !== 'active' && value.lifecycle !== 'inactive' && value.lifecycle !== 'archived')
        || (value.storageLayout !== 'scope-v1' && value.storageLayout !== 'legacy-base' && value.storageLayout !== 'domain-v1')
        || (value.displayNames !== undefined && displayNames === undefined)) {
        return undefined;
    }
    return {
        tenantId: value.tenantId,
        storageScopeId: value.storageScopeId,
        kind: value.kind,
        displayName: value.displayName,
        ...displayNames === undefined ? {} : { displayNames },
        backendBaseUrl: value.backendBaseUrl,
        didHost: value.didHost,
        lifecycle: value.lifecycle,
        storageLayout: value.storageLayout,
    };
}
/** Decode the secret-free Host tenant catalog and its switch state. */
export function decodeAwikiTenantRpcView(value) {
    if (!isRecord(value)
        || !Number.isSafeInteger(value.schemaVersion) || value.schemaVersion < 1
        || !Number.isSafeInteger(value.officialCatalogVersion) || value.officialCatalogVersion < 1
        || !Number.isSafeInteger(value.generation) || value.generation < 0
        || typeof value.activeTenantId !== 'string'
        || !Array.isArray(value.tenants)
        || typeof value.switching !== 'boolean'
        || (value.diagnostic !== undefined && typeof value.diagnostic !== 'string'))
        return undefined;
    const tenants = value.tenants.map(decodeTenant);
    if (tenants.some(tenant => tenant === undefined))
        return undefined;
    const decoded = tenants;
    if (decoded.filter(tenant => tenant.lifecycle === 'active').length !== 1
        || !decoded.some(tenant => tenant.tenantId === value.activeTenantId && tenant.lifecycle === 'active'))
        return undefined;
    return {
        schemaVersion: value.schemaVersion,
        officialCatalogVersion: value.officialCatalogVersion,
        generation: value.generation,
        activeTenantId: value.activeTenantId,
        tenants: decoded,
        switching: value.switching,
        ...value.diagnostic === undefined ? {} : { diagnostic: value.diagnostic },
    };
}
/** Decode the browser-safe subset of the Host's tenant update status. */
export function decodeAwikiUpdatePolicyRpcView(value) {
    if (!isRecord(value)
        || typeof value.tenantId !== 'string' || value.tenantId.length === 0
        || typeof value.policyOrigin !== 'string' || !value.policyOrigin.startsWith('http')
        || !Number.isSafeInteger(value.tenantGeneration) || value.tenantGeneration < 0
        || typeof value.currentPluginVersion !== 'string'
        || typeof value.offline !== 'boolean'
        || typeof value.usedCache !== 'boolean'
        || typeof value.policyUnavailable !== 'boolean'
        || typeof value.restricted !== 'boolean'
        || typeof value.modelProxyRestricted !== 'boolean')
        return undefined;
    for (const key of [
        'currentModelProxyVersion',
        'recommendedPluginVersion',
        'minimumPluginVersion',
        'recommendedModelProxyVersion',
        'minimumModelProxyVersion',
        'releaseNotesUrl',
        'checkedAt',
    ]) {
        if (value[key] !== undefined && typeof value[key] !== 'string')
            return undefined;
    }
    if (value.policyRevision !== undefined
        && (!Number.isSafeInteger(value.policyRevision) || value.policyRevision < 1))
        return undefined;
    return value;
}
//# sourceMappingURL=settings-rpc-contract.js.map