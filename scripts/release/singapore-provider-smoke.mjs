export function providerSmoke({ identityRoot, coreRoot }) {
  return `
import { createRequire } from 'node:module'
import { realpathSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const require = createRequire(realpathSync(new URL('./node_modules/@agent-network-protocol/dsh-anp-identity/package.json', import.meta.url)))
const { Context } = await import(pathToFileURL(require.resolve('@deepseek-ai/cordis')).href)
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
