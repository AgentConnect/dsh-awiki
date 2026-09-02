import { afterEach, describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { setup } from './harness.ts'

let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
})

describe('AWiki applied identity recovery Mail continuity', () => {
  it('restores the historical mailbox on first use', async () => {
    const harness = await setup()
    context = harness.ctx

    const result = await harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })

    expect(result).toMatchObject({ ok: true, value: { phase: 'applied' } })
    expect(harness.client.mailAccountCalls).toBe(1)
  })

  it('keeps an applied Human recovery active when optional Mail is unavailable', async () => {
    const harness = await setup()
    context = harness.ctx
    harness.client.getMailAccount = () => Promise.reject(new Error('private mail failure'))

    await expect(harness.ctx.awiki.activateRecovery({ operationId: 'recovery-1' })).resolves.toMatchObject({
      ok: true,
      value: { phase: 'applied' },
    })
    await expect(harness.ctx.awiki.getSession()).resolves.toMatchObject({
      ok: true,
      value: { status: 'active' },
    })
  })
})
