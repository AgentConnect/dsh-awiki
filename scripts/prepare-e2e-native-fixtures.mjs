import { spawnSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const anpRoot = resolve(repositoryRoot, '../anp/anp')
const identityRoot = resolve(repositoryRoot, '../anp/anp-identity')
const cliRoot = resolve(repositoryRoot, '../awiki-cli-rs2')
const anpSourceRef = '246d69e2c5b5cefb0cf13f2e9f0f6e497915f084'
const identitySourceRef = 'a0af4e1590ef9b1911a40c9f25a83cbbccd0bd4b'
const imCoreSourceRef = '42e43080d7e3bcbd21ea16344df642521f1d3b8b'

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

run('ANP source lock', 'git', [
  'diff', '--quiet', anpSourceRef, '--', 'rust',
], anpRoot)
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
