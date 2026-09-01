import { describe, expect, it, vi } from 'vitest'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import { AwikiSettingsController } from '../src/client/settings-controller.ts'
import {
  AWIKI_SETTINGS_RPC_CHANNEL,
  AWIKI_SETTINGS_RPC_ENDPOINTS,
  type AwikiSettingsRpcView,
  type AwikiTenantRpcView,
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

function connection(
  call: ReturnType<typeof vi.fn>,
  isLoopback = true,
) {
  let hostDescriptionListener: (() => void) | undefined
  const disposeHostDescription = vi.fn()
  const value = {
    isLoopback,
    rpc: { call },
    hostDescription: {
      getSnapshot: () => undefined,
      subscribe: vi.fn((listener: () => void) => {
        hostDescriptionListener = listener
        return disposeHostDescription
      }),
    },
  } as unknown as ConnectionHandle
  return {
    value,
    reconnect: () => hostDescriptionListener?.(),
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
    const call = vi.fn()
      .mockResolvedValueOnce({ ok: true, value: initialView })
      .mockResolvedValueOnce({ ok: true, value: tenantView })
      .mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'settings-conflict',
          message: 'conflict',
          details: { ns: 'awiki', expected: 0, actual: 3 },
        },
      })
      .mockResolvedValueOnce({ ok: true, value: winner })
      .mockResolvedValueOnce({ ok: true, value: tenantView })
    const local = connection(call)
    const controller = new AwikiSettingsController(local.value)

    await controller.load()
    await expect(controller.set('domain', 'mine.example')).rejects.toThrow('rejected')
    expect(controller.getSnapshot()).toMatchObject({
      status: 'ready', value: { domain: 'other.example' }, user: { domain: 'other.example' }, revision: 3,
    })
    expect(call).toHaveBeenNthCalledWith(
      3,
      AWIKI_SETTINGS_RPC_CHANNEL,
      AWIKI_SETTINGS_RPC_ENDPOINTS.setDomain,
      { domain: 'mine.example', expectedRevision: 0 },
      expect.any(AbortSignal),
    )
    controller.dispose()
  })

  it('fails closed on malformed output and recovers on a later Host generation', async () => {
    const call = vi.fn()
      .mockResolvedValueOnce({ ok: true, value: { value: { domain: 'https://bad.example' } } })
      .mockResolvedValueOnce({ ok: true, value: tenantView })
      .mockResolvedValueOnce({ ok: true, value: initialView })
      .mockResolvedValueOnce({ ok: true, value: tenantView })
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
})
