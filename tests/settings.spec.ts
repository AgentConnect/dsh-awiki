import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
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
    statePath: '/tmp/awiki-settings-test.json',
    ...overrides,
  }
}

async function mount(document: Record<string, unknown>, overrides: Partial<Config> = {}) {
  const ctx = new Context()
  context = ctx
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(ApprovalService)
  await ctx.plugin(MemorySettings, document)
  await ctx.plugin(AwikiService, config(overrides))
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
  return { ctx, options }
}

describe('AWiki durable domain settings', () => {
  it('defaults new deployments to awiki.ai and exposes a restart-scoped namespace', async () => {
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
    expect(mounted.ctx.settings.get(settingsNamespace(AWIKI_SETTINGS_NAMESPACE))).toEqual({ domain: 'awiki.ai' })
  })
})
