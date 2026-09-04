import { fileURLToPath } from 'node:url';
import { basename, dirname, join, resolve } from 'node:path';
function assertProfileName(value, source) {
    if (typeof value !== 'string' || value.length === 0
        || value.includes('/') || value.includes('\\')
        || value === '.' || value === '..' || value === 'node_modules') {
        throw new TypeError(`awiki: ${source} supplied an invalid profile name`);
    }
    return value;
}
/** Resolve only profile identities supplied by an authoritative DSH service or Loader directory. */
export function resolveAwikiProfileName(ctx, dshHome) {
    const desktopProfiles = ctx.get('desktopProfiles');
    if (desktopProfiles !== undefined) {
        return assertProfileName(desktopProfiles.current?.name, 'desktopProfiles.current');
    }
    let profileDir;
    try {
        if (ctx.baseUrl === undefined)
            return undefined;
        const baseUrl = new URL(ctx.baseUrl);
        if (baseUrl.protocol !== 'file:')
            return undefined;
        profileDir = resolve(fileURLToPath(baseUrl));
    }
    catch {
        return undefined;
    }
    const profilesDir = resolve(dshHome, 'profiles');
    if (dirname(profileDir) !== profilesDir)
        return undefined;
    return assertProfileName(basename(profileDir), 'Loader profile directory');
}
/** Preserve the historical fallback while isolating desktop/CLI profiles at the Host boundary. */
export function resolveAwikiStateRoot(ctx, dshHome) {
    const profileName = resolveAwikiProfileName(ctx, dshHome);
    return profileName === undefined
        ? join(dshHome, 'awiki', 'im-core')
        : join(dshHome, 'awiki', profileName, 'im-core');
}
//# sourceMappingURL=profile-state.js.map