import { lstat, mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { AwikiListenerStateStore } from '../src/listener-state.ts'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-awiki-listener-state-'))
  roots.push(root)
  return root
}

describe('AWiki Agent listener state', () => {
  it('atomically persists identity-scoped peer routes, watermarks, and DSH session ids', async () => {
    const root = await temporaryRoot()
    const store = new AwikiListenerStateStore(root, 'did:awiki:owner-a')
    await expect(store.load()).resolves.toEqual({
      version: 2, identityScopeHash: store.identityScopeHash, conversations: {},
    })

    await store.save({
      version: 2,
      identityScopeHash: store.identityScopeHash,
      conversations: {
        'conversation-1': {
          peerDid: 'did:awiki:bob',
          sessionId: 'session-1',
          lastProcessedMessageId: 'message-1',
        },
      },
    })

    const reloaded = new AwikiListenerStateStore(root, 'did:awiki:owner-a')
    await expect(reloaded.load()).resolves.toEqual({
      version: 2,
      identityScopeHash: store.identityScopeHash,
      conversations: {
        'conversation-1': {
          peerDid: 'did:awiki:bob',
          sessionId: 'session-1',
          lastProcessedMessageId: 'message-1',
        },
      },
    })
    const path = join(root, '.host', 'listener-state.json')
    expect(await readFile(path, 'utf8')).not.toContain('prompt')
    expect(await readFile(path, 'utf8')).not.toContain('did:awiki:owner-a')
    if (process.platform !== 'win32') {
      expect((await lstat(path)).mode & 0o777).toBe(0o600)
      expect((await lstat(join(root, '.host'))).mode & 0o777).toBe(0o700)
    }
  })

  it('does not reuse routes across an identity replacement', async () => {
    const root = await temporaryRoot()
    const first = new AwikiListenerStateStore(root, 'did:awiki:owner-a')
    await first.save({
      version: 2,
      identityScopeHash: first.identityScopeHash,
      conversations: { 'conversation-1': { peerDid: 'did:awiki:bob', sessionId: 'session-1' } },
    })

    const replacement = new AwikiListenerStateStore(root, 'did:awiki:owner-b')
    await expect(replacement.load()).resolves.toEqual({
      version: 2, identityScopeHash: replacement.identityScopeHash, conversations: {},
    })
  })

  it('rejects malformed state and a symlinked Host directory', async () => {
    const root = await temporaryRoot()
    await mkdir(join(root, '.host'), { mode: 0o700 })
    await writeFile(join(root, '.host', 'listener-state.json'), '{"version":2}', { mode: 0o600 })
    await expect(new AwikiListenerStateStore(root, 'did:awiki:owner').load()).rejects.toThrow('listener state')

    if (process.platform !== 'win32') {
      const linkedRoot = await temporaryRoot()
      const target = await temporaryRoot()
      await symlink(target, join(linkedRoot, '.host'))
      await expect(new AwikiListenerStateStore(linkedRoot, 'did:awiki:owner').load()).rejects.toThrow('local session directory')
    }
  })
})
