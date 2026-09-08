import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import {
  AWIKI_CHINA_TENANT_ID,
  AWIKI_GLOBAL_TENANT_ID,
} from '../src/tenant-registry.ts'
import { setup } from './harness.ts'
import { AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION } from '../src/types.ts'

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
  it('rechecks component versions when a model participant joins an in-flight discovery', async () => {
    const { ctx } = await officialHarness()
    await ctx.awiki.refreshUpdatePolicy()
    let finishOld!: (value: Response) => void
    let count = 0
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const origin = new URL(input instanceof Request ? input.url : input.toString()).origin
      if (++count === 1) return new Promise<Response>(resolve => { finishOld = resolve })
      return bundledPolicy(origin)
    }))
    const first = ctx.awiki.refreshUpdatePolicy()
    const cancelled = first.catch(() => undefined)
    expect(ctx.awiki.refreshUpdatePolicy()).toBe(first)
    const remove = ctx.awiki.registerTenantLifecycleParticipant({
      component: { product: 'dsh-awiki-model-proxy', version: '0.1.5' }, prepareSwitch() {},
    })
    try {
      await expect(ctx.awiki.refreshUpdatePolicy()).resolves.toMatchObject({ currentModelProxyVersion: '0.1.5', modelProxyRestricted: true })
      finishOld(bundledPolicy('https://awiki.me'))
      await cancelled
      expect(ctx.awiki.getUpdatePolicyStatus().modelProxyRestricted).toBe(true)
    } finally { remove() }
    expect(ctx.awiki.getUpdatePolicyStatus().currentModelProxyVersion).toBeUndefined()
  })

  it('never revives an old tenant policy after A → B → A', async () => {
    const { ctx } = await officialHarness()
    await ctx.awiki.refreshUpdatePolicy()
    let finishOld!: (value: Response) => void
    let first = true
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(input instanceof Request ? input.url : input.toString())
      if (first && url.searchParams.get('client_platform') === 'dsh') {
        first = false
        return new Promise<Response>(resolve => { finishOld = resolve })
      }
      return bundledPolicy(url.origin)
    }))
    const pending = ctx.awiki.refreshUpdatePolicy().catch(() => undefined)
    await ctx.awiki.switchTenant(AWIKI_GLOBAL_TENANT_ID)
    await ctx.awiki.switchTenant(AWIKI_CHINA_TENANT_ID)
    await ctx.awiki.refreshUpdatePolicy()
    finishOld(bundledPolicy('https://awiki.me', '9.9.9', 99))
    await pending
    await expect(ctx.awiki.refreshUpdatePolicy()).resolves.toMatchObject({ tenantId: AWIKI_CHINA_TENANT_ID, policyRevision: 3, restricted: false })
  })

  it('waits for the target Core to become ready and rejects destructive actions during the transition', async () => {
    const harness = await officialHarness()
    await harness.providerFiber.dispose()
    let ready!: () => void
    let releaseClient: (() => Promise<void>) | undefined
    releaseClient = harness.ctx.awiki.registerClientFactory(options => {
      const client = Object.create(harness.client) as typeof harness.client
      client.getIdentity = options.userServiceDomain === 'awiki.ai'
        ? () => new Promise(resolve => { ready = () => resolve(null) })
        : async () => null
      return client
    })
    try {
      const switching = harness.ctx.awiki.switchTenant(AWIKI_GLOBAL_TENANT_ID)
      await vi.waitFor(() => expect(ready).toBeTypeOf('function'))
      expect(harness.ctx.awiki.getTenantRegistryView()).toMatchObject({ activeTenantId: AWIKI_CHINA_TENANT_ID, switching: true })
      await expect(harness.ctx.awiki.clearLocalData({ confirmation: AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION }))
        .resolves.toMatchObject({ ok: false, error: { code: 'conflict' } })
      ready()
      await switching
      expect(harness.ctx.awiki.getTenantRegistryView()).toMatchObject({ activeTenantId: AWIKI_GLOBAL_TENANT_ID, switching: false })
    } finally { await releaseClient?.() }
  })

  it('rolls back an asynchronous native open failure without committing the target tenant', async () => {
    const harness = await officialHarness()
    await harness.providerFiber.dispose()
    const roots: string[] = []
    const release = harness.ctx.awiki.registerClientFactory(options => {
      roots.push(options.stateRoot)
      const client = Object.create(harness.client) as typeof harness.client
      client.getIdentity = async () => {
        if (options.userServiceDomain === 'awiki.ai') throw new Error('native open failed')
        return null
      }
      return client
    })
    try {
      await expect(harness.ctx.awiki.switchTenant(AWIKI_GLOBAL_TENANT_ID)).rejects.toThrow('previous tenant was restored')
      expect(harness.ctx.awiki.getTenantRegistryView()).toMatchObject({ activeTenantId: AWIKI_CHINA_TENANT_ID, generation: 0, switching: false })
      expect(roots).toHaveLength(3)
      expect(roots[2]).toBe(roots[0])
      await expect(harness.ctx.awiki.getSession()).resolves.toMatchObject({ ok: true, value: { status: 'unregistered' } })
    } finally { await release() }
  })
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

function bundledPolicy(origin: string, minimum = '0.3.0', revision = 3): Response {
  return Response.json({ schema_version: 1, services: {}, client_versions: {
    schema_version: 1, channel: 'stable', policy_origin: origin, policy_revision: revision,
    published_at: '2026-09-08T00:00:00Z', products: { dsh: { enabled: false, compatibility: {
      plugin: { recommended_version: '9.9.9', minimum_supported_version: minimum },
      model_proxy: { recommended_version: '0.2.0', minimum_supported_version: '0.1.6' },
    } } },
  } })
}
