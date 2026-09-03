import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context, Service } from '@deepseek-ai/cordis'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ConnectionRpcHandler } from '@deepseek-ai/dsh-client-connection'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import {
  SettingsProvider,
  settingsNamespace,
  type SettingsNamespace,
} from '@deepseek-ai/dsh-settings'
import AwikiService, {
  AWIKI_SETTINGS_NAMESPACE,
  DEFAULT_AWIKI_DOMAIN,
  type Config,
} from '../src/index.ts'
import type { AwikiClientOptions } from '../src/provider-api.ts'
import { AWIKI_SETTINGS_RPC_CHANNEL, AWIKI_SETTINGS_RPC_ENDPOINTS } from '../src/settings-rpc-contract.ts'
import { createAwikiSettingsRpcHandler } from '../src/settings-rpc.ts'
import { FakeAwikiClient } from './harness.ts'

class MemorySettings extends SettingsProvider {
  readonly writable = true
  private readonly document: Record<string, unknown>

  constructor(ctx: Context, document: Record<string, unknown>) {
    super(ctx)
    this.document = structuredClone(document)
  }

  protected load(): Promise<Record<string, unknown>> {
    return Promise.resolve(structuredClone(this.document))
  }

  protected persist(ns: SettingsNamespace, section: Record<string, unknown>): Promise<void> {
    this.document[ns] = structuredClone(section)
    return Promise.resolve()
  }
}

class FakeConnection extends Service {
  readonly handle = vi.fn((_channel: string, _handler: ConnectionRpcHandler, _options: { authority: string }) => (
    () => Promise.resolve()
  ))
  readonly rpc = { handle: this.handle, intercept: vi.fn() }

  constructor(ctx: Context) {
    super(ctx, 'connection')
  }
}

let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
})

function config(overrides: Partial<Config> = {}): Config {
  return {
    userServiceUrl: 'https://users.awiki.example',
    messageServiceUrl: 'https://messages.awiki.example',
    messageServicePublicUrl: 'https://messages.awiki.example',
    messageServiceDid: 'did:wba:messages.awiki.example',
    stateRoot: '/tmp/awiki-settings-test',
    ...overrides,
  }
}

async function mount(document: Record<string, unknown>, overrides: Partial<Config> = {}) {
  const ctx = new Context()
  context = ctx
  const stateRoot = await mkdtemp(join(tmpdir(), 'awiki-settings-test-'))
  ctx.effect(() => () => rm(stateRoot, { recursive: true, force: true }), 'remove settings test state')
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(ApprovalService)
  await ctx.plugin(MemorySettings, document)
  await ctx.plugin(FakeConnection)
  await ctx.plugin(AwikiService, config({ stateRoot, ...overrides }))
  let options: AwikiClientOptions | undefined
  const client = new FakeAwikiClient()
  const providerPlugin = Object.assign((scope: Context) => {
    scope.effect(() => scope.awiki.registerClientFactory((value) => {
      options = value
      return client
    }))
  }, { inject: ['awiki'] })
  await ctx.plugin(providerPlugin)
  if (options === undefined) throw new Error('provider options were not captured')
  return { ctx, options, connection: ctx.get('connection') as unknown as FakeConnection }
}

