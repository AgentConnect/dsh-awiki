import type { Context } from '@deepseek-ai/cordis'
import { fileURLToPath } from 'node:url'
import { basename, dirname, join, resolve } from 'node:path'

interface DesktopProfilesLike {
  readonly current?: {
    readonly name?: unknown
  }
}

/** Match the profile-name boundary enforced by the DSH launcher. */
function assertProfileName(value: unknown, source: string): string {
  if (typeof value !== 'string' || value.length === 0
    || value.includes('/') || value.includes('\\')
    || value === '.' || value === '..' || value === 'node_modules') {
    throw new TypeError(`awiki: ${source} supplied an invalid profile name`)
  }
  return value
}

/**
 * Resolve the active DSH profile without guessing it from argv or process type.
 * Desktop's generation-scoped service is authoritative. Ordinary DSH has no
 * corresponding service, so its Loader root is accepted only when it is the
 * exact `$DSH_HOME/profiles/<name>` directory.
 */
export function resolveAwikiProfileName(ctx: Context, dshHome: string): string | undefined {
  const desktopProfiles = ctx.get('desktopProfiles') as DesktopProfilesLike | undefined
  if (desktopProfiles !== undefined) {
    return assertProfileName(desktopProfiles.current?.name, 'desktopProfiles.current')
  }

  let profileDir: string
  try {
    if (ctx.baseUrl === undefined) return undefined
    const baseUrl = new URL(ctx.baseUrl)
    if (baseUrl.protocol !== 'file:') return undefined
    profileDir = resolve(fileURLToPath(baseUrl))
  } catch {
    return undefined
  }

  const profilesDir = resolve(dshHome, 'profiles')
  if (dirname(profileDir) !== profilesDir) return undefined
  const name = basename(profileDir)
  return assertProfileName(name, 'Loader profile directory')
}

/** Resolve the profile-local default while preserving the legacy fallback. */
export function resolveAwikiStateRoot(ctx: Context, dshHome: string): string {
  const profileName = resolveAwikiProfileName(ctx, dshHome)
  return profileName === undefined
    ? join(dshHome, 'awiki', 'im-core')
    : join(dshHome, 'awiki', profileName, 'im-core')
}
