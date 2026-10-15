import { describe, it, expect, vi } from 'vitest'
import { projectBackendFeatures, requireBackendFeature } from '../src/backend-capabilities.ts'
import type { AwikiSdkClient } from '../src/provider-api.ts'

function client(status = 'confirmed', support = 'supported') {
  return { backendCapabilities: vi.fn(async () => ({ status, capabilities: {
    'services.mail': { support, token: 'secret' }, direct: { support }, secret: { support: 'supported' },
  }, private_key: 'secret' })) } as unknown as AwikiSdkClient
}
describe('backend capability Host projection', () => {
  it('projects fixed support states without credentials or unknown keys', async () => {
    const source = client()
    const features = await projectBackendFeatures(source, false)
    expect(features['services.mail']).toBe('supported')
    expect(features.direct).toBeUndefined()
    expect(JSON.stringify(features)).not.toContain('secret')
    expect(source.backendCapabilities).toHaveBeenCalledTimes(1)
  })
  it('preserves confirmed layout on stale discovery and accepts explicit disable', async () => {
    expect((await projectBackendFeatures(client('stale'), true)).direct).toBe('supported')
    expect((await projectBackendFeatures(client('confirmed', 'unsupported'), true)).direct).toBe('unsupported')
    expect((await projectBackendFeatures(client('unavailable'), true)).direct).toBe('unknown')
  })
  it('rejects disabled and missing contracts before invoking the business operation', async () => {
    await expect(requireBackendFeature(client('confirmed', 'unsupported'), 'services.mail')).rejects.toMatchObject({code: 'backend-not-supported'})
    await expect(requireBackendFeature({} as AwikiSdkClient, 'services.mail')).rejects.toMatchObject({code: 'backend-unconfirmed'})
    await expect(requireBackendFeature(client(), 'services.mail')).resolves.toBeUndefined()
  })
})
