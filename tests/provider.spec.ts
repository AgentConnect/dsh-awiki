import { afterEach, describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { apply } from '../src/provider.ts'
import { setup } from './harness.ts'

let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
})

describe('AWiki production provider', () => {
  it('registers the versioned Rust SDK adapter in its owning effect scope', async () => {
    const harness = await setup()
    context = harness.ctx
    await harness.providerFiber.dispose()
    expect(() => {
      apply(harness.ctx)
    }).not.toThrow()
    await expect(harness.ctx.awiki.getIdentity()).resolves.toEqual({ ok: true, value: null })
  })
})
