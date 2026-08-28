import { createHash } from 'node:crypto'
import { lstat, mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { AwikiSentMailStore, LOCAL_SENT_MAIL_ID_PREFIX } from '../src/sent-mail-store.ts'
import { mailSendRequest } from '../src/mail.ts'
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

    const secretBytes = Buffer.from('TOP_SECRET_ATTACHMENT')
    await store.append(owner, mailSendRequest({
      to: ['bob@example.com'],
      cc: ['carol@example.com'],
      subject: 'First release',
      bodyText: 'Please approve the first release.',
      attachments: [{
        fileName: 'release.txt',
        contentType: 'text/plain',
        sizeBytes: secretBytes.byteLength,
        bytesBase64: secretBytes.toString('base64'),
      }],
    }), { accepted: true, messageId: 'service-mail-1' as AwikiMailMessageId, warnings: ['queued'] }, {
      mailboxAddress: 'alice@awiki.example',
    })
    await store.append(owner, mailSendRequest({
      to: ['dave@example.com'],
      subject: 'Second release',
      bodyText: 'Please approve the second release.',
    }), { accepted: true, messageId: 'service-mail-2' as AwikiMailMessageId, warnings: [] })

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
        hasAttachments: true,
        attachmentCount: 1,
      }],
      hasMore: false,
    })
    await expect(restarted.read(owner, secondPage.items[0]!.id)).resolves.toMatchObject({
      summary: { subject: 'First release', folder: 'sent' },
      bodyText: 'Please approve the first release.',
      bodyTruncated: false,
      hasHtmlBody: false,
      attachments: [{ index: 0, fileName: 'release.txt', contentType: 'text/plain', sizeBytes: String(secretBytes.byteLength) }],
    })
    await expect(restarted.resolveAttachment(owner, secondPage.items[0]!.id, 0))
      .resolves.toBe('service-mail-1')

    const directory = join(root, '.host', 'sent-mail-v2')
    const [fileName] = await readdir(directory)
    expect(fileName).toMatch(/^[0-9a-f]{64}\.json$/u)
    if (process.platform !== 'win32') {
      expect((await lstat(join(root, '.host'))).mode & 0o777).toBe(0o700)
      expect((await lstat(directory)).mode & 0o777).toBe(0o700)
      expect((await lstat(join(directory, fileName!))).mode & 0o777).toBe(0o600)
    }
    const persisted = await readFile(join(directory, fileName!), 'utf8')
    expect(persisted).not.toContain('did:awiki:other')
    expect(persisted).not.toContain(secretBytes.toString('base64'))
    expect(persisted).not.toContain(secretBytes.toString('utf8'))
    expect(persisted).not.toContain(root)
    expect(persisted).toContain(createHash('sha256').update(secretBytes).digest('hex'))

    await restarted.clear()
    await expect(lstat(directory)).rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('fails closed on corrupt history and a symlinked Host directory', async () => {
    const root = await temporaryRoot()
    const owner = 'did:awiki:alice' as AwikiDid
    const store = new AwikiSentMailStore(root)
    await store.append(owner, mailSendRequest({
      to: ['bob@example.com'], subject: 'Release', bodyText: 'Approve it.',
    }), { accepted: true, warnings: [] })
    const directory = join(root, '.host', 'sent-mail-v2')
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

  it('reads legacy v1 without rewriting it and migrates only on the next accepted v2 append', async () => {
    const root = await temporaryRoot()
    const owner = 'did:awiki:alice' as AwikiDid
    const directory = join(root, '.host', 'sent-mail-v1')
    await mkdir(directory, { recursive: true, mode: 0o700 })
    const file = join(directory, `${createHash('sha256').update(owner).digest('hex')}.json`)
    const localId = 'awiki-sent-v1:00000000-0000-4000-8000-000000000001' as AwikiMailMessageId
    const legacy = JSON.stringify({
      version: 1,
      ownerDid: owner,
      records: [{
        id: localId,
        serviceMessageId: 'legacy-service-mail',
        to: ['bob@example.com'],
        cc: [],
        subject: 'Legacy send',
        bodyText: 'Legacy body',
        sentAt: '2026-08-27T00:00:00.000Z',
      }],
    })
    await writeFile(file, legacy, { mode: 0o600 })
    const store = new AwikiSentMailStore(root)
    await expect(store.read(owner, localId)).resolves.toMatchObject({
      summary: { hasAttachments: false, attachmentCount: 0 },
      attachments: [],
    })
    await expect(store.resolveAttachment(owner, localId, 0)).resolves.toBeUndefined()
    expect(await readFile(file, 'utf8')).toBe(legacy)

    await store.append(owner, mailSendRequest({
      to: ['carol@example.com'], subject: 'New send', bodyText: 'New body',
    }), { accepted: true, messageId: 'new-service-mail' as AwikiMailMessageId, warnings: [] })
    expect(await readFile(file, 'utf8')).toBe(legacy)
    await expect(store.list(owner, { folder: 'sent', limit: 20, offset: 0, unreadOnly: false }))
      .resolves.toMatchObject({ items: [{ subject: 'New send' }, { subject: 'Legacy send' }], hasMore: false })
  })

  it('serializes concurrent accepted appends, rejects duplicate records, and ignores unaccepted sends', async () => {
    const root = await temporaryRoot()
    const owner = 'did:awiki:alice' as AwikiDid
    const store = new AwikiSentMailStore(root)
    await store.append(owner, mailSendRequest({
      to: ['ignored@example.com'], subject: 'Ignored', bodyText: 'Not accepted.',
    }), { accepted: false, warnings: [] })
    await Promise.all(Array.from({ length: 10 }, (_, index) => store.append(owner, mailSendRequest({
      to: [`user${index}@example.com`], subject: `Send ${index}`, bodyText: 'Accepted.',
    }), { accepted: true, messageId: `service-${index}` as AwikiMailMessageId, warnings: [] })))
    const page = await store.list(owner, { folder: 'sent', limit: 20, offset: 0, unreadOnly: false })
    expect(page.items).toHaveLength(10)
    expect(new Set(page.items.map(item => item.id)).size).toBe(10)
    expect(page.items.some(item => item.subject === 'Ignored')).toBe(false)

    const directory = join(root, '.host', 'sent-mail-v2')
    const [fileName] = await readdir(directory)
    const file = join(directory, fileName!)
    const parsed = JSON.parse(await readFile(file, 'utf8'))
    parsed.records[1].id = parsed.records[0].id
    await writeFile(file, JSON.stringify(parsed), { mode: 0o600 })
    await expect(new AwikiSentMailStore(root).list(owner, {
      folder: 'sent', limit: 20, offset: 0, unreadOnly: false,
    })).rejects.toThrow('sent-mail history')
  })

  it('fails closed when persisted attachment metadata contains category C filenames', async () => {
    const root = await temporaryRoot()
    const owner = 'did:awiki:alice' as AwikiDid
    const store = new AwikiSentMailStore(root)
    await store.append(owner, mailSendRequest({
      to: ['bob@example.com'],
      subject: 'Safe before tamper',
      bodyText: 'Metadata only.',
      attachments: [{ fileName: 'safe.txt', contentType: 'text/plain', sizeBytes: 1, bytesBase64: 'YQ==' }],
    }), { accepted: true, messageId: 'service-1' as AwikiMailMessageId, warnings: [] })
    const directory = join(root, '.host', 'sent-mail-v2')
    const [fileName] = await readdir(directory)
    const file = join(directory, fileName!)
    const parsed = JSON.parse(await readFile(file, 'utf8'))
    parsed.records[0].attachments[0].fileName = 'private\ue000.txt'
    await writeFile(file, JSON.stringify(parsed), { mode: 0o600 })
    await expect(new AwikiSentMailStore(root).read(owner, parsed.records[0].id))
      .rejects.toThrow('sent-mail history')
  })
})
