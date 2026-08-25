import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { setup } from './harness.ts'

let context: Context | undefined

afterEach(async () => {
  vi.unstubAllGlobals()
  await context?.fiber.dispose()
  context = undefined
})

describe('AWiki applied identity recovery activation', () => {
  it('activates the recovered session without touching mailbox or model-account restoration', async () => {
    const harness = await setup()
    context = harness.ctx
    harness.client.getMailAccount = () => Promise.reject(new Error('mail restoration must stay disabled'))
    harness.ctx.awiki.registerRecoveryReconciliationTarget({
      kind: 'model-proxy-v1',
      baseURL: 'https://model.awiki.example',
    })
    const fetch = vi.fn(() => Promise.reject(new Error('model reconciliation must stay disabled')))
    vi.stubGlobal('fetch', fetch)

    await expect(harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })).resolves.toMatchObject({
      ok: true,
      value: { operationId: 'recovery-1', phase: 'applied' },
    })
    await expect(harness.ctx.awiki.getSession()).resolves.toMatchObject({
      ok: true,
      value: { status: 'active' },
    })
    expect(harness.client.mailAccountCalls).toBe(0)
    expect(harness.client.recoveryAttestationCalls).toBe(0)
    expect(harness.client.externalHttpRequests).toHaveLength(0)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('keeps applied status checks idempotent without restarting deferred account restoration', async () => {
    const harness = await setup()
    context = harness.ctx
    harness.ctx.awiki.registerRecoveryReconciliationTarget({
      kind: 'model-proxy-v1',
      baseURL: 'https://model.awiki.example',
    })
    const fetch = vi.fn(() => Promise.reject(new Error('model reconciliation must stay disabled')))
    vi.stubGlobal('fetch', fetch)

    await expect(harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })).resolves.toMatchObject({
      ok: true,
      value: { phase: 'applied' },
    })
    await expect(harness.ctx.awiki.getRecoveryStatus({ operationId: 'recovery-1' })).resolves.toMatchObject({
      ok: true,
      value: { phase: 'applied' },
    })
    await expect(harness.ctx.awiki.getRecoveryStatus({ operationId: 'recovery-1' })).resolves.toMatchObject({
      ok: true,
      value: { phase: 'applied' },
    })
    expect(harness.client.mailAccountCalls).toBe(0)
    expect(harness.client.recoveryAttestationCalls).toBe(0)
    expect(harness.client.externalHttpRequests).toHaveLength(0)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('finishes a resumed local transition without calling either deferred restoration service', async () => {
    const harness = await setup()
    context = harness.ctx
    harness.ctx.awiki.registerRecoveryReconciliationTarget({
      kind: 'model-proxy-v1',
      baseURL: 'https://model.awiki.example',
    })
    const fetch = vi.fn(() => Promise.reject(new Error('model reconciliation must stay disabled')))
    vi.stubGlobal('fetch', fetch)

    await expect(harness.ctx.awiki.resumeRecovery({ operationId: 'recovery-1' })).resolves.toMatchObject({
      ok: true,
      value: { operationId: 'recovery-1', phase: 'applied' },
    })
    await expect(harness.ctx.awiki.getSession()).resolves.toMatchObject({
      ok: true,
      value: { status: 'active' },
    })
    expect(harness.client.mailAccountCalls).toBe(0)
    expect(harness.client.recoveryAttestationCalls).toBe(0)
    expect(harness.client.externalHttpRequests).toHaveLength(0)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('retains strict target validation for compatibility while automatic use is disabled', async () => {
    const harness = await setup()
    context = harness.ctx
    expect(() => harness.ctx.awiki.registerRecoveryReconciliationTarget({
      kind: 'model-proxy-v1',
      baseURL: 'http://model.awiki.example',
    })).toThrow('must use HTTPS')
    expect(() => harness.ctx.awiki.registerRecoveryReconciliationTarget({
      kind: 'model-proxy-v1',
      baseURL: 'https://model.awiki.example?token=private',
    })).toThrow('must not contain a query')
    const dispose = harness.ctx.awiki.registerRecoveryReconciliationTarget({
      kind: 'model-proxy-v1',
      baseURL: 'https://model.awiki.example',
    })
    expect(() => harness.ctx.awiki.registerRecoveryReconciliationTarget({
      kind: 'model-proxy-v1',
      baseURL: 'https://other-model.awiki.example',
    })).toThrow('already registered')
    dispose()
    dispose()
  })
})
