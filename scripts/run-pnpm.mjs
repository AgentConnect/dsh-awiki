import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { extname, isAbsolute } from 'node:path'

// Windows cannot execute pnpm.cmd directly through spawnSync without a shell.
// Reuse the package-manager entrypoint supplied by the owning pnpm invocation.
export function runPnpmSync(args, options = {}) {
  if (process.platform !== 'win32') return spawnSync('pnpm', args, options)
  const entry = process.env.npm_execpath
  if (!entry || !isAbsolute(entry) || !existsSync(entry)) {
    throw new Error('Run this Windows build through pnpm run; its package-manager entrypoint is required')
  }
  const extension = extname(entry).toLowerCase()
  if (['.cjs', '.mjs', '.js'].includes(extension)) {
    return spawnSync(process.execPath, [entry, ...args], options)
  }
  if (extension === '.exe') return spawnSync(entry, args, options)
  throw new Error('The Windows package-manager entrypoint must be JavaScript or a native executable')
}
