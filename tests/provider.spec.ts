import { afterEach, describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { lstat, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openImCoreNodeClient } from '@awiki/im-core-node'
import { apply } from '../src/provider.ts'
import { setup } from './harness.ts'

let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
})

describe('AWiki production provider', () => {
  it('opens Rust SDK 0.1.9 without Host-owned Vault material and disposes in its effect scope', async () => {
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

  it('keeps two profile roots open concurrently without sharing the IM Core lock', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-awiki-profile-locks-'))
    const common = {
      serviceBaseUrl: 'https://users.awiki.example',
      didDomain: 'awiki.example',
      userServiceEndpoint: 'https://users.awiki.example',
      messageServiceEndpoint: 'https://messages.awiki.example',
      mailServiceEndpoint: 'https://users.awiki.example',
      anpServiceEndpoint: 'https://messages.awiki.example',
      anpServiceDid: 'did:wba:messages.awiki.example',
      multiDeviceHandleRecoveryEnabled: true,
      multiDeviceAudience: 'awiki-user-service',
    } as const
    const [web, desktop] = await Promise.all([
      openImCoreNodeClient({ ...common, stateRoot: join(root, 'web', 'im-core') }),
      openImCoreNodeClient({ ...common, stateRoot: join(root, 'desktop', 'im-core') }),
    ])
    try {
      await expect(Promise.all([web.getDefaultIdentity(), desktop.getDefaultIdentity()]))
        .resolves.toEqual([null, null])
      await expect(lstat(join(root, 'web', 'im-core', 'vault', 'root-key.b64u')))
        .resolves.toMatchObject({})
      await expect(lstat(join(root, 'desktop', 'im-core', 'vault', 'root-key.b64u')))
        .resolves.toMatchObject({})
    } finally {
      await Promise.allSettled([web.close(), desktop.close()])
      await rm(root, { recursive: true, force: true })
    }
  })
})
