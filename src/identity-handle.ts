/** Project Core's registered Handle into the same provider-owned ANP identity. */
import { AnpIdentityPluginError, type AnpIdentityServiceContract } from '@agent-network-protocol/dsh-anp-identity'
import type { AwikiIdentity } from './types.ts'

export async function syncAnpIdentityHandle(service: AnpIdentityServiceContract, identity: AwikiIdentity): Promise<void> {
  if (identity.handle === undefined) return
  const client = await service.acquireClient({
    consumer: '@awiki/dsh-plugin',
    capabilities: ['identity:read', 'identity:handle'],
    ttlSeconds: 60,
  })
  try {
    const entries = await client.list()
    const entry = entries.find(item => item.reference.did === identity.did)
    if (entry === undefined) throw new AnpIdentityPluginError('identity_not_found')
    const handle = identity.handle.toLowerCase()
    if (entry.handle === handle) return
    // Recovery retains the predecessor DID. Move its unique Handle to Core's current DID.
    // Only entries granted to this client are visible; unrelated owners remain protected.
    for (const previous of entries) {
      if (previous.reference.did !== identity.did && previous.handle === handle) {
        await client.setHandle(previous.reference, null)
      }
    }
    // If assignment fails after clearing, the next read retries this projection.
    await client.setHandle(entry.reference, identity.handle)
  } finally {
    await client.dispose()
  }
}
