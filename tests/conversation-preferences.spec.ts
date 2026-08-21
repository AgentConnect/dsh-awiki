import { lstat, mkdtemp, mkdir, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  AwikiConversationPreferenceStore,
  normalizeConversationPreferenceMutation,
} from '../src/conversation-preferences.ts'
import type { AwikiConversationId, AwikiDid } from '../src/types.ts'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-awiki-conversation-preferences-'))
  roots.push(root)
  return root
}

const owner = 'did:wba:alice' as AwikiDid
const conversation = {
  kind: 'group' as const,
  id: 'group:did:wba:team' as AwikiConversationId,
  groupDid: 'did:wba:team' as AwikiDid,
  title: 'Team',
  lastMessageAt: 10,
  lastMessagePreview: 'Release ready',
}

describe('AWiki conversation preferences', () => {
  it('persists owner-scoped hidden rows and recovery-notice acknowledgement atomically', async () => {
    const root = await temporaryRoot()
    const store = new AwikiConversationPreferenceStore(root)
    await expect(store.get(owner)).resolves.toEqual({ hiddenConversations: [] })

    await store.update(owner, { action: 'hide', conversation })
    await store.update(owner, { action: 'dismiss-group-recovery', signature: 'v1:0:1:deadbeef' })
    await expect(new AwikiConversationPreferenceStore(root).get(owner)).resolves.toMatchObject({
      hiddenConversations: [{ conversation }],
      dismissedGroupRecoverySignature: 'v1:0:1:deadbeef',
    })
    await expect(store.get('did:wba:other' as AwikiDid)).resolves.toEqual({ hiddenConversations: [] })

    await store.update(owner, { action: 'restore', conversationId: conversation.id })
    await expect(store.get(owner)).resolves.toEqual({
      hiddenConversations: [],
      dismissedGroupRecoverySignature: 'v1:0:1:deadbeef',
    })

    const directory = join(root, '.host', 'conversation-preferences')
    const files = await readdir(directory)
    expect(files).toHaveLength(1)
    if (process.platform !== 'win32') {
      expect((await lstat(join(root, '.host'))).mode & 0o777).toBe(0o700)
      expect((await lstat(directory)).mode & 0o777).toBe(0o700)
      expect((await lstat(join(directory, files[0]!))).mode & 0o777).toBe(0o600)
    }
    await store.clear()
    await expect(lstat(directory)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('rejects malformed browser mutations, corrupt files, and symlinked Host directories', async () => {
    expect(normalizeConversationPreferenceMutation({ action: 'restore', conversationId: '' })).toBeUndefined()
    expect(normalizeConversationPreferenceMutation({ action: 'hide', conversation: { kind: 'group' } })).toBeUndefined()
    expect(normalizeConversationPreferenceMutation({ action: 'dismiss-group-recovery', signature: 'x'.repeat(129) })).toBeUndefined()

    const root = await temporaryRoot()
    const store = new AwikiConversationPreferenceStore(root)
    await store.update(owner, { action: 'hide', conversation })
    const directory = join(root, '.host', 'conversation-preferences')
    const [file] = await readdir(directory)
    await writeFile(join(directory, file!), '{"version":2}', { mode: 0o600 })
    await expect(store.get(owner)).rejects.toThrow('conversation preferences')

    if (process.platform !== 'win32') {
      const linkedRoot = await temporaryRoot()
      const target = await temporaryRoot()
      await mkdir(target, { recursive: true })
      await symlink(target, join(linkedRoot, '.host'))
      await expect(new AwikiConversationPreferenceStore(linkedRoot).get(owner))
        .rejects.toThrow('conversation preferences')
    }
  })
})
