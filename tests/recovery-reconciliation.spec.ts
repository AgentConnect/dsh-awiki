import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { setup } from './harness.ts'

let context: Context | undefined

afterEach(async () => {
  vi.unstubAllGlobals()
  await context?.fiber.dispose()
  context = undefined
})

describe('AWiki applied identity recovery reconciliation', () => {
  it('restores the historical mailbox on first use without requesting a model attestation when the model plugin is absent', async () => {
    const harness = await setup()
    context = harness.ctx

    const result = await harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })

    expect(result).toMatchObject({ ok: true, value: { phase: 'applied' } })
    expect(harness.client.mailAccountCalls).toBe(1)
    expect(harness.client.recoveryAttestationCalls).toBe(0)
    expect(JSON.stringify(result)).not.toContain(harness.client.recoveryAttestation)
  })

  it('posts one short-lived attestation through current-DID external auth and returns no token or ledger key', async () => {
    const harness = await setup()
    context = harness.ctx
    const disposeTarget = harness.ctx.awiki.registerRecoveryReconciliationTarget({
      kind: 'model-proxy-v1',
      baseURL: 'https://model.awiki.example',
    })
    const requests: Request[] = []
    const fetch = vi.fn(async (request: Request) => {
      requests.push(request)
      return new Response(JSON.stringify({ restored: true, idempotent: false }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    vi.stubGlobal('fetch', fetch)

    const result = await harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })

    expect(result).toMatchObject({ ok: true, value: { phase: 'applied' } })
    expect(harness.client.mailAccountCalls).toBe(1)
    expect(harness.client.recoveryAttestationCalls).toBe(1)
    expect(fetch).toHaveBeenCalledOnce()
    expect(requests[0]?.url).toBe('https://model.awiki.example/api/identity-recovery')
    expect(requests[0]?.headers.get('signature')).toBe('sig1=:fixture:')
    await expect(requests[0]!.clone().json()).resolves.toEqual({
      attestation: harness.client.recoveryAttestation,
    })
    expect(harness.client.externalHttpRequests).toHaveLength(1)
    expect(JSON.stringify(result)).not.toContain(harness.client.recoveryAttestation)
    expect(JSON.stringify(result)).not.toContain('canonical')
    disposeTarget()
  })

  it('keeps the recovered session active and retries the same idempotent operation after a temporary model failure', async () => {
    const harness = await setup()
    context = harness.ctx
    harness.ctx.awiki.registerRecoveryReconciliationTarget({
      kind: 'model-proxy-v1',
      baseURL: 'https://model.awiki.example',
    })
    let attempt = 0
    vi.stubGlobal('fetch', vi.fn(async () => {
      attempt += 1
      return attempt === 1
        ? new Response('temporarily unavailable', { status: 503 })
        : new Response(JSON.stringify({ restored: true, idempotent: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
    }))

    await expect(harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })).resolves.toEqual({
      ok: false,
      error: { code: 'remote', message: 'The AWiki service rejected the operation.' },
    })
    await expect(harness.ctx.awiki.getSession()).resolves.toMatchObject({
      ok: true,
      value: { status: 'active' },
    })
    await expect(harness.ctx.awiki.getRecoveryStatus({ operationId: 'recovery-1' })).resolves.toMatchObject({
      ok: true,
      value: { phase: 'applied' },
    })
    expect(harness.client.mailAccountCalls).toBe(2)
    expect(harness.client.recoveryAttestationCalls).toBe(2)
    expect(attempt).toBe(2)
  })

  it('attempts model restoration even when mailbox binding is temporarily unavailable', async () => {
    const harness = await setup()
    context = harness.ctx
    harness.client.getMailAccount = () => Promise.reject(new Error('private mail failure'))
    harness.ctx.awiki.registerRecoveryReconciliationTarget({
      kind: 'model-proxy-v1',
      baseURL: 'https://model.awiki.example',
    })
    const fetch = vi.fn(async () => new Response(JSON.stringify({ restored: true, idempotent: false }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetch)

    await expect(harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })).resolves.toMatchObject({
      ok: false,
      error: { code: 'remote' },
    })
    expect(harness.client.recoveryAttestationCalls).toBe(1)
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('rejects a success body that tries to return a canonical ledger identifier', async () => {
    const harness = await setup()
    context = harness.ctx
    harness.ctx.awiki.registerRecoveryReconciliationTarget({
      kind: 'model-proxy-v1',
      baseURL: 'https://model.awiki.example',
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      restored: true,
      idempotent: false,
      canonical_did: 'did:wba:private-ledger-owner',
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })))

    const result = await harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })

    expect(result).toMatchObject({ ok: false, error: { code: 'remote' } })
    expect(JSON.stringify(result)).not.toContain('private-ledger-owner')
  })

  it('rejects an oversized reconciliation response without retaining its private payload', async () => {
    const harness = await setup()
    context = harness.ctx
    harness.ctx.awiki.registerRecoveryReconciliationTarget({
      kind: 'model-proxy-v1',
      baseURL: 'https://model.awiki.example',
    })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      restored: true,
      idempotent: false,
      padding: 'private'.repeat(1_000),
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })))

    const result = await harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })

    expect(result).toMatchObject({ ok: false, error: { code: 'remote' } })
    expect(JSON.stringify(result)).not.toContain('private')
  })

  it('accepts only HTTPS or explicitly enabled loopback recovery targets and only one registration', async () => {
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