describe('AWiki durable domain settings', () => {
  it('defaults new deployments to awiki.me and exposes a restart-scoped legacy namespace', async () => {
    const mounted = await mount({})
    expect(mounted.options.userServiceDomain).toBe(DEFAULT_AWIKI_DOMAIN)
    expect(mounted.ctx.settings.describe()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ns: AWIKI_SETTINGS_NAMESPACE,
        value: { domain: DEFAULT_AWIKI_DOMAIN },
        base: { domain: DEFAULT_AWIKI_DOMAIN },
        applies: 'restart',
      }),
    ]))
    expect(mounted.connection.handle).toHaveBeenCalledWith(
      AWIKI_SETTINGS_RPC_CHANNEL,
      expect.any(Function),
      { authority: 'loopback' },
    )
  })

  it('uses a persisted override on startup but leaves the active client stable until restart', async () => {
    const mounted = await mount({ awiki: { domain: 'team.example' } })
    expect(mounted.options.userServiceDomain).toBe('team.example')

    await mounted.ctx.settings.update(settingsNamespace(AWIKI_SETTINGS_NAMESPACE), { domain: 'next.example' })
    expect(mounted.ctx.settings.get(settingsNamespace(AWIKI_SETTINGS_NAMESPACE))).toEqual({ domain: 'next.example' })
    expect(mounted.options.userServiceDomain).toBe('team.example')
  })

  it('rejects a malformed domain before it can be persisted', async () => {
    const mounted = await mount({})
    await expect(mounted.ctx.settings.update(
      settingsNamespace(AWIKI_SETTINGS_NAMESPACE),
      { domain: 'https://awiki.ai' },
    )).rejects.toThrow('valid DNS domain')
    expect(mounted.ctx.settings.get(settingsNamespace(AWIKI_SETTINGS_NAMESPACE))).toEqual({ domain: DEFAULT_AWIKI_DOMAIN })
  })

  it('reads, writes, resets, and revision-fences the plugin-owned RPC view', async () => {
    const mounted = await mount({})
    const handler = mounted.connection.handle.mock.calls[0]?.[1]
    if (handler === undefined) throw new Error('AWiki settings handler was not registered')
    const signal = new AbortController().signal

    await expect(handler(AWIKI_SETTINGS_RPC_ENDPOINTS.describe, {}, signal)).resolves.toEqual({
      ok: true,
      value: {
        value: { domain: 'awiki.me' },
        base: { domain: 'awiki.me' },
        revision: 0,
        writable: true,
      },
    })
    await expect(handler(AWIKI_SETTINGS_RPC_ENDPOINTS.setDomain, {
      domain: 'team.example', expectedRevision: 0,
    }, signal)).resolves.toMatchObject({
      ok: true,
      value: { value: { domain: 'team.example' }, user: { domain: 'team.example' }, revision: 1 },
    })
    await expect(handler(AWIKI_SETTINGS_RPC_ENDPOINTS.setDomain, {
      domain: 'stale.example', expectedRevision: 0,
    }, signal)).resolves.toMatchObject({
      ok: false,
      error: { code: 'settings-conflict', details: { ns: 'awiki', expected: 0, actual: 1 } },
    })
    await expect(handler(AWIKI_SETTINGS_RPC_ENDPOINTS.resetDomain, {
      expectedRevision: 1,
    }, signal)).resolves.toMatchObject({
      ok: true,
      value: { value: { domain: 'awiki.me' }, user: {}, revision: 2 },
    })
  })

  it('fails closed for malformed, cancelled, and provider-missing requests', async () => {
    const mounted = await mount({})
    const handler = mounted.connection.handle.mock.calls[0]?.[1]
    if (handler === undefined) throw new Error('AWiki settings handler was not registered')
    const signal = new AbortController().signal

    await expect(handler(AWIKI_SETTINGS_RPC_ENDPOINTS.setDomain, {
      domain: 'https://awiki.ai', expectedRevision: 0,
    }, signal)).resolves.toMatchObject({ ok: false, error: { code: 'bad-request' } })
    await expect(handler('unknown', {}, signal)).resolves.toMatchObject({
      ok: false, error: { code: 'bad-request' },
    })

    const cancelled = new AbortController()
    cancelled.abort()
    await expect(handler(AWIKI_SETTINGS_RPC_ENDPOINTS.describe, {}, cancelled.signal)).resolves.toMatchObject({
      ok: false, error: { code: 'cancelled' },
    })
    const unavailable = createAwikiSettingsRpcHandler(() => undefined)
    await expect(unavailable(AWIKI_SETTINGS_RPC_ENDPOINTS.describe, {}, signal)).resolves.toMatchObject({
      ok: false, error: { code: 'settings-rejected', details: { ns: 'awiki' } },
    })
  })
})
