import { spawnSync } from 'node:child_process'
import { resolve, join } from 'node:path'
import { verifyInstalled } from './check-dependency-sources.mjs'

const mode = process.env.AWIKI_DEPENDENCY_MODE ?? 'registry'
verifyInstalled(process.cwd(), mode)
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, env: process.env, stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`${command} failed`)
}
if (mode !== 'registry') {
  const identity = process.env.AWIKI_LOCAL_IDENTITY_ROOT
  const core = process.env.AWIKI_LOCAL_CORE_ROOT
  if (!identity && !core) throw new Error('Local mode requires explicit SDK roots; use scripts/dependencies/run.py')
  if (identity) {
    run('pnpm', ['--dir', join(identity, 'bindings/node'), 'run', process.env.NODE_ENV === 'production' ? 'build' : 'build:debug'], process.cwd())
    run('pnpm', ['--dir', join(identity, 'packages/dsh-anp-identity'), 'run', 'build'], process.cwd())
  }
  if (core) {
    run(process.execPath, [join(core, 'packages/awiki-im-core-node/scripts/build-native.mjs')], core)
    run(process.execPath, [resolve('node_modules/typescript/bin/tsc'), '-p', join(core, 'packages/awiki-im-core-node/tsconfig.json'), '--types', 'node', '--typeRoots', resolve('node_modules/@types')], core)
  }
}
// Both modes must load the actual selected native provider, with no fallback.
await import('@awiki/im-core-node')
await import('@agent-network-protocol/dsh-anp-identity/provider')
console.log(`e2e_native_fixtures=${mode}`)
