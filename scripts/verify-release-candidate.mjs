import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

function fail(message) {
  throw new Error(message)
}

function argument(name) {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1 || !process.argv[index + 1]) fail(`missing --${name}`)
  return resolve(process.cwd(), process.argv[index + 1])
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: 180_000,
    ...options,
  })
  if (result.status !== 0) fail(result.error?.message || result.stderr || result.stdout)
  return result.stdout.trim()
}

function exactEntryCount(source, id) {
  return source.match(new RegExp(`^\\s*- id: ${id}$`, 'gmu'))?.length ?? 0
}

function assertRuntimeManifest(manifest, expected) {
  if (manifest.name !== expected.name || manifest.version !== expected.version) {
    fail(`installed ${expected.name} version mismatch`)
  }
  for (const value of [
    ...Object.values(manifest.dependencies || {}),
    ...Object.values(manifest.peerDependencies || {}),
  ]) {
    if (/^(?:file:|link:|workspace:)/u.test(value)) fail(`${manifest.name} leaked a local runtime spec`)
  }
}

const packages = {
  identityWrapper: argument('identity-wrapper'),
  identityPlatform: argument('identity-platform'),
  identityPlugin: argument('identity-plugin'),
  imCoreWrapper: argument('im-core-wrapper'),
  imCorePlatform: argument('im-core-platform'),
  awikiPlugin: argument('awiki-plugin'),
}
const workspace = await mkdtemp(join(tmpdir(), 'dsh-awiki-release-candidate-'))
const dshHome = join(workspace, 'dsh-home')
const profile = 'awiki-release-candidate'
const profileRoot = join(dshHome, 'profiles', profile)
const env = {
  ...process.env,
  DSH_HOME: dshHome,
  DSH_TELEMETRY_DISABLED: '1',
}

try {
  run('dsh', [
    'plugin', '--profile', profile, 'add',
    packages.identityWrapper,
    packages.identityPlatform,
    packages.imCoreWrapper,
    packages.imCorePlatform,
  ], { env })
  await writeFile(join(profileRoot, 'pnpm-workspace.yaml'), [
    'overrides:',
    `  '@agent-network-protocol/anp-identity': file:${packages.identityWrapper}`,
    `  '@awiki/im-core-node': file:${packages.imCoreWrapper}`,
    '',
  ].join('\n'))
  run('dsh', ['plugin', '--profile', profile, 'add', packages.identityPlugin], { env })
  run('dsh', ['plugin', '--profile', profile, 'add', packages.awikiPlugin], { env })

  const composed = run('dsh', ['--profile', profile, '--dump-default-config'], { env })
  for (const id of [
    'anp-identity', 'anp-identity-provider', 'awiki', 'awiki-provider', 'awiki-summary-provider',
  ]) {
    const count = exactEntryCount(composed, id)
    if (count !== 1) {
      const entries = composed.split('\n').filter((line) => /\bid:/u.test(line)).join(' | ')
      fail(`composed profile must contain exactly one ${id}; found ${count}; entries: ${entries}`)
    }
  }

  const manifests = [
    ['@agent-network-protocol/anp-identity', '0.2.0'],
    ['@agent-network-protocol/dsh-anp-identity', '0.1.0'],
    ['@awiki/im-core-node', '0.2.1'],
    ['@awiki/dsh-plugin', '0.3.7'],
  ]
  for (const [name, version] of manifests) {
    const manifest = JSON.parse(await readFile(join(profileRoot, 'node_modules', name, 'package.json'), 'utf8'))
    assertRuntimeManifest(manifest, { name, version })
  }

  const smoke = join(profileRoot, 'provider-smoke.mjs')
  await writeFile(smoke, providerSmoke({
    identityRoot: join(workspace, 'identity-state'),
    coreRoot: join(workspace, 'awiki-state'),
  }))
  const output = run(process.execPath, [smoke], { cwd: profileRoot, env })
  if (output !== 'packed-provider-restart-ok') fail(`unexpected Provider smoke output: ${output}`)
  process.stdout.write(`${JSON.stringify({
    status: 'passed',
    profileEntries: 5,
    providerRestart: true,
    versions: Object.fromEntries(manifests),
  }, null, 2)}\n`)
} finally {
  await rm(workspace, { recursive: true, force: true })
}

function providerSmoke({ identityRoot, coreRoot }) {
  return `
import { Context } from '@deepseek-ai/cordis'
import IdentityService from '@agent-network-protocol/dsh-anp-identity'
import { openNativeProvider } from '@agent-network-protocol/dsh-anp-identity/provider'
import { openImCoreNodeClient } from '@awiki/im-core-node'

const capabilities = [
  'IDENTITY_READ', 'IDENTITY_CREATE', 'IDENTITY_IMPORT', 'IDENTITY_SIGN',
  'IDENTITY_ECDH_SEALED', 'IDENTITY_DOCUMENT_UPDATE', 'IDENTITY_KEY_LIFECYCLE',
  'IDENTITY_DELETE', 'IDENTITY_HTTP_SIGNATURE', 'AWIKI_LEGACY_ROOT_TRANSFER_V1',
]

for (let attempt = 0; attempt < 2; attempt += 1) {
  const ctx = new Context()
  await ctx.plugin(IdentityService, {
    stateRoot: ${JSON.stringify(identityRoot)},
    allowConsumers: ['@awiki/dsh-plugin'],
    allowProviderConsumers: ['@awiki/dsh-plugin'],
  })
  const registration = await openNativeProvider({
    stateRoot: ${JSON.stringify(identityRoot)},
    rootKeyProvider: 'local-file',
    rootKeyProviderId: 'packed-provider-smoke',
    keyringFallbackToLocalFile: false,
  })
  const unregister = ctx.anpIdentity.registerProvider(registration)
  for (let wait = 0; wait < 100 && (await ctx.anpIdentity.health()).status === 'unavailable'; wait += 1) {
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  if ((await ctx.anpIdentity.health()).status !== 'ready') throw new Error('identity provider did not become ready')
  const lease = ctx.anpIdentity.acquireProvider({
    consumer: '@awiki/dsh-plugin', capabilities, ttlSeconds: 60,
  })
  const client = await openImCoreNodeClient({
    stateRoot: ${JSON.stringify(coreRoot)},
    serviceBaseUrl: 'https://example.test',
    didDomain: 'example.test',
    operationTimeoutMs: 1_000,
    syncTimeoutMs: 100,
    identityProvider: lease,
  })
  if (await client.getDefaultIdentity() !== null) throw new Error('expected empty packed Core')
  await client.close()
  lease.dispose()
  await unregister()
  await ctx.fiber.dispose()
}
console.log('packed-provider-restart-ok')
`
}
