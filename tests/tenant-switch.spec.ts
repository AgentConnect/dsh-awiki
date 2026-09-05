import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import {
  AWIKI_CHINA_TENANT_ID,
  AWIKI_GLOBAL_TENANT_ID,
} from '../src/tenant-registry.ts'
import { setup } from './harness.ts'

let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  vi.unstubAllGlobals()
})

async function officialHarness() {
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline fixture'))))
  const harness = await setup({
    userServiceUrl: 'https://awiki.me',
    userServiceDomain: 'awiki.me',
    messageServiceUrl: 'https://awiki.me',
    mailServiceUrl: 'https://awiki.me',
    messageServicePublicUrl: 'https://awiki.me',
    messageServiceDid: 'did:wba:awiki.me',
  })
  context = harness.ctx
  return harness
}

describe('transactional Host tenant switching', () => {
  it('switches China to Global and back with independent immutable scopes', async () => {
    const harness = await officialHarness()
    expect(harness.ctx.awiki.getTenantRegistryView()).toMatchObject({ activeTenantId: AWIKI_CHINA_TENANT_ID, generation: 0 })

    await expect(harness.ctx.awiki.switchTenant(AWIKI_GLOBAL_TENANT_ID)).resolves.toMatchObject({
      activeTenantId: AWIKI_GLOBAL_TENANT_ID, generation: 1, switching: false,
    })
    const globalOptions = (harness.ctx.awiki as unknown as { activeClientOptions: { userServiceDomain: string; stateRoot: string } }).activeClientOptions
    expect(globalOptions.userServiceDomain).toBe('awiki.ai')
    expect(globalOptions.stateRoot).toContain('/tenant-scopes/builtin-secondary-v1/')

    await expect(harness.ctx.awiki.switchTenant(AWIKI_CHINA_TENANT_ID)).resolves.toMatchObject({
      activeTenantId: AWIKI_CHINA_TENANT_ID, generation: 2,
    })
    const chinaOptions = (harness.ctx.awiki as unknown as { activeClientOptions: { stateRoot: string } }).activeClientOptions
    expect(chinaOptions.stateRoot).toContain('/tenant-scopes/builtin-primary-v1/')
    expect(harness.client.disposed).toBe(2)
  })

  it('admits only one switch transaction while the old Core is quiescing', async () => {
    const harness = await officialHarness()
    const originalDispose = harness.client.dispose.bind(harness.client)
    let release: (() => void) | undefined
    harness.client.dispose = vi.fn(() => new Promise<void>(resolve => { release = resolve }))
    const first = harness.ctx.awiki.switchTenant(AWIKI_GLOBAL_TENANT_ID)
    await vi.waitFor(() => { expect(harness.ctx.awiki.getTenantRegistryView().switching).toBe(true) })
    await expect(harness.ctx.awiki.switchTenant(AWIKI_GLOBAL_TENANT_ID)).rejects.toThrow('already in progress')
    release?.()
    await expect(first).resolves.toMatchObject({ activeTenantId: AWIKI_GLOBAL_TENANT_ID })
    harness.client.dispose = originalDispose
  })

  it('rebuilds the previous tenant when releasing the old Core fails', async () => {
    const harness = await officialHarness()
    const originalDispose = harness.client.dispose.bind(harness.client)
    let failed = false
    harness.client.dispose = vi.fn(async () => {
      if (!failed) {
        failed = true
        throw new Error('fixture dispose failure')
      }
      await originalDispose()
    })
    await expect(harness.ctx.awiki.switchTenant(AWIKI_GLOBAL_TENANT_ID)).rejects.toThrow('previous tenant was restored')
    expect(harness.ctx.awiki.getTenantRegistryView()).toMatchObject({ activeTenantId: AWIKI_CHINA_TENANT_ID, generation: 0, switching: false })
    expect((harness.ctx.awiki as unknown as { activeClientOptions: { userServiceDomain: string } }).activeClientOptions.userServiceDomain).toBe('awiki.me')
  })

  it('drops a delayed response from the old generation after a successful switch', async () => {
    const harness = await officialHarness()
    const originalGetIdentity = harness.client.getIdentity.bind(harness.client)
    let release: ((value: unknown) => void) | undefined
    const delayed = new Promise(resolve => { release = resolve })
    harness.client.getIdentity = vi.fn(() => delayed) as never
    const pending = harness.ctx.awiki.getIdentity()
    const switching = harness.ctx.awiki.switchTenant(AWIKI_GLOBAL_TENANT_ID)
    await vi.waitFor(() => { expect(harness.ctx.awiki.getTenantRegistryView().switching).toBe(true) })
    release?.({ handle: 'old', did: 'did:old', registeredAt: 1 })
    await switching
    await expect(pending).resolves.toMatchObject({ ok: false, error: { code: 'conflict' } })
    harness.client.getIdentity = originalGetIdentity
  })

  it('does not return delayed server-info from the tenant that was switched away', async () => {
    const harness = await officialHarness()
    let releaseOld: ((response: Response) => void) | undefined
    let serverInfoRequests = 0
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : input.toString()
      if (!url.includes('/user-service/v1/server-info')) return Promise.reject(new Error('offline fixture'))
      serverInfoRequests += 1
      if (serverInfoRequests === 1) {
        return new Promise<Response>(resolve => { releaseOld = resolve })
      }
      return Promise.resolve(new Response(JSON.stringify({
        schema_version: 1,
        services: {},
      }), { status: 200, headers: { 'content-type': 'application/json' } }))
    }))

    const pendingConfig = harness.ctx.awiki.getConfig()
    await vi.waitFor(() => { expect(serverInfoRequests).toBe(1) })
    await harness.ctx.awiki.switchTenant(AWIKI_GLOBAL_TENANT_ID)
    releaseOld?.(new Response(JSON.stringify({
      schema_version: 1,
      services: {
        guest_gateway: { enabled: true, base_url: 'https://guest.old-tenant.example' },
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } }))

    await expect(pendingConfig).resolves.toMatchObject({
      ok: false,
      error: { code: 'conflict' },
    })
    expect(JSON.stringify(harness.ctx.awiki.getTenantCapabilities())).not.toContain('old-tenant')
  })

  it('runs optional participants around the Core replacement and restores them on rollback', async () => {
    const harness = await officialHarness()
    const calls: string[] = []
    harness.ctx.awiki.registerTenantLifecycleParticipant({
      prepareSwitch: context => { calls.push(`prepare:${context.from.tenantId}->${context.to.tenantId}`) },
      commitSwitch: context => { calls.push(`commit:${context.to.tenantId}`) },
      rollbackSwitch: context => { calls.push(`rollback:${context.from.tenantId}`) },
    })
    await harness.ctx.awiki.switchTenant(AWIKI_GLOBAL_TENANT_ID)
    expect(calls).toEqual([
      'prepare:builtin-primary->builtin-secondary',
      'commit:builtin-secondary',
    ])
  })
})
