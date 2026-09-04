import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const identityRoot = resolve(repositoryRoot, '../anp/anp-identity')
const cliRoot = resolve(repositoryRoot, '../awiki-cli-rs2')
const identitySourceRef = '8dc65ccc388af0f0622263811776a6aadcd11d18'
const imCoreSourceRef = 'b5dfcb4dd50adda317bd8ea1e5b93e9db7c01f3a'

function run(stage, command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    env: process.env,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: 'inherit',
  })
  if (result.status !== 0) throw new Error(`${stage} failed`)
}

run('Identity source lock', 'git', [
  'diff', '--quiet', identitySourceRef, '--',
  'Cargo.lock', 'Cargo.toml', 'bindings/node', 'crates/anp-identity',
], identityRoot)
run('IM Core Node source lock', 'git', [
  'diff', '--quiet', imCoreSourceRef, '--',
  'Cargo.lock', 'Cargo.toml', 'crates/im-core', 'crates/im-core-node', 'packages/awiki-im-core-node',
], cliRoot)
run('Identity native fixture build', 'npm', [
  '--prefix', join(identityRoot, 'bindings/node'), 'run', 'build:debug',
], repositoryRoot)
run('IM Core Node native fixture build', process.execPath, [
  join(cliRoot, 'packages/awiki-im-core-node/scripts/build-native.mjs'),
], cliRoot)
run('IM Core Node TypeScript fixture build', process.execPath, [
  join(repositoryRoot, 'node_modules/typescript/bin/tsc'),
  '-p', join(cliRoot, 'packages/awiki-im-core-node/tsconfig.json'),
  '--types', 'node',
  '--typeRoots', join(repositoryRoot, 'node_modules/@types'),
], repositoryRoot)

process.stdout.write('e2e_native_fixtures=passed\n')
