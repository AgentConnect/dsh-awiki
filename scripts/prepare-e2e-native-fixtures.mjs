import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const identityRoot = resolve(repositoryRoot, '../anp-identity')
const cliRoot = resolve(repositoryRoot, '../awiki-cli-rs2')
const identitySourceRef = '9f75891cc74d52a166a2d23c884ac32101b0c739'
const imCoreSourceRef = '5fd332e27fa01ad6b61c0e85d42cef7afff1252f'

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
