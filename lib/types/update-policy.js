import { assertVersion, compareVersions } from "./version.js";
export { compareVersions } from "./version.js";
/** Tenant-scoped DSH AWiki plugin update policy and verified cache. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { satisfies } from 'semver';
import { DSH_AWIKI_MODEL_PROXY_PACKAGE_VERSION, DSH_AWIKI_PACKAGE_VERSION, } from "./package-version.generated.js";
export const DSH_AWIKI_VERSION = DSH_AWIKI_PACKAGE_VERSION;
export const DSH_AWIKI_MODEL_PROXY_VERSION = DSH_AWIKI_MODEL_PROXY_PACKAGE_VERSION;
const PRODUCT = 'dsh-awiki';
const CHANNEL = 'stable';
const MAX_POLICY_BYTES = 1024 * 1024;
/** Load only this tenant's verified cache before its business runtime starts. */
export function readAwikiUpdatePolicyStatus(options) {
    const origin = new URL(options.tenant.backendBaseUrl).origin;
    const base = {
        tenantId: options.tenant.tenantId, policyOrigin: origin, tenantGeneration: options.generation,
        currentPluginVersion: options.currentPluginVersion ?? DSH_AWIKI_VERSION,
        ...options.currentModelProxyVersion === undefined ? {} : { currentModelProxyVersion: options.currentModelProxyVersion },
    };
    const cached = readCache(policyCachePath(options.stateRoot, options.tenant.tenantId, origin), origin);
    return cached === undefined
        ? { ...base, checkState: 'unchecked', offline: false, usedCache: false, policyUnavailable: true, restricted: false, modelProxyRestricted: false }
        : statusFromPolicy(base, cached.policy, cached.checkedAt, false, true);
}
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
    const timeout = AbortSignal.timeout(options.timeoutMs ?? 15_000);
    const signal = options.signal === undefined ? timeout : AbortSignal.any([options.signal, timeout]);
    const bounded = async (operation) => {
        signal.throwIfAborted();
        let abort;
        const cancelled = new Promise((_, reject) => {
            abort = () => { reject(signal.reason); };
            signal.addEventListener('abort', abort, { once: true });
        });
        try {
            return await Promise.race([operation, cancelled]);
        }
        finally {
            signal.removeEventListener('abort', abort);
        }
    };
    try {
        signal.throwIfAborted();
        const endpoint = new URL('/user-service/v1/server-info', origin);
        endpoint.searchParams.set('client_platform', 'dsh');
        const response = await bounded((options.fetcher ?? fetch)(endpoint, {
            method: 'GET',
            headers: { accept: 'application/json', 'cache-control': 'no-store' },
            cache: 'no-store',
            redirect: 'error',
            signal,
        }));
        signal.throwIfAborted();
        if (response.status === 404 && options.tenant.kind === 'custom') {
            rmSync(cachePath, { force: true });
            return {
                ...base,
                offline: false,
                usedCache: false,
                policyUnavailable: true,
                checkState: 'unavailable',
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
        const bytes = await bounded(readPolicyBody(response));
        signal.throwIfAborted();
        if (bytes.byteLength > MAX_POLICY_BYTES)
            throw new Error('policy response exceeds 1 MiB');
        const policy = decodeServerInfoPolicy(JSON.parse(Buffer.from(bytes).toString('utf8')), origin, cached?.policy.policy_revision);
        if (policy === undefined) {
            rmSync(cachePath, { force: true });
            return {
                ...base,
                offline: false,
                usedCache: false,
                policyUnavailable: true,
                checkState: 'unavailable',
                restricted: false,
                modelProxyRestricted: false,
                checkedAt: new Date().toISOString(),
            };
        }
        if (cached !== undefined && policy.policy_revision < cached.policy.policy_revision) {
            throw new Error('policy revision moved backwards');
        }
        const checkedAt = new Date().toISOString();
        try {
            writeCache(cachePath, { checkedAt, policy });
        }
        catch { /* A cache write failure must not discard verified live requirements. */ }
        return statusFromPolicy(base, policy, checkedAt, false, false);
    }
    catch (error) {
        if (options.signal?.aborted === true)
            throw error;
        if (cached !== undefined) {
            return { ...statusFromPolicy(base, cached.policy, cached.checkedAt, true, true), checkState: 'failed' };
        }
        return {
            ...base,
            offline: true,
            usedCache: false,
            policyUnavailable: true,
            checkState: 'failed',
            restricted: false,
            modelProxyRestricted: false,
        };
    }
}
async function readPolicyBody(response) {
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_POLICY_BYTES)
        throw new Error('policy response exceeds 1 MiB');
    if (response.body === null)
        throw new Error('empty policy response');
    const reader = response.body.getReader();
    const chunks = [];
    let length = 0;
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done)
                break;
            length += value.byteLength;
            if (length > MAX_POLICY_BYTES) {
                await reader.cancel();
                throw new Error('policy response exceeds 1 MiB');
            }
            chunks.push(value);
        }
    }
    finally {
        reader.releaseLock();
    }
    return Buffer.concat(chunks, length);
}
function statusFromPolicy(base, policy, checkedAt, offline, usedCache) {
    const plugin = policy.packages.plugin;
    const modelProxy = policy.packages.model_proxy;
    const updateAvailable = compareVersions(base.currentPluginVersion, plugin.recommended_version) < 0
        || (modelProxy !== undefined && base.currentModelProxyVersion !== undefined
            && compareVersions(base.currentModelProxyVersion, modelProxy.recommended_version) < 0);
    const command = upgradeCommand(base, plugin, modelProxy);
    return {
        ...base,
        checkState: 'ready',
        updateAvailable,
        ...command === undefined ? {} : { upgradeCommand: command },
        policyRevision: policy.policy_revision,
        recommendedPluginVersion: plugin.recommended_version,
        minimumPluginVersion: plugin.min_supported_version,
        ...modelProxy === undefined ? {} : {
            recommendedModelProxyVersion: modelProxy.recommended_version,
            minimumModelProxyVersion: modelProxy.min_supported_version,
        },
        releaseNotesUrl: policy.release_notes_url,
        ...plugin.installable === false ? {} : { pluginTarget: publicTarget(plugin) },
        ...modelProxy === undefined || modelProxy.installable === false ? {} : { modelProxyTarget: publicTarget(modelProxy) },
        offline,
        usedCache,
        policyUnavailable: false,
        restricted: compareVersions(base.currentPluginVersion, plugin.min_supported_version) < 0,
        modelProxyRestricted: modelProxy !== undefined && base.currentModelProxyVersion !== undefined
            && compareVersions(base.currentModelProxyVersion, modelProxy.min_supported_version) < 0,
        checkedAt,
    };
}
/** Exact published targets only; never downgrade a newer installed component. */
function upgradeCommand(current, plugin, proxy) {
    const pluginUpgrade = compareVersions(current.currentPluginVersion, plugin.recommended_version) < 0;
    const proxyUpgrade = proxy !== undefined && current.currentModelProxyVersion !== undefined
        && compareVersions(current.currentModelProxyVersion, proxy.recommended_version) < 0;
    if ((!pluginUpgrade && !proxyUpgrade) || plugin.installable === false
        || (current.currentModelProxyVersion !== undefined && proxy?.installable === false))
        return undefined;
    // A newer installed proxy's dependency range is unknown to this policy; offer
    // the install guide instead of inventing a potentially incompatible pair.
    if (current.currentModelProxyVersion !== undefined && (proxy === undefined
        || compareVersions(current.currentModelProxyVersion, proxy.recommended_version) > 0))
        return undefined;
    const pluginVersion = pluginUpgrade ? plugin.recommended_version : current.currentPluginVersion;
    if (current.currentModelProxyVersion !== undefined && proxy?.requires_plugin !== undefined && !satisfies(pluginVersion, proxy.requires_plugin, { includePrerelease: true }))
        return undefined;
    const targets = [pluginUpgrade ? `@awiki/dsh-plugin@${pluginVersion}` : undefined,
        proxyUpgrade ? `@awiki/dsh-model-proxy@${proxy.recommended_version}` : undefined].filter(Boolean);
    return `dsh plugin add ${targets.join(' ')}`;
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
    const releaseNotes = value.release_notes_url === '' ? undefined : new URL(value.release_notes_url);
    if (releaseNotes !== undefined)
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
        release_notes_url: releaseNotes?.toString() ?? '',
        packages: { plugin, ...modelProxy === undefined ? {} : { model_proxy: modelProxy } },
    };
}
function decodeServerInfoPolicy(value, origin, minimumRevision = 0) {
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
    // A stale disabled product must not erase a newer cached compatibility gate.
    if (releases.policy_revision < minimumRevision)
        throw new Error('policy revision moved backwards');
    const product = releases.products.dsh;
    if (product.enabled === false) {
        if (product.compatibility === undefined || product.compatibility === null)
            return undefined;
        if (!isRecord(product.compatibility))
            throw new Error('invalid DSH compatibility');
        const component = (value, name) => {
            if (!isRecord(value))
                throw new Error('invalid DSH component compatibility');
            return { name, recommended_version: value.recommended_version,
                min_supported_version: value.minimum_supported_version, installable: false };
        };
        return decodePolicy({ product: PRODUCT, channel: CHANNEL, policy_origin: origin,
            policy_revision: releases.policy_revision, published_at: releases.published_at,
            release_notes_url: product.release_notes_url ?? '', packages: {
                plugin: component(product.compatibility.plugin, '@awiki/dsh-plugin'),
                ...product.compatibility.model_proxy == null ? {} : {
                    model_proxy: component(product.compatibility.model_proxy, '@awiki/dsh-model-proxy'),
                },
            } }, origin);
    }
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
        repository: value.repository === null ? undefined : value.repository,
        requires_plugin: value.requires_plugin === null ? undefined : value.requires_plugin,
    }, expectedName);
}
function decodePackage(value, expectedName) {
    if (!isRecord(value)
        || value.name !== expectedName
        || typeof value.recommended_version !== 'string'
        || typeof value.min_supported_version !== 'string'
        || (value.installable !== false && (typeof value.integrity !== 'string' || !/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(value.integrity)))
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
        ...value.installable === false ? { installable: false } : { integrity: value.integrity },
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
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=update-policy.js.map