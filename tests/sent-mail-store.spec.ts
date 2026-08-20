import { lstat, mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { AwikiSentMailStore, LOCAL_SENT_MAIL_ID_PREFIX } from '../src/sent-mail-store.ts'
import type { AwikiDid, AwikiMailMessageId } from '../src/types.ts'

const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'dsh-awiki-sent-mail-'))
  roots.push(root)
  return root
}

describe('AWiki sent-mail history', () => {
  it('persists only accepted owner-bound sends and returns stable local list/detail pages', async () => {
    const root = await temporaryRoot()
    const owner = 'did:awiki:alice' as AwikiDid
    const other = 'did:awiki:other' as AwikiDid
    const store = new AwikiSentMailStore(root)

    await store.append(owner, {
      to: ['bob@example.com'],
      cc: ['carol@example.com'],
      subject: 'First release',
      bodyText: 'Please approve the first release.',
    }, { accepted: true, messageId: 'service-mail-1' as AwikiMailMessageId, warnings: [] }, {
      mailboxAddress: 'alice@awiki.example',
    })
    await store.append(owner, {
      to: ['dave@example.com'],
      subject: 'Second release',
      bodyText: 'Please approve the second release.',
    }, { accepted: true, messageId: 'service-mail-2' as AwikiMailMessageId, warnings: [] })

    const restarted = new AwikiSentMailStore(root)
    await expect(restarted.list(other, { folder: 'sent', limit: 20, offset: 0, unreadOnly: false }))
      .resolves.toEqual({ items: [], hasMore: false })
    await expect(restarted.list(owner, { folder: 'sent', limit: 20, offset: 0, unreadOnly: true }))
      .resolves.toEqual({ items: [], hasMore: false })

    const firstPage = await restarted.list(owner, { folder: 'sent', limit: 1, offset: 0, unreadOnly: false })
    expect(firstPage).toMatchObject({
      items: [{
        folder: 'sent',
        to: ['dave@example.com'],
        subject: 'Second release',
        unread: false,
        hasAttachments: false,
      }],
      nextOffset: 1,
      hasMore: true,
    })
    expect(String(firstPage.items[0]?.id)).toMatch(new RegExp(`^${LOCAL_SENT_MAIL_ID_PREFIX}`))

    const secondPage = await restarted.list(owner, { folder: 'sent', limit: 1, offset: 1, unreadOnly: false })
    expect(secondPage).toMatchObject({
      items: [{
        from: ['alice@awiki.example'],
        to: ['bob@example.com'],
        cc: ['carol@example.com'],
        subject: 'First release',
      }],
      hasMore: false,
    })
    await expect(restarted.read(owner, secondPage.items[0]!.id)).resolves.toMatchObject({
      summary: { subject: 'First release', folder: 'sent' },
      bodyText: 'Please approve the first release.',
      bodyTruncated: false,
      hasHtmlBody: false,
      attachments: [],
    })

    const directory = join(root, '.host', 'sent-mail-v1')
    const [fileName] = await readdir(directory)
    expect(fileName).toMatch(/^[0-9a-f]{64}\.json$/u)
    if (process.platform !== 'win32') {
      expect((await lstat(join(root, '.host'))).mode & 0o777).toBe(0o700)
      expect((await lstat(directory)).mode & 0o777).toBe(0o700)
      expect((await lstat(join(directory, fileName!))).mode & 0o777).toBe(0o600)
    }
    expect(await readFile(join(directory, fileName!), 'utf8')).not.toContain('did:awiki:other')

    await restarted.clear()
    await expect(lstat(directory)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('fails closed on corrupt history and a symlinked Host directory', async () => {
    const root = await temporaryRoot()
    const owner = 'did:awiki:alice' as AwikiDid
    const store = new AwikiSentMailStore(root)
    await store.append(owner, {
      to: ['bob@example.com'], subject: 'Release', bodyText: 'Approve it.',
    }, { accepted: true, warnings: [] })
    const directory = join(root, '.host', 'sent-mail-v1')
    const [fileName] = await readdir(directory)
    await writeFile(join(directory, fileName!), '{"version":2}', { mode: 0o600 })
    await expect(store.list(owner, { folder: 'sent', limit: 20, offset: 0, unreadOnly: false }))
      .rejects.toThrow('sent-mail history')

    if (process.platform !== 'win32') {
      const linkedRoot = await temporaryRoot()
      const target = await temporaryRoot()
      await mkdir(target, { recursive: true })
      await symlink(target, join(linkedRoot, '.host'))
      await expect(new AwikiSentMailStore(linkedRoot).list(owner, {
        folder: 'sent', limit: 20, offset: 0, unreadOnly: false,
      })).rejects.toThrow('sent-mail history')
    }
  })
})
