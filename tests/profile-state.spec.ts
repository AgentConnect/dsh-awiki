import { Context } from '@deepseek-ai/cordis'
import { pathToFileURL } from 'node:url'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveAwikiProfileName, resolveAwikiStateRoot } from '../src/profile-state.ts'

describe('AWiki profile-scoped state', () => {
  const dshHome = '/tmp/dsh-awiki-profile-state'

  it('uses the immutable Desktop profile service as the authoritative identity', () => {
    const ctx = new Context()
    ctx.baseUrl = pathToFileURL(join(dshHome, 'profiles', 'web')).href
    ctx.provide('desktopProfiles', { current: { name: 'desktop' } })

    expect(resolveAwikiProfileName(ctx, dshHome)).toBe('desktop')
    expect(resolveAwikiStateRoot(ctx, dshHome)).toBe(join(dshHome, 'awiki', 'desktop', 'im-core'))
  })

  it('isolates ordinary DSH profiles from the exact Loader profile directory', () => {
    const web = new Context()
    web.baseUrl = pathToFileURL(join(dshHome, 'profiles', 'web')).href
    const work = new Context()
    work.baseUrl = pathToFileURL(join(dshHome, 'profiles', 'work')).href

    expect(resolveAwikiStateRoot(web, dshHome)).toBe(join(dshHome, 'awiki', 'web', 'im-core'))
    expect(resolveAwikiStateRoot(work, dshHome)).toBe(join(dshHome, 'awiki', 'work', 'im-core'))
    expect(resolveAwikiStateRoot(web, dshHome)).not.toBe(resolveAwikiStateRoot(work, dshHome))
  })

  it('keeps the legacy root when the runtime does not prove a profile identity', () => {
    const ctx = new Context()
    ctx.baseUrl = pathToFileURL(join(dshHome, 'somewhere-else')).href

    expect(resolveAwikiProfileName(ctx, dshHome)).toBeUndefined()
    expect(resolveAwikiStateRoot(ctx, dshHome)).toBe(join(dshHome, 'awiki', 'im-core'))
  })

  it('fails loud when Desktop exposes a malformed or traversal profile', () => {
    for (const name of ['', '.', '..', 'node_modules', '../web', 'team\\web']) {
      const ctx = new Context()
      ctx.provide('desktopProfiles', { current: { name } })
      expect(() => resolveAwikiStateRoot(ctx, dshHome)).toThrow('invalid profile name')
    }
  })

  it('does not mistake nested or sibling Loader roots for DSH profiles', () => {
    for (const directory of [
      join(dshHome, 'profiles', 'web', 'nested'),
      join(dshHome, 'other-profiles', 'web'),
      join(dshHome, 'profiles'),
    ]) {
      const ctx = new Context()
      ctx.baseUrl = pathToFileURL(directory).href
      expect(resolveAwikiStateRoot(ctx, dshHome)).toBe(join(dshHome, 'awiki', 'im-core'))
    }
  })
})
