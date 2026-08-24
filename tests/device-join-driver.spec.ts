import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const driver = join(process.cwd(), 'scripts/device-join-e2e.mjs')

describe('DSH Device Join system driver', () => {
  it('fails closed before startup when any write target resolves to production awiki.ai', () => {
    const result = spawnSync(process.execPath, [driver], {
      input: `${JSON.stringify({
        stateRoot: '/tmp/dsh-device-join-test', didDomain: 'awiki.ai',
        userServiceUrl: 'https://awiki.ai', messageServiceUrl: 'https://awiki.ai',
        messageServicePublicUrl: 'https://awiki.ai', messageServiceDid: 'did:wba:awiki.ai',
      })}\n`,
      encoding: 'utf8',
    })
    expect(result.status).toBe(1)
    expect(JSON.parse(result.stdout.trim())).toEqual({ ok: false, code: 'unsafe_target' })
  })

  it('accepts secrets only over stdin and never prints command payloads', () => {
    const source = readFileSync(driver, 'utf8')
    expect(source).not.toMatch(/process\.argv|console\./u)
    expect(source).not.toContain('DEV_OTP')
  })

  it('boots the independent identity plugin before applying the AWiki provider', () => {
    const source = readFileSync(driver, 'utf8')
    const identityPlugin = source.indexOf('await ctx.plugin(AnpIdentityService')
    const identityProvider = source.indexOf('applyAnpIdentityProvider(ctx')
    const awikiProvider = source.indexOf('applyProvider(ctx)')
    expect(identityPlugin).toBeGreaterThan(-1)
    expect(identityProvider).toBeGreaterThan(identityPlugin)
    expect(awikiProvider).toBeGreaterThan(identityProvider)
  })
})
