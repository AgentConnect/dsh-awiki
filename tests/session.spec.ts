import { lstat, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { AwikiSessionStore } from '../src/session.ts'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('AWiki local session store', () => {
  it('persists sign-out across instances without touching sibling identity state', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-awiki-session-'))
    roots.push(root)
    const identity = join(root, 'identity-state')
    await writeFile(identity, 'preserved', { mode: 0o600 })

    const first = new AwikiSessionStore(root)
    expect(await first.isSignedOut()).toBe(false)
    await first.signOut()
    expect(await new AwikiSessionStore(root).isSignedOut()).toBe(true)
    expect(await readFile(identity, 'utf8')).toBe('preserved')
    if (process.platform !== 'win32') {
      expect((await lstat(join(root, '.host', 'signed-out'))).mode & 0o777).toBe(0o600)
    }

    await new AwikiSessionStore(root).signIn()
    expect(await first.isSignedOut()).toBe(false)
    expect(await readFile(identity, 'utf8')).toBe('preserved')
  })

  it('fails closed for a malformed marker', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-awiki-session-invalid-'))
    roots.push(root)
    const store = new AwikiSessionStore(root)
    await store.signOut()
    await writeFile(join(root, '.host', 'signed-out'), 'invalid', { mode: 0o600 })
    await expect(store.isSignedOut()).rejects.toThrow('awiki: local session marker is invalid')
  })

  it.runIf(process.platform !== 'win32')('rejects a symlinked Host directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-awiki-session-symlink-'))
    const target = await mkdtemp(join(tmpdir(), 'dsh-awiki-session-target-'))
    roots.push(root, target)
    await symlink(target, join(root, '.host'))
    await expect(new AwikiSessionStore(root).isSignedOut()).rejects.toThrow(
      'awiki: local session directory is invalid',
    )
  })
})
