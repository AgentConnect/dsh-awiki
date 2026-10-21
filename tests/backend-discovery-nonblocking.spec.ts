import { afterEach, describe, expect, it, vi } from 'vitest'
import { setup } from './harness.ts'
import type { AwikiSdkClient } from '../src/provider-api.ts'
import type { Context } from '@deepseek-ai/cordis'

let context: Context | undefined
afterEach(async () => { await context?.fiber.dispose(); context = undefined; vi.unstubAllGlobals() })

describe('discovery stays outside local product reads', () => {
  it('returns config and local identity while both discovery sources are held', async () => {
    const releases: Array<() => void> = []
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => releases.push(() => resolve(new Response('{}'))))))
    const harness = await setup()
    context = harness.ctx
    const client = harness.client as AwikiSdkClient
    client.backendCapabilities = vi.fn(() => new Promise(resolve => releases.push(() => resolve({ status: 'unavailable', capabilities: {} }))))
    try {
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('local read waited for discovery')), 250))
      const result = await Promise.race([Promise.all([harness.ctx.awiki.getConfig(), harness.ctx.awiki.getSession()]), timeout])
      expect(result).toMatchObject([{ ok: true }, { ok: true }])
    } finally { for (const release of releases) release() }
  })
  it('does not let an older query reopen a source disabled by its subscription', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')))
    const harness = await setup()
    context = harness.ctx
    const client = harness.client as AwikiSdkClient
    const queries: Array<() => void> = []
    const updates = new Map<boolean, (value: any) => void>()
    client.subscribeBackendCapabilities = vi.fn(async local => ({
      nextUpdate: () => new Promise(resolve => updates.set(local, resolve)),
      stop: () => { updates.get(local)?.(null); updates.delete(local) },
    }))
    client.backendCapabilities = vi.fn(local => new Promise(resolve => queries.push(() => resolve({ status: 'confirmed', capabilities: local ? { direct: { support: 'supported' } } : { 'services.mail': { support: 'supported' } } }))))
    await harness.ctx.awiki.getConfig()
    await vi.waitFor(() => expect(updates.has(false)).toBe(true))
    updates.get(false)!({ snapshot: { status: 'confirmed', capabilities: { 'services.mail': { support: 'unsupported' } } } })
    await vi.waitFor(async () => expect(await harness.ctx.awiki.getConfig()).toMatchObject({ ok: true, value: { serverFeatures: { 'services.mail': 'unsupported' } } }))
    for (const release of queries) release()
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(await harness.ctx.awiki.getConfig()).toMatchObject({ ok: true, value: { serverFeatures: { 'services.mail': 'unsupported' } } })
    // Complete any ordinary read started by the last assertion before disposal.
    for (const release of queries) release()
  })
  it('keeps successful public and message projections independently on failed refresh', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')))
    const harness = await setup()
    context = harness.ctx
    const client = harness.client as AwikiSdkClient
    let messageFails = false
    let publicFails = false
    client.backendCapabilities = vi.fn(async (local) => {
      if (local ? messageFails : publicFails) throw new Error('offline')
      return { status: 'confirmed', capabilities: local ? { direct: { support: 'supported' } } : { 'services.mail': { support: 'supported' } } }
    })
    await vi.waitFor(async () => { expect(await harness.ctx.awiki.getConfig()).toMatchObject({ ok: true, value: { serverFeatures: { direct: 'supported', 'services.mail': 'supported' } } }) })
    messageFails = true
    publicFails = true
    await harness.ctx.awiki.getConfig()
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(await harness.ctx.awiki.getConfig()).toMatchObject({ ok: true, value: { serverFeatures: { direct: 'supported', 'services.mail': 'supported' } } })
  })
})
