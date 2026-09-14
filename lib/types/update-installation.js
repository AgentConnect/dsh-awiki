/** Host-only compatibility evidence for exact, tenant-recommended npm targets. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { satisfies, validRange } from 'semver';
import { assertVersion, compareVersions } from "./version.js";
export const IDENTITY_PACKAGE = '@agent-network-protocol/dsh-anp-identity';
const record = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
export function decodeInstallation(value) {
    if (value === undefined || value === null)
        return undefined;
    if (!record(value) || !record(value.runtime_packages) || !record(value.identity)
        || value.identity.package_name !== IDENTITY_PACKAGE || typeof value.identity.version !== 'string'
        || typeof value.identity.integrity !== 'string' || !/^sha512-[A-Za-z0-9+/]+={0,2}$/u.test(value.identity.integrity)
        || typeof value.requires_identity !== 'string' || value.requires_identity.length > 256 || validRange(value.requires_identity) === null) {
        throw new Error('invalid installation requirements');
    }
    const entries = Object.entries(value.runtime_packages);
    if (entries.length === 0 || entries.length > 128)
        throw new Error('invalid Host requirement count');
    for (const [name, version] of entries) {
        if (!/^@deepseek-ai\/dsh-[a-z0-9-]+$/u.test(name) || typeof version !== 'string')
            throw new Error('invalid Host requirement');
        assertVersion(version);
    }
    assertVersion(value.identity.version);
    if (!satisfies(value.identity.version, value.requires_identity))
        throw new Error('incompatible Identity release target');
    return { runtime_packages: value.runtime_packages, requires_identity: value.requires_identity,
        identity: { package_name: IDENTITY_PACKAGE, version: value.identity.version, integrity: value.identity.integrity } };
}
/** Only package manifests are read; paths and native objects never enter the public view. */
function installedVersion(name) {
    try {
        let directory = dirname(fileURLToPath(import.meta.resolve(name)));
        for (let depth = 0; depth < 12; depth++) {
            try {
                const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
                if (record(manifest) && manifest.name === name && typeof manifest.version === 'string') {
                    assertVersion(manifest.version);
                    return manifest.version;
                }
            }
            catch { /* The resolved entry may be inside lib or dist. */ }
            const parent = dirname(directory);
            if (parent === directory)
                break;
            directory = parent;
        }
    }
    catch { /* A missing peer is incompatible, never an invented installed version. */ }
    return undefined;
}
export function checkInstallation(requirements, installed) {
    if (requirements === undefined)
        return { blockedReason: 'installation-unverified' };
    const versionOf = (name) => installed === undefined ? installedVersion(name) : installed[name];
    for (const [name, required] of Object.entries(requirements.runtime_packages)) {
        const actual = versionOf(name);
        try {
            if (actual === undefined || compareVersions(actual, required) !== 0)
                return { blockedReason: 'host-incompatible' };
        }
        catch {
            return { blockedReason: 'host-incompatible' };
        }
    }
    const identity = versionOf(IDENTITY_PACKAGE);
    try {
        if (identity === undefined || compareVersions(identity, requirements.identity.version) < 0) {
            return { identityTarget: `${IDENTITY_PACKAGE}@${requirements.identity.version}` };
        }
        if (!satisfies(identity, requirements.requires_identity))
            return { blockedReason: 'identity-incompatible' };
    }
    catch {
        return { blockedReason: 'identity-incompatible' };
    }
    return {};
}
//# sourceMappingURL=update-installation.js.map