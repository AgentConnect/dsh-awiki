/** Tenant-scoped DSH AWiki plugin update policy and verified cache. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
export const DSH_AWIKI_VERSION = '0.3.9';
export const DSH_AWIKI_MODEL_PROXY_VERSION = '0.1.4';
const PRODUCT = 'dsh-awiki';
const CHANNEL = 'stable';
const MAX_POLICY_BYTES = 1024 * 1024;
export async function checkAwikiUpdatePolicy(options) {
    const origin = new URL(options.tenant.backendBaseUrl).origin;
    assertPolicyOrigin(origin, options.allowInsecureLoopback === true);
    const cachePath = policyCachePath(options.stateRoot, options.tenant.tenantId, origin);
    const cached = readCache(cachePath, origin);
    const currentPluginVersion = options.currentPluginVersion ?? DSH_AWIKI_VERSION;
    const base = {
        tenantId: options.tenant.tenantId,
        policyOrigin: origin,
        tenantGeneration: options.generation,
        currentPluginVersion,
        ...options.currentModelProxyVersion === undefined
            ? {}
            : { currentModelProxyVersion: options.currentModelProxyVersion },
    };
    try {
        const endpoint = new URL('/user-service/v1/server-info', origin);
        endpoint.searchParams.set('client_platform', 'dsh');
        const response = await (options.fetcher ?? fetch)(endpoint, {
            method: 'GET',
            headers: { accept: 'application/json', 'cache-control': 'no-store' },
            cache: 'no-store',
            redirect: 'error',
            ...options.signal === undefined ? {} : { signal: options.signal },
        });
        if (response.status === 404 && options.tenant.kind === 'custom') {
            rmSync(cachePath, { force: true });
            return {
                ...base,
                offline: false,
                usedCache: false,
                policyUnavailable: true,
                restricted: false,
                modelProxyRestricted: false,
            };
        }
        if (response.redirected
            || (response.url !== '' && new URL(response.url).origin !== origin)) {
            throw new Error('update policy response crossed its tenant origin');
        }
        if (!response.ok)
            throw new Error(`policy status ${response.status}`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength > MAX_POLICY_BYTES)
            throw new Error('policy response exceeds 1 MiB');
        const policy = decodeServerInfoPolicy(JSON.parse(Buffer.from(bytes).toString('utf8')), origin);
        if (policy === undefined) {
            rmSync(cachePath, { force: true });
            return {
                ...base,
                offline: false,
                usedCache: false,
                policyUnavailable: true,
                restricted: false,
                modelProxyRestricted: false,
                checkedAt: new Date().toISOString(),
            };
        }
        if (cached !== undefined && policy.policy_revision < cached.policy.policy_revision) {
            throw new Error('policy revision moved backwards');
        }
        const checkedAt = new Date().toISOString();
        writeCache(cachePath, { checkedAt, policy });
        return statusFromPolicy(base, policy, checkedAt, false, false);
    }
    catch (error) {
        if (options.signal?.aborted === true)
            throw error;
        if (cached !== undefined) {
            return statusFromPolicy(base, cached.policy, cached.checkedAt, true, true);
        }
        return {
            ...base,
            offline: true,
            usedCache: false,
            policyUnavailable: true,
            restricted: false,
            modelProxyRestricted: false,
        };
    }
}
function statusFromPolicy(base, policy, checkedAt, offline, usedCache) {
    const plugin = policy.packages.plugin;
    const modelProxy = policy.packages.model_proxy;
    return {
        ...base,
        policyRevision: policy.policy_revision,
        recommendedPluginVersion: plugin.recommended_version,
        minimumPluginVersion: plugin.min_supported_version,
        ...modelProxy === undefined ? {} : {
            recommendedModelProxyVersion: modelProxy.recommended_version,
            minimumModelProxyVersion: modelProxy.min_supported_version,
        },
        releaseNotesUrl: policy.release_notes_url,
        pluginTarget: publicTarget(plugin),
        ...modelProxy === undefined ? {} : { modelProxyTarget: publicTarget(modelProxy) },
        offline,
        usedCache,
        policyUnavailable: false,
        restricted: compareVersions(base.currentPluginVersion, plugin.min_supported_version) < 0,
        modelProxyRestricted: modelProxy !== undefined && base.currentModelProxyVersion !== undefined
            && compareVersions(base.currentModelProxyVersion, modelProxy.min_supported_version) < 0,
        checkedAt,
    };
}
function publicTarget(value) {
    return {
        name: value.name,
        recommendedVersion: value.recommended_version,
        minimumVersion: value.min_supported_version,
        integrity: value.integrity,
        ...value.repository === undefined ? {} : { repository: value.repository },
        ...value.requires_plugin === undefined ? {} : { requiresPlugin: value.requires_plugin },
    };
}
function decodePolicy(value, origin) {
    if (!isRecord(value)
        || value.product !== PRODUCT
        || value.channel !== CHANNEL
        || value.policy_origin !== origin
        || !Number.isSafeInteger(value.policy_revision) || value.policy_revision < 1
        || typeof value.published_at !== 'string' || Number.isNaN(Date.parse(value.published_at))
        || typeof value.release_notes_url !== 'string'
        || !isRecord(value.packages))
        throw new Error('invalid update policy');
    const releaseNotes = new URL(value.release_notes_url);
    assertPolicyOrigin(releaseNotes.origin, origin.startsWith('http://'));
    const plugin = decodePackage(value.packages.plugin, '@awiki/dsh-plugin');
    const modelProxy = value.packages.model_proxy === undefined
        ? undefined
        : decodePackage(value.packages.model_proxy, '@awiki/dsh-model-proxy');
    if (compareVersions(plugin.min_supported_version, plugin.recommended_version) > 0
        || (modelProxy !== undefined
            && compareVersions(modelProxy.min_supported_version, modelProxy.recommended_version) > 0)) {
        throw new Error('minimum version exceeds recommended version');
    }
    return {
        product: PRODUCT,
        channel: CHANNEL,
        policy_origin: origin,
        policy_revision: value.policy_revision,
        published_at: value.published_at,
        release_notes_url: releaseNotes.toString(),
        packages: { plugin, ...modelProxy === undefined ? {} : { model_proxy: modelProxy } },
    };
}
function decodeServerInfoPolicy(value, origin) {
    if (!isRecord(value) || value.schema_version !== 1)
        throw new Error('invalid server-info');
    const releases = value.client_versions;
    if (releases === null || releases === undefined)
        return undefined;
    if (!isRecord(releases)
        || releases.schema_version !== 1
        || releases.channel !== CHANNEL
        || releases.policy_origin !== origin
        || !Number.isSafeInteger(releases.policy_revision) || releases.policy_revision < 1
        || typeof releases.published_at !== 'string' || Number.isNaN(Date.parse(releases.published_at))
        || !isRecord(releases.products)
        || !isRecord(releases.products.dsh))
        throw new Error('invalid client version policy');
    const product = releases.products.dsh;
    if (product.enabled === false)
        return undefined;
    if (product.enabled !== true
        || typeof product.release_notes_url !== 'string'
        || !isRecord(product.plugin))
        throw new Error('invalid DSH client version policy');
    const plugin = decodeServerPackage(product.plugin, '@awiki/dsh-plugin');
    const modelProxy = isRecord(product.model_proxy) && product.model_proxy.enabled === true
        ? decodeServerPackage(product.model_proxy, '@awiki/dsh-model-proxy')
        : undefined;
    return decodePolicy({
        product: PRODUCT,
        channel: CHANNEL,
        policy_origin: releases.policy_origin,
        policy_revision: releases.policy_revision,
        published_at: releases.published_at,
        release_notes_url: product.release_notes_url,
        packages: {
            plugin,
            ...modelProxy === undefined ? {} : { model_proxy: modelProxy },
        },
    }, origin);
}
function decodeServerPackage(value, expectedName) {
    return decodePackage({
        name: value.package_name,
        recommended_version: value.recommended_version,
        min_supported_version: value.minimum_supported_version,
        integrity: value.integrity,
        repository: value.repository,
        requires_plugin: value.requires_plugin,
    }, expectedName);
}
function decodePackage(value, expectedName) {
    if (!isRecord(value)
        || value.name !== expectedName
        || typeof value.recommended_version !== 'string'
        || typeof value.min_supported_version !== 'string'
        || typeof value.integrity !== 'string' || !/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(value.integrity)
        || (value.repository !== undefined && typeof value.repository !== 'string')
        || (value.requires_plugin !== undefined && typeof value.requires_plugin !== 'string')) {
        throw new Error('invalid update package target');
    }
    assertVersion(value.recommended_version);
    assertVersion(value.min_supported_version);
    return {
        name: value.name,
        recommended_version: value.recommended_version,
        min_supported_version: value.min_supported_version,
        integrity: value.integrity,
        ...value.repository === undefined ? {} : { repository: value.repository },
        ...value.requires_plugin === undefined ? {} : { requires_plugin: value.requires_plugin },
    };
}
function policyCachePath(stateRoot, tenantId, origin) {
    const key = createHash('sha256')
        .update(`${tenantId}\n${origin}\n${PRODUCT}\n${CHANNEL}`, 'utf8')
        .digest('hex');
    return join(stateRoot, 'update-policy', `${key}.json`);
}
function readCache(path, origin) {
    try {
        const value = JSON.parse(readFileSync(path, 'utf8'));
        if (!isRecord(value) || typeof value.checkedAt !== 'string')
            return undefined;
        return { checkedAt: value.checkedAt, policy: decodePolicy(value.policy, origin) };
    }
    catch {
        return undefined;
    }
}
function writeCache(path, value) {
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    const temporary = `${path}.tmp-${process.pid}`;
    writeFileSync(temporary, `${JSON.stringify(value, undefined, 2)}\n`, { mode: 0o600 });
    renameSync(temporary, path);
}
function assertPolicyOrigin(origin, allowLoopback) {
    const url = new URL(origin);
    if (url.protocol === 'https:')
        return;
    if (allowLoopback && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
        return;
    throw new Error('update policy origin must use HTTPS');
}
function assertVersion(value) {
    if (!/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u.test(value)) {
        throw new Error('invalid semantic version');
    }
}
export function compareVersions(left, right) {
    assertVersion(left);
    assertVersion(right);
    const parse = (value) => {
        const withoutBuild = value.split('+', 1)[0];
        const separator = withoutBuild.indexOf('-');
        const core = (separator < 0 ? withoutBuild : withoutBuild.slice(0, separator)).split('.').map(Number);
        return separator < 0 ? { core } : { core, prerelease: withoutBuild.slice(separator + 1).split('.') };
    };
    const a = parse(left);
    const b = parse(right);
    for (let index = 0; index < 3; index += 1) {
        const difference = a.core[index] - b.core[index];
        if (difference !== 0)
            return Math.sign(difference);
    }
    if (a.prerelease === undefined || b.prerelease === undefined) {
        return a.prerelease === b.prerelease ? 0 : a.prerelease === undefined ? 1 : -1;
    }
    for (let index = 0; index < Math.min(a.prerelease.length, b.prerelease.length); index += 1) {
        const leftPart = a.prerelease[index];
        const rightPart = b.prerelease[index];
        if (leftPart === rightPart)
            continue;
        const leftNumeric = /^\d+$/u.test(leftPart);
        const rightNumeric = /^\d+$/u.test(rightPart);
        if (leftNumeric !== rightNumeric)
            return leftNumeric ? -1 : 1;
        if (leftNumeric)
            return Math.sign(Number(leftPart) - Number(rightPart));
        return leftPart < rightPart ? -1 : 1;
    }
    if (a.prerelease.length !== b.prerelease.length) {
        return a.prerelease.length < b.prerelease.length ? -1 : 1;
    }
    return 0;
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=update-policy.js.map