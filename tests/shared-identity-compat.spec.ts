/** Explicit local-source component regression; no product UI or remote services. */
import { Context } from '@deepseek-ai/cordis'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import AnpIdentityService from '@agent-network-protocol/dsh-anp-identity'
import { openNativeProvider } from '@agent-network-protocol/dsh-anp-identity/provider'
import type { NativeProviderRegistry, HostProviderLease } from '@agent-network-protocol/dsh-anp-identity/provider-api'
import { syncAnpIdentityHandle } from '../src/identity-handle.ts'

it.skipIf(!process.env.DSH_SHARED_IDENTITY_CHECKOUT)('keeps the AWiki Host lease and Handle projection compatible with the shared-identity candidate', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-shared-identity-compat-'))
  const ctx = new Context()
  let lease: HostProviderLease | undefined
  try {
    await ctx.plugin(AnpIdentityService, { stateRoot: root, allowConsumers: ['@awiki/dsh-plugin'], allowProviderConsumers: ['@awiki/dsh-plugin'] })
    const service = ctx.anpIdentity
    expect('registerPublicationBackend' in service).toBe(true) // Reject accidentally testing the old registry implementation.
    const provider = await openNativeProvider({ stateRoot: root, rootKeyProvider: 'injected', rootKeyProviderId: 'compat', injectedRootKey: Buffer.alloc(32, 97) })
    ;(service as unknown as NativeProviderRegistry).registerProvider(provider)
    await expect.poll(async () => (await service.health()).status).toBe('ready')
    lease = service.acquireProvider({ consumer: '@awiki/dsh-plugin', capabilities: ['IDENTITY_READ', 'IDENTITY_CREATE', 'IDENTITY_SIGN'] })
    const publicIdentity = await lease.create({ profile: 'e1', domain: 'example.test', pathSegments: ['compat'], capabilities: { didWba: true }, managedKeys: [{ fragment: 'root', role: 'root_control' }, { fragment: 'request', role: 'request_signing' }] })
    const signature = await lease.sign(publicIdentity.reference, { purpose: 'authentication', payload: Buffer.from('existing ANP consumer') })
    await expect(lease.verify(publicIdentity.reference, { purpose: 'authentication', kid: signature.kid, payload: Buffer.from('existing ANP consumer'), signature: signature.bytes })).resolves.toBe('valid')
    await syncAnpIdentityHandle(service, { did: publicIdentity.reference.did, handle: 'compat.handle', registeredAt: 0 })
    const client = await service.acquireClient({ consumer: '@awiki/dsh-plugin', capabilities: ['identity:read'] })
    try {
      expect((await client.list()).find(entry => entry.reference.did === publicIdentity.reference.did)?.handle).toBe('compat.handle')
    } finally { await client.dispose() }
  } finally {
    lease?.dispose()
    await ctx.fiber.dispose()
    await rm(root, { recursive: true, force: true })
  }
})
