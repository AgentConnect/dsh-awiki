import { describe, expect, it, vi } from 'vitest'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import { AwikiSettingsController } from '../src/client/settings-controller.ts'
import { AWIKI_SETTINGS_RPC_ENDPOINTS as rpc } from '../src/settings-rpc-contract.ts'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

function bench() {
  let active = 'china'
  let generation = 0
  let failSwitch = false
  let failPolicy = false
  let latePolicy: ReturnType<typeof deferred<unknown>> | undefined
  let lateDesktop: ReturnType<typeof deferred<unknown>> | undefined
  const tenants = ['china', 'global'].map(id => ({ tenantId: id, storageScopeId: id, kind: 'built_in',
    displayName: id, backendBaseUrl: `https://${id}.example`, didHost: `${id}.example`, lifecycle: 'active', storageLayout: 'scope-v1' }))
  const view = () => ({ schemaVersion: 1, officialCatalogVersion: 1, activeTenantId: active, generation, switching: false, tenants: tenants.map(tenant => ({ ...tenant, lifecycle: tenant.tenantId === active ? 'active' : 'inactive' })) })
  const policy = () => ({ tenantId: active, policyOrigin: `https://${active}.example`, tenantGeneration: generation,
    currentPluginVersion: '0.3.9', offline: failPolicy, usedCache: failPolicy, policyUnavailable: false,
    restricted: active === 'china', modelProxyRestricted: false, checkState: failPolicy ? 'failed' : 'ready',
    upgradeCommand: `dsh plugin add @awiki/dsh-plugin@${active === 'china' ? '0.4.0' : '0.3.9'}` })
  const desktop = { schemaVersion: 1, distributionId: 'awiki-dsh-desktop', currentVersion: '2.1.0-rc.7',
    channel: 'prerelease', downloadPageUrl: 'https://awiki.me/downloads/dsh-awiki/', state: 'ready',
    latestVersion: '2.1.0', updateAvailable: true, usedCache: false }
  const call = vi.fn(async (_channel: string, endpoint: string, payload: { tenantId?: string }) => {
    if (endpoint === rpc.describe) return { ok: true, value: { value: { domain: 'china.example' }, base: { domain: 'china.example' }, revision: 0, writable: true } }
    if (endpoint === rpc.describeTenants) return { ok: true, value: view() }
    if (endpoint === rpc.describeDesktopUpdate) return { ok: true, value: desktop }
    if (endpoint === rpc.refreshDesktopUpdate) {
      if (lateDesktop !== undefined) { const pending = lateDesktop; lateDesktop = undefined; return pending.promise }
      return { ok: true, value: desktop }
    }
    if (endpoint === rpc.switchTenant) {
      if (failSwitch) return { ok: false, error: { message: 'previous tenant was restored' } }
      active = payload.tenantId!; generation++
      return { ok: true, value: view() }
    }
    if (endpoint === rpc.refreshUpdatePolicy && latePolicy !== undefined) {
      const pending = latePolicy; latePolicy = undefined; return pending.promise
    }
    if (endpoint === rpc.refreshUpdatePolicy || endpoint === rpc.describeUpdatePolicy) return { ok: true, value: policy() }
    throw new Error(`unexpected endpoint ${endpoint}`)
  })
  const controller = new AwikiSettingsController({ isLoopback: true, rpc: { call },
    generation: { subscribe: () => () => {} } } as unknown as ConnectionHandle)
  return { controller, desktop, policy, setFailure: () => { failSwitch = true; failPolicy = true },
    delayPolicy: () => { latePolicy = deferred(); return latePolicy },
    delayDesktop: () => { lateDesktop = deferred(); return lateDesktop } }
}

describe('tenant requirements and distribution update isolation', () => {
  it('mounts settings with the cached gate while initial network discovery is still pending', async () => {
    const b = bench()
    const pending = b.delayPolicy()
    try {
      await b.controller.load()
      expect(b.controller.getSnapshot().status).toBe('ready')
      expect(b.controller.getTenantSnapshot()).toMatchObject({ updateStatus: 'loading', update: { restricted: true } })
      pending.resolve({ ok: true, value: b.policy() })
      await vi.waitFor(() => expect(b.controller.getTenantSnapshot().updateStatus).toBe('ready'))
    } finally { b.controller.dispose() }
  })

  it('discards the first A result after A → B → A, while completing an independent Desktop query', async () => {
    const b = bench()
    try {
      await b.controller.load()
      const delayed = b.delayPolicy()
      const desktop = b.delayDesktop()
      const old = b.controller.refreshUpdatePolicy()
      const switchB = b.controller.switchTenant('global')
      expect(b.controller.getTenantSnapshot().update).toBeUndefined()
      expect(b.controller.getTenantSnapshot().desktop).toEqual(b.desktop)
      await switchB
      expect(b.controller.getTenantSnapshot().update?.restricted).toBe(false)
      await b.controller.switchTenant('china')
      expect(b.controller.getTenantSnapshot().update?.restricted).toBe(true)
      delayed.resolve({ ok: true, value: { ...b.policy(), upgradeCommand: 'stale command', restricted: false } })
      desktop.resolve({ ok: true, value: { ...b.desktop, latestVersion: '2.2.0' } })
      await old
      expect(b.controller.getTenantSnapshot().update?.upgradeCommand).not.toBe('stale command')
      expect(b.controller.getTenantSnapshot().update?.restricted).toBe(true)
      expect(b.controller.getTenantSnapshot().desktop?.latestVersion).toBe('2.2.0')
    } finally { b.controller.dispose() }
  })

  it('restores only the previous tenant cached restriction and command after rollback and a failed check', async () => {
    const b = bench()
    try {
      await b.controller.load()
      b.setFailure()
      await expect(b.controller.switchTenant('global')).rejects.toThrow('previous tenant was restored')
      expect(b.controller.getTenantSnapshot()).toMatchObject({ value: { activeTenantId: 'china', switching: false },
        update: { tenantId: 'china', restricted: true, usedCache: true, checkState: 'failed' }, desktop: b.desktop })
      expect(b.controller.getTenantSnapshot().update?.upgradeCommand).toContain('0.4.0')
    } finally { b.controller.dispose() }
  })
})
