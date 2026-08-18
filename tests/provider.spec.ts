import { afterEach, describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { lstat } from 'node:fs/promises'
import { join } from 'node:path'
import { apply } from '../src/provider.ts'
import { setup } from './harness.ts'

let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
})

describe('AWiki production provider', () => {
  it('opens Rust SDK 0.1.4 without Host-owned Vault material and disposes in its effect scope', async () => {
    const harness = await setup()
    context = harness.ctx
    await harness.providerFiber.dispose()
    expect(() => {
      apply(harness.ctx)
    }).not.toThrow()
    await expect(harness.ctx.awiki.getIdentity()).resolves.toEqual({ ok: true, value: null })
    await expect(lstat(join(harness.options.stateRoot, '.host', 'vault-root-key')))
      .rejects.toMatchObject({ code: 'ENOENT' })
    expect((await lstat(join(harness.options.stateRoot, 'vault', 'root-key.b64u'))).isFile()).toBe(true)
  })
})
