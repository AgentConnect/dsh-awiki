import { describe, it, expect, vi } from 'vitest'
import { backendAttachmentMaxBytes, projectBackendFeatures, requireBackendFeature } from '../src/backend-capabilities.ts'
import type { AwikiSdkClient } from '../src/provider-api.ts'

function client(status = 'confirmed', support = 'supported') {
  return { backendCapabilities: vi.fn(async () => ({ status, capabilities: {
    'services.mail': { support, token: 'secret' }, direct: { support }, secret: { support: 'supported' },
  }, private_key: 'secret' })) } as unknown as AwikiSdkClient
}
describe('backend capability Host projection', () => {
  it('bounds attachment limits by both declared and client ceilings', () => {
    const snapshot = { status: 'stale' as const, capabilities: {
      attachments: { support: 'supported' as const, limits: { max_object_bytes: '4096' } },
    } }
    expect(backendAttachmentMaxBytes(snapshot, 8192)).toBe(4096)
    expect(backendAttachmentMaxBytes(snapshot, 1024)).toBe(1024)
    expect(backendAttachmentMaxBytes({ ...snapshot, status: 'unavailable' }, 8192)).toBe(8192)
    for (const max_object_bytes of ['private-error', -1, 1.5, Number.NaN]) {
      expect(backendAttachmentMaxBytes({ status: 'confirmed', capabilities: {
        attachments: { support: 'supported', limits: { max_object_bytes } },
      } }, 8192)).toBe(8192)
    }
  })
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
