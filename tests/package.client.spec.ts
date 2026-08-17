/** Package halves and invariant assembly checks in the Client face. */

import { Context } from '@deepseek-ai/cordis'
import { describe, expect, it } from 'vitest'
import InvariantRegistry from '@deepseek-ai/dsh-invariants'
import * as AwikiInvariant from '../src/invariant.ts'

describe('@awiki/dsh invariant companion', () => {
  it('registers and withdraws the explained-empty invariant companion', async () => {
    const ctx = new Context()
    await ctx.plugin(InvariantRegistry).await()
    expect(AwikiInvariant.name).toBe('awiki-invariant')
    expect(AwikiInvariant.inject).toEqual(['invariants'])
    const fiber = await ctx.plugin(AwikiInvariant)
    expect(() => ctx.invariants.register('@awiki/dsh', () => {})).toThrow(/already registered/u)
    await fiber.dispose()
    await expect(ctx.plugin(AwikiInvariant).await()).resolves.toBeDefined()
  })
})
