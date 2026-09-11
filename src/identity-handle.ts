/** Project Core's registered Handle into the same provider-owned ANP identity. */
import type { AnpIdentityServiceContract } from '@agent-network-protocol/dsh-anp-identity'
import type { AwikiIdentity } from './types.ts'

export async function syncAnpIdentityHandle(service: AnpIdentityServiceContract, identity: AwikiIdentity): Promise<void> {
  if (identity.handle === undefined) return
  const client = await service.acquireClient({
    consumer: '@awiki/dsh-plugin',
    capabilities: ['identity:read', 'identity:handle'],
    ttlSeconds: 60,
  })
  try {
    const entry = (await client.list()).find(item => item.reference.did === identity.did)
    if (entry === undefined) throw new Error('Registered AWiki identity is absent from the ANP catalog')
    if (entry.handle !== identity.handle) await client.setHandle(entry.reference, identity.handle)
  } finally {
    await client.dispose()
  }
}
