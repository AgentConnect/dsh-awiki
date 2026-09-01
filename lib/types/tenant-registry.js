/** Host-owned durable AWiki tenant catalog and storage-scope migration. */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync, } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { basename, dirname, join } from 'node:path';
import { normalizeAwikiDomain } from "./domain.js";
export const AWIKI_TENANT_REGISTRY_SCHEMA_VERSION = 1;
export const AWIKI_OFFICIAL_CATALOG_VERSION = 1;
export const AWIKI_CHINA_TENANT_ID = 'official-china';
export const AWIKI_GLOBAL_TENANT_ID = 'official-global';
const OFFICIALS = [
    {
        tenantId: AWIKI_CHINA_TENANT_ID,
        storageScopeId: 'official-china-v1',
        displayName: 'AWiki 中国（上海）',
        domain: 'awiki.me',
    },
    {
        tenantId: AWIKI_GLOBAL_TENANT_ID,
        storageScopeId: 'official-global-v1',
        displayName: 'AWiki 全球（硅谷）',
        domain: 'awiki.ai',
    },
];
function registryFilePath(baseStateRoot) {
    return join(dirname(baseStateRoot), `${basename(baseStateRoot)}.tenant-registry.json`);
}
function endpointsForDomain(domain) {
    const origin = `https://${domain}`;
    return {
        userServiceUrl: origin,
        messageServiceUrl: origin,
        mailServiceUrl: origin,
        messageServicePublicUrl: origin,
        messageServiceDid: `did:wba:${domain}`,
    };
}
function officialProfile(entry) {
    return {
        tenantId: entry.tenantId,
        storageScopeId: entry.storageScopeId,
        kind: 'built_in',
        displayName: entry.displayName,
        backendBaseUrl: `https://${entry.domain}`,
        didHost: entry.domain,
        lifecycle: 'inactive',
        storageLayout: 'scope-v1',
        endpoints: endpointsForDomain(entry.domain),
    };
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function safeString(value) {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
}
function decodeEndpoints(value) {
    if (!isRecord(value))
        return undefined;
    const userServiceUrl = safeString(value.userServiceUrl);
    const messageServiceUrl = safeString(value.messageServiceUrl);
    const mailServiceUrl = safeString(value.mailServiceUrl);
    const messageServicePublicUrl = safeString(value.messageServicePublicUrl);
    const messageServiceDid = safeString(value.messageServiceDid);
    if (userServiceUrl === undefined || messageServiceUrl === undefined || mailServiceUrl === undefined
        || messageServicePublicUrl === undefined || messageServiceDid === undefined)
        return undefined;
    return { userServiceUrl, messageServiceUrl, mailServiceUrl, messageServicePublicUrl, messageServiceDid };
}
function decodeTenant(value) {
    if (!isRecord(value))
        return undefined;
    const tenantId = safeString(value.tenantId);
    const storageScopeId = safeString(value.storageScopeId);
    const displayName = safeString(value.displayName);
    const backendBaseUrl = safeString(value.backendBaseUrl);
    const didHost = safeString(value.didHost);
    const endpoints = decodeEndpoints(value.endpoints);
    if (tenantId === undefined || storageScopeId === undefined || displayName === undefined
        || backendBaseUrl === undefined || didHost === undefined || endpoints === undefined
        || (value.kind !== 'built_in' && value.kind !== 'custom')
        || (value.lifecycle !== 'active' && value.lifecycle !== 'inactive' && value.lifecycle !== 'archived')
        || (value.storageLayout !== 'scope-v1' && value.storageLayout !== 'legacy-base' && value.storageLayout !== 'domain-v1')) {
        return undefined;
    }
    return {
        tenantId,
        storageScopeId,
        kind: value.kind,
        displayName,
        backendBaseUrl,
        didHost,
        lifecycle: value.lifecycle,
        storageLayout: value.storageLayout,
        endpoints,
    };
}
function decodeDocument(value) {
    if (!isRecord(value)
        || value.schemaVersion !== AWIKI_TENANT_REGISTRY_SCHEMA_VERSION
        || value.officialCatalogVersion !== AWIKI_OFFICIAL_CATALOG_VERSION
        || !Number.isSafeInteger(value.generation) || value.generation < 0
        || typeof value.activeTenantId !== 'string' || !Array.isArray(value.tenants))
        return undefined;
    const tenants = value.tenants.map(decodeTenant);
    if (tenants.some(tenant => tenant === undefined))
        return undefined;
    const complete = tenants;
    if (new Set(complete.map(tenant => tenant.tenantId)).size !== complete.length
        || new Set(complete.map(tenant => tenant.storageScopeId)).size !== complete.length
        || !complete.some(tenant => tenant.tenantId === value.activeTenantId && tenant.lifecycle === 'active')
        || complete.filter(tenant => tenant.lifecycle === 'active').length !== 1)
        return undefined;
    return {
        schemaVersion: AWIKI_TENANT_REGISTRY_SCHEMA_VERSION,
        officialCatalogVersion: AWIKI_OFFICIAL_CATALOG_VERSION,
        generation: value.generation,
        activeTenantId: value.activeTenantId,
        tenants: complete,
    };
}
function directoryHasData(path) {
    try {
        return statSync(path).isDirectory() && readdirSync(path).length > 0;
    }
    catch {
        return false;
    }
}
function sameOfficialEndpoint(tenant, domain) {
    const origin = `https://${domain}`;
    return tenant.didHost === domain
        || tenant.backendBaseUrl.replace(/\/$/u, '') === origin
        || tenant.endpoints.userServiceUrl.replace(/\/$/u, '') === origin;
}
function activate(document, tenantId, generation) {
    return {
        ...document,
        generation,
        activeTenantId: tenantId,
        tenants: document.tenants.map(tenant => ({
            ...tenant,
            lifecycle: tenant.tenantId === tenantId ? 'active' : tenant.lifecycle === 'active' ? 'inactive' : tenant.lifecycle,
        })),
    };
}
function reconcileOfficials(document) {
    const tenants = [...document.tenants];
    let activeTenantId = document.activeTenantId;
    for (const entry of OFFICIALS) {
        const exactIndex = tenants.findIndex(tenant => tenant.tenantId === entry.tenantId);
        if (exactIndex >= 0) {
            const current = tenants[exactIndex];
            tenants[exactIndex] = {
                ...officialProfile(entry),
                storageScopeId: current.storageScopeId,
                storageLayout: current.storageLayout,
                lifecycle: current.lifecycle,
                endpoints: current.endpoints,
            };
            continue;
        }
        const endpointIndex = tenants.findIndex(tenant => sameOfficialEndpoint(tenant, entry.domain));
        if (endpointIndex >= 0) {
            const current = tenants[endpointIndex];
            tenants[endpointIndex] = {
                ...officialProfile(entry),
                storageScopeId: current.storageScopeId,
                storageLayout: current.storageLayout,
                lifecycle: current.lifecycle,
                endpoints: current.endpoints,
            };
            if (activeTenantId === current.tenantId)
                activeTenantId = entry.tenantId;
        }
        else {
            tenants.push(officialProfile(entry));
        }
    }
    return activate({ ...document, activeTenantId, tenants }, activeTenantId, document.generation);
}
function cloneDocument(document) {
    return structuredClone(document);
}
/** Durable registry. All mutations are synchronous, backup-aware, and atomic. */
export class AwikiTenantRegistry {
    baseStateRoot;
    filePath;
    backupPath;
    diagnosticPath;
    document;
    persistent;
    constructor(baseStateRoot, document, persistent) {
        this.baseStateRoot = baseStateRoot;
        this.filePath = registryFilePath(baseStateRoot);
        this.backupPath = `${this.filePath}.pre-v1.bak`;
        this.diagnosticPath = `${this.filePath}.migration-error.txt`;
        this.document = document;
        this.persistent = persistent;
    }
    static open(baseStateRoot, seed) {
        const filePath = registryFilePath(baseStateRoot);
        if (existsSync(filePath)) {
            try {
                const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
                const decoded = decodeDocument(parsed);
                if (decoded === undefined)
                    throw new Error('registry schema or invariants are invalid');
                const registry = new AwikiTenantRegistry(baseStateRoot, reconcileOfficials(decoded), true);
                if (JSON.stringify(decoded) !== JSON.stringify(registry.document))
                    registry.persist(true);
                return registry;
            }
            catch (error) {
                const diagnostic = `AWiki tenant registry was not migrated: ${error instanceof Error ? error.message : 'unknown error'}\n`;
                mkdirSync(dirname(filePath), { recursive: true });
                writeFileSync(`${filePath}.migration-error.txt`, diagnostic, { encoding: 'utf8', mode: 0o600 });
                return new AwikiTenantRegistry(baseStateRoot, legacyDocument(baseStateRoot, seed), false);
            }
        }
        const useLegacy = seed.configured || directoryHasData(baseStateRoot);
        const document = useLegacy ? legacyDocument(baseStateRoot, seed) : freshDocument();
        const registry = new AwikiTenantRegistry(baseStateRoot, document, true);
        registry.persist(false);
        return registry;
    }
    snapshot(switching = false) {
        return {
            ...cloneDocument(this.document),
            switching,
            ...this.persistent ? {} : { diagnostic: this.diagnosticPath },
        };
    }
    active() {
        const tenant = this.document.tenants.find(candidate => candidate.tenantId === this.document.activeTenantId);
        if (tenant === undefined)
            throw new Error('awiki: active tenant is unavailable');
        return structuredClone(tenant);
    }
    find(tenantId) {
        const tenant = this.document.tenants.find(candidate => candidate.tenantId === tenantId);
        return tenant === undefined ? undefined : structuredClone(tenant);
    }
    stateRoot(tenant) {
        if (tenant.storageLayout === 'legacy-base')
            return this.baseStateRoot;
        if (tenant.storageLayout === 'domain-v1') {
            return join(dirname(this.baseStateRoot), 'tenants', tenant.didHost, basename(this.baseStateRoot));
        }
        return join(dirname(this.baseStateRoot), 'tenant-scopes', tenant.storageScopeId, basename(this.baseStateRoot));
    }
    createCustom(displayName, rawDomain) {
        const domain = normalizeAwikiDomain(rawDomain);
        const name = displayName.trim();
        if (name.length === 0 || Array.from(name).length > 80)
            throw new TypeError('awiki: tenant name is required and must not exceed 80 characters');
        if (this.document.tenants.some(tenant => tenant.didHost === domain || tenant.backendBaseUrl === `https://${domain}`)) {
            throw new Error('awiki: a tenant with this endpoint already exists');
        }
        const tenant = {
            tenantId: randomUUID(),
            storageScopeId: randomUUID(),
            kind: 'custom',
            displayName: name,
            backendBaseUrl: `https://${domain}`,
            didHost: domain,
            lifecycle: 'inactive',
            storageLayout: 'scope-v1',
            endpoints: endpointsForDomain(domain),
        };
        this.document = { ...this.document, tenants: [...this.document.tenants, tenant] };
        this.persist(true);
        return structuredClone(tenant);
    }
    renameCustom(tenantId, displayName) {
        const name = displayName.trim();
        if (name.length === 0 || Array.from(name).length > 80)
            throw new TypeError('awiki: tenant name is required and must not exceed 80 characters');
        const current = this.find(tenantId);
        if (current === undefined)
            throw new Error('awiki: tenant does not exist');
        if (current.kind === 'built_in')
            throw new Error('awiki: official tenants cannot be modified');
        const updated = { ...current, displayName: name };
        this.document = {
            ...this.document,
            tenants: this.document.tenants.map(tenant => tenant.tenantId === tenantId ? updated : tenant),
        };
        this.persist(true);
        return structuredClone(updated);
    }
    archiveCustom(tenantId) {
        const current = this.find(tenantId);
        if (current === undefined)
            throw new Error('awiki: tenant does not exist');
        if (current.kind === 'built_in')
            throw new Error('awiki: official tenants cannot be archived');
        if (current.lifecycle === 'active')
            throw new Error('awiki: switch away before archiving this tenant');
        this.document = {
            ...this.document,
            tenants: this.document.tenants.map(tenant => tenant.tenantId === tenantId
                ? { ...tenant, lifecycle: 'archived' }
                : tenant),
        };
        this.persist(true);
    }
    commitActive(tenantId) {
        const target = this.document.tenants.find(tenant => tenant.tenantId === tenantId);
        if (target === undefined || target.lifecycle === 'archived')
            throw new Error('awiki: target tenant is unavailable');
        const previous = this.document;
        this.document = activate(previous, tenantId, previous.generation + 1);
        try {
            this.persist(true);
        }
        catch (error) {
            this.document = previous;
            throw error;
        }
        return cloneDocument(this.document);
    }
    persist(backup) {
        if (!this.persistent)
            throw new Error('awiki: tenant registry is read-only until its migration diagnostic is resolved');
        mkdirSync(dirname(this.filePath), { recursive: true });
        if (backup && existsSync(this.filePath) && !existsSync(this.backupPath))
            copyFileSync(this.filePath, this.backupPath);
        const temporary = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`;
        writeFileSync(temporary, `${JSON.stringify(this.document, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
        renameSync(temporary, this.filePath);
    }
}
function freshDocument() {
    const tenants = OFFICIALS.map(officialProfile);
    return activate({
        schemaVersion: AWIKI_TENANT_REGISTRY_SCHEMA_VERSION,
        officialCatalogVersion: AWIKI_OFFICIAL_CATALOG_VERSION,
        generation: 0,
        activeTenantId: AWIKI_CHINA_TENANT_ID,
        tenants,
    }, AWIKI_CHINA_TENANT_ID, 0);
}
function legacyDocument(baseStateRoot, seed) {
    const domain = normalizeAwikiDomain(seed.domain);
    const entry = OFFICIALS.find(candidate => candidate.domain === domain);
    const tenant = entry === undefined
        ? {
            tenantId: randomUUID(),
            storageScopeId: randomUUID(),
            kind: 'custom',
            displayName: domain,
            backendBaseUrl: seed.userServiceUrl,
            didHost: domain,
            lifecycle: 'active',
            storageLayout: 'legacy-base',
            endpoints: {
                userServiceUrl: seed.userServiceUrl,
                messageServiceUrl: seed.messageServiceUrl,
                mailServiceUrl: seed.mailServiceUrl,
                messageServicePublicUrl: seed.messageServicePublicUrl,
                messageServiceDid: seed.messageServiceDid,
            },
        }
        : {
            ...officialProfile(entry),
            storageScopeId: randomUUID(),
            lifecycle: 'active',
            storageLayout: 'legacy-base',
            endpoints: {
                userServiceUrl: seed.userServiceUrl,
                messageServiceUrl: seed.messageServiceUrl,
                mailServiceUrl: seed.mailServiceUrl,
                messageServicePublicUrl: seed.messageServicePublicUrl,
                messageServiceDid: seed.messageServiceDid,
            },
        };
    return reconcileOfficials({
        schemaVersion: AWIKI_TENANT_REGISTRY_SCHEMA_VERSION,
        officialCatalogVersion: AWIKI_OFFICIAL_CATALOG_VERSION,
        generation: 0,
        activeTenantId: tenant.tenantId,
        tenants: [tenant],
    });
}
//# sourceMappingURL=tenant-registry.js.map