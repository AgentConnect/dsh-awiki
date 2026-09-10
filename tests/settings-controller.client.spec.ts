import { describe, expect, it, vi } from 'vitest'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import { AwikiSettingsController } from '../src/client/settings-controller.ts'
import {
  AWIKI_SETTINGS_RPC_CHANNEL,
  AWIKI_SETTINGS_RPC_ENDPOINTS,
  type AwikiSettingsRpcView,
  type AwikiTenantRpcView,
  type AwikiUpdatePolicyRpcView,
} from '../src/settings-rpc-contract.ts'

const initialView: AwikiSettingsRpcView = {
  value: { domain: 'awiki.me' },
  base: { domain: 'awiki.me' },
  revision: 0,
  writable: true,
}

const tenantView: AwikiTenantRpcView = {
  schemaVersion: 1,
  officialCatalogVersion: 1,
  generation: 0,
  activeTenantId: 'official-china',
  switching: false,
  tenants: [{
    tenantId: 'official-china',
    storageScopeId: 'official-china-v1',
    kind: 'built_in',
    displayName: 'AWiki China',
    backendBaseUrl: 'https://awiki.me',
    didHost: 'awiki.me',
    lifecycle: 'active',
    storageLayout: 'scope-v1',
  }],
}

const updateView: AwikiUpdatePolicyRpcView = {
  tenantId: 'official-china',
  policyOrigin: 'https://awiki.me',
  tenantGeneration: 0,
  currentPluginVersion: '0.3.7',
  offline: false,
  usedCache: false,
  policyUnavailable: true,
  restricted: false,
  modelProxyRestricted: false,
}

function connection(
  call: ReturnType<typeof vi.fn>,
  isLoopback = true,
) {
  let generationListener: (() => void) | undefined
  const disposeHostDescription = vi.fn()
  const value = {
    isLoopback,
    rpc: { call: (...args: unknown[]) => args[1] === AWIKI_SETTINGS_RPC_ENDPOINTS.describeDesktopUpdate
      ? Promise.resolve({ ok: true, value: null }) : call(...args) },
    generation: {
      getSnapshot: () => undefined,
      subscribe: vi.fn((listener: () => void) => {
        generationListener = listener
        return disposeHostDescription
      }),
    },
  } as unknown as ConnectionHandle
  return {
    value,
    reconnect: () => generationListener?.(),
    disposeHostDescription,
  }
}

describe('AWiki plugin-owned settings controller', () => {
  it('never calls or writes the local Host channel from a non-loopback page', async () => {
    const call = vi.fn()
    const remote = connection(call, false)
    const controller = new AwikiSettingsController(remote.value)

    await controller.load()
    expect(controller.getSnapshot()).toMatchObject({ status: 'unavailable', mode: 'memory', writable: false })
    await expect(controller.set('domain', 'team.example')).rejects.toThrow('not writable')
    expect(call).not.toHaveBeenCalled()
    controller.dispose()
  })

  it('reloads the winning Host value after an optimistic revision conflict', async () => {
    const winner: AwikiSettingsRpcView = {
      ...initialView,
      value: { domain: 'other.example' },
      user: { domain: 'other.example' },
      revision: 3,
    }
    let reads = 0
    const call = vi.fn(async (_channel: string, endpoint: string) => {
      if (endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.describe) return { ok: true, value: ++reads === 1 ? initialView : winner }
      if (endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.describeTenants) return { ok: true, value: tenantView }
      if (endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.setDomain) return { ok: false, error: { code: 'settings-conflict', message: 'conflict', details: { ns: 'awiki', expected: 0, actual: 3 } } }
      return { ok: true, value: updateView }
    })
    const local = connection(call)
    const controller = new AwikiSettingsController(local.value)

    await controller.load()
    await expect(controller.set('domain', 'mine.example')).rejects.toThrow('rejected')
    expect(controller.getSnapshot()).toMatchObject({
      status: 'ready', value: { domain: 'other.example' }, user: { domain: 'other.example' }, revision: 3,
    })
    expect(call).toHaveBeenCalledWith(
      AWIKI_SETTINGS_RPC_CHANNEL,
      AWIKI_SETTINGS_RPC_ENDPOINTS.setDomain,
      { domain: 'mine.example', expectedRevision: 0 },
      expect.any(AbortSignal),
    )
    controller.dispose()
  })

  it('fails closed on malformed output and recovers on a later Host generation', async () => {
    let reads = 0
    const call = vi.fn(async (_channel: string, endpoint: string) => {
      if (endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.describe) return { ok: true, value: ++reads === 1 ? { value: { domain: 'https://bad.example' } } : initialView }
      if (endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.describeTenants) return { ok: true, value: tenantView }
      return { ok: true, value: updateView }
    })
    const local = connection(call)
    const controller = new AwikiSettingsController(local.value)

    await controller.load()
    expect(controller.getSnapshot()).toMatchObject({ status: 'unavailable', mode: 'host', writable: false })
    local.reconnect()
    await vi.waitFor(() => {
      expect(controller.getSnapshot()).toMatchObject({
        status: 'ready', value: { domain: 'awiki.me' }, revision: 0, writable: true,
      })
    })

    controller.dispose()
    expect(local.disposeHostDescription).toHaveBeenCalledOnce()
    expect(call.mock.calls.every((entry) => entry[0] === AWIKI_SETTINGS_RPC_CHANNEL)).toBe(true)
  })
  it('batches ordered domain mutations into one write and preserves an explicit stale revision', async () => {
    const current = { ...initialView, revision: 7 }
    const call = vi.fn(async (_channel: string, endpoint: string) => {
      if (endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.describe) return { ok: true, value: current }
      if (endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.describeTenants) return { ok: true, value: tenantView }
      if (endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.setDomain) return { ok: false, error: { code: 'settings-conflict', message: 'conflict', details: {} } }
      return { ok: true, value: updateView }
    })
    const controller = new AwikiSettingsController(connection(call).value)
    await controller.load()
    call.mockClear()
    await expect(controller.mutate([
      { op: 'set', path: ['domain'], value: 'first.example' },
      { op: 'unset', path: ['domain'] },
      { op: 'set', path: ['domain'], value: 'last.example' },
    ], 3)).rejects.toThrow('rejected')
    const writes = call.mock.calls.filter(entry => entry[1] === AWIKI_SETTINGS_RPC_ENDPOINTS.setDomain || entry[1] === AWIKI_SETTINGS_RPC_ENDPOINTS.resetDomain)
    expect(writes).toHaveLength(1)
    expect(writes[0]).toEqual([AWIKI_SETTINGS_RPC_CHANNEL, AWIKI_SETTINGS_RPC_ENDPOINTS.setDomain, { domain: 'last.example', expectedRevision: 3 }, expect.any(AbortSignal)])
    expect(controller.getSnapshot().revision).toBe(7)
    call.mockClear()
    await expect(controller.mutate([{ op: 'set', path: ['other'], value: 'bad' }] as never)).rejects.toThrow('only supports domain')
    await controller.mutate([])
    expect(call).not.toHaveBeenCalled()
    controller.dispose()
  })

})
