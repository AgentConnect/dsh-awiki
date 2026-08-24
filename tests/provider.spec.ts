import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context, Service } from '@deepseek-ai/cordis'
import type { HostProviderLease } from '@agent-network-protocol/dsh-anp-identity/provider-api'
import { apply, inject } from '../src/provider.ts'
import { setup } from './harness.ts'

const mocked = vi.hoisted(() => ({ openImCoreNodeClient: vi.fn() }))

vi.mock('@awiki/im-core-node', () => ({
  openImCoreNodeClient: mocked.openImCoreNodeClient,
}))

let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  mocked.openImCoreNodeClient.mockReset()
})

describe('AWiki production provider', () => {
  it('injects the Host-only identity lease and closes IM Core before revoking it', async () => {
    const events: string[] = []
    const lease = fakeLease(events)
    mocked.openImCoreNodeClient.mockResolvedValue({
      getDefaultIdentity: async () => null,
      close: async () => { events.push('client') },
    })

    const harness = await setup()
    context = harness.ctx
    await harness.providerFiber.dispose()
    await harness.ctx.plugin(class TestAnpIdentity extends Service {
      constructor(ctx: Context) {
        super(ctx, 'anpIdentity')
      }

      acquireProvider(request: {
        consumer: string
        capabilities: string[]
        ttlSeconds: number
      }): HostProviderLease {
        expect(request.consumer).toBe('@awiki/dsh-plugin')
        expect(request.ttlSeconds).toBe(3_600)
        expect(request.capabilities).toContain('AWIKI_LEGACY_ROOT_TRANSFER_V1')
        return lease
      }
    })

    const providerFiber = harness.ctx.plugin(Object.assign(apply, { inject }))
    await providerFiber
    await expect(harness.ctx.awiki.getIdentity()).resolves.toEqual({ ok: true, value: null })
    expect(mocked.openImCoreNodeClient).toHaveBeenCalledOnce()
    expect(mocked.openImCoreNodeClient.mock.calls[0]?.[0]).toMatchObject({
      identityProvider: lease,
      multiDeviceDeviceRevokeEnabled: true,
    })

    await providerFiber.dispose()
    expect(events).toEqual(['client', 'lease'])
  })

  it('declares both required Cordis services', () => {
    expect(inject).toEqual(['awiki', 'anpIdentity'])
  })
})

function fakeLease(events: string[]): HostProviderLease {
  return {
    protocol: 'anp-identity-provider-ts/1',
    capabilities: [
      'IDENTITY_READ',
      'IDENTITY_CREATE',
      'IDENTITY_IMPORT',
      'IDENTITY_SIGN',
      'IDENTITY_ECDH_SEALED',
      'IDENTITY_DOCUMENT_UPDATE',
      'IDENTITY_KEY_LIFECYCLE',
      'IDENTITY_DELETE',
      'IDENTITY_HTTP_SIGNATURE',
      'AWIKI_LEGACY_ROOT_TRANSFER_V1',
    ],
    dispose() {
      events.push('lease')
    },
  } as HostProviderLease
}
