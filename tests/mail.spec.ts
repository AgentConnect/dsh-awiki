import { afterEach, describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { remoteMethods } from '@deepseek-ai/dsh-typert-protocol'
import { createHash } from 'node:crypto'
import { lstat, mkdir, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { AWIKI_LOGOUT_CONFIRMATION } from '../src/index.ts'
import { AwikiSdkError } from '../src/sdk-adapter.ts'
import { setup } from './harness.ts'

let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
})

describe('AWiki on-demand mail Host service', () => {
  it('resolves the mail endpoint independently and exposes the bounded browser Remote surface', async () => {
    const defaulted = await setup()
    context = defaulted.ctx
    expect(defaulted.options.mailServiceUrl).toBe('https://users.awiki.example')
    expect(remoteMethods(defaulted.ctx.awiki).map(marker => marker.method))
      .toEqual(expect.arrayContaining([
        'getMailAccount', 'listMailInbox', 'readMail', 'markMailRead', 'sendMail', 'downloadMailAttachment',
      ]))
    await defaulted.ctx.fiber.dispose()

    const explicit = await setup({ mailServiceUrl: 'https://mail.awiki.example' })
    context = explicit.ctx
    expect(explicit.options.mailServiceUrl).toBe('https://mail.awiki.example')
  })

  it('applies the same HTTPS, loopback, credential, and fragment policy to mail endpoints', async () => {
    await expect(setup({ mailServiceUrl: 'http://mail.awiki.example' })).rejects.toThrow('mailServiceUrl')
    await expect(setup({ mailServiceUrl: 'https://alice:secret@mail.awiki.example' })).rejects.toThrow('credentials')
    await expect(setup({ mailServiceUrl: 'https://mail.awiki.example#private' })).rejects.toThrow('fragment')

    const loopback = await setup({
      allowInsecureLoopbackForTesting: true,
      mailServiceUrl: 'http://127.0.0.1:8090',
    })
    context = loopback.ctx
    expect(loopback.options.mailServiceUrl).toBe('http://127.0.0.1:8090')
  })

  it('normalizes mailbox defaults and delegates each bounded operation once', async () => {
    const harness = await setup()
    context = harness.ctx

    await expect(harness.ctx.awiki.getMailAccount()).resolves.toMatchObject({
      ok: true, value: { mailboxAddress: 'alice@awiki.example', status: 'active' },
    })
    await expect(harness.ctx.awiki.listMailInbox()).resolves.toMatchObject({
      ok: true, value: { items: [{ id: 'mail-1', subject: 'Status update' }], nextOffset: 1, hasMore: true },
    })
    expect(harness.client.mailInboxRequest).toEqual({
      folder: 'inbox', unreadOnly: false, limit: 20, offset: 0,
    })
    await expect(harness.ctx.awiki.listMailInbox({
      folder: 'archive', unreadOnly: true, limit: 7, offset: 9,
    })).resolves.toMatchObject({ ok: true })
    expect(harness.client.mailInboxRequest).toEqual({
      folder: 'archive', unreadOnly: true, limit: 7, offset: 9,
    })

    await expect(harness.ctx.awiki.readMail({ messageId: 'mail-1' as never })).resolves.toMatchObject({
      ok: true,
      value: { bodyText: 'Untrusted mail body', hasHtmlBody: true, attachments: [{ sizeBytes: '42' }] },
    })
    await expect(harness.ctx.awiki.markMailRead({ messageIds: ['mail-1', 'mail-2'] as never[] }))
      .resolves.toEqual({ ok: true, value: { updated: 2 } })
    await expect(harness.ctx.awiki.sendMail({
      to: ['bob@example.com'], subject: 'Plain text', bodyText: 'One attempt',
    })).resolves.toEqual({
      ok: true, value: { accepted: true, messageId: 'mail-sent-1', warnings: [] },
    })
    expect(harness.client.mailSendRequest).toEqual({
      to: ['bob@example.com'], cc: [], subject: 'Plain text', bodyText: 'One attempt',
    })
    expect(harness.client.mailAccountCalls).toBe(2)
    expect(harness.client.mailInboxCalls).toBe(2)
    expect(harness.client.mailReadCalls).toBe(1)
    expect(harness.client.mailMarkReadCalls).toBe(1)
    expect(harness.client.mailSendCalls).toBe(1)
  })

  it('keeps sent history local and never presents a service inbox page as sent mail', async () => {
    const harness = await setup()
    context = harness.ctx

    await expect(harness.ctx.awiki.listMailInbox({ folder: 'sent', limit: 20, offset: 0 }))
      .resolves.toEqual({ ok: true, value: { items: [], hasMore: false } })
    expect(harness.client.mailInboxCalls).toBe(0)

    await expect(harness.ctx.awiki.sendMail({
      to: ['bob@example.com'],
      cc: ['carol@example.com'],
      subject: 'Local sent history',
      bodyText: 'This body must come from the accepted send, not the inbox service.',
    })).resolves.toEqual({
      ok: true, value: { accepted: true, messageId: 'mail-sent-1', warnings: [] },
    })

    const sent = await harness.ctx.awiki.listMailInbox({ folder: 'sent', limit: 20, offset: 0 })
    expect(sent).toMatchObject({
      ok: true,
      value: {
        items: [{
          folder: 'sent',
          from: ['alice@awiki.example'],
          to: ['bob@example.com'],
          cc: ['carol@example.com'],
          subject: 'Local sent history',
          unread: false,
        }],
        hasMore: false,
      },
    })
    expect(harness.client.mailInboxCalls).toBe(0)
    if (!sent.ok) throw new Error('expected local sent history')
    const localId = sent.value.items[0]?.id
    if (localId === undefined) throw new Error('expected one local sent message')
    expect(String(localId)).toMatch(/^awiki-sent-v1:/u)
    await expect(harness.ctx.awiki.readMail({ messageId: localId })).resolves.toMatchObject({
      ok: true,
      value: {
        summary: { folder: 'sent', subject: 'Local sent history' },
        bodyText: 'This body must come from the accepted send, not the inbox service.',
        hasHtmlBody: false,
        attachments: [],
      },
    })
    expect(harness.client.mailReadCalls).toBe(0)
  })

  it('validates mail attachments before one provider call and returns verified explicit downloads', async () => {
    const harness = await setup({
      mailAttachmentMaxCount: 2,
      mailAttachmentMaxBytes: 6,
      mailAttachmentTotalMaxBytes: 10,
    })
    context = harness.ctx
    const txt = Buffer.from('hello')
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47])
    await expect(harness.ctx.awiki.sendMail({
      to: ['bob@example.com'],
      subject: 'Attachments',
      bodyText: 'Two bounded files.',
      attachments: [
        { fileName: 'hello.txt', contentType: 'text/plain', sizeBytes: txt.byteLength, bytesBase64: txt.toString('base64') },
        { fileName: 'pixel.png', contentType: '', sizeBytes: png.byteLength, bytesBase64: png.toString('base64') },
      ],
    })).resolves.toEqual({
      ok: true, value: { accepted: true, messageId: 'mail-sent-1', warnings: [] },
    })
    expect(harness.client.mailSendCalls).toBe(1)
    expect(harness.client.mailSendRequest?.attachments).toEqual([
      { fileName: 'hello.txt', contentType: 'text/plain', bytes: Uint8Array.from(txt) },
      { fileName: 'pixel.png', contentType: 'application/octet-stream', bytes: Uint8Array.from(png) },
    ])

    const sent = await harness.ctx.awiki.listMailInbox({ folder: 'sent', limit: 20, offset: 0 })
    if (!sent.ok) throw new Error('expected local sent projection')
    const localMessageId = sent.value.items[0]!.id
    expect(sent.value.items[0]).toMatchObject({ hasAttachments: true, attachmentCount: 2 })
    await expect(harness.ctx.awiki.readMail({ messageId: localMessageId })).resolves.toMatchObject({
      ok: true,
      value: { attachments: [
        { index: 0, fileName: 'hello.txt', contentType: 'text/plain', sizeBytes: '5' },
        { index: 1, fileName: 'pixel.png', contentType: 'application/octet-stream', sizeBytes: '4' },
      ] },
    })

    const expectedBytes = Uint8Array.from(harness.client.mailDownloadBytes)
    await expect(harness.ctx.awiki.downloadMailAttachment({
      localMessageId,
      attachmentIndex: 0,
    })).resolves.toEqual({
      ok: true,
      value: {
        fileName: 'fixture.bin',
        contentType: 'application/octet-stream',
        sizeBytes: expectedBytes.byteLength,
        sha256: createHash('sha256').update(expectedBytes).digest('hex'),
        bytesBase64: Buffer.from(expectedBytes).toString('base64'),
      },
    })
    expect(harness.client.mailDownloadRequest).toEqual({ messageId: 'mail-sent-1', attachmentIndex: 0 })

    await expect(harness.ctx.awiki.downloadMailAttachment({
      localMessageId: 'mail-1' as never,
      attachmentIndex: 0,
    })).resolves.toMatchObject({ ok: true })
    expect(harness.client.mailDownloadRequest).toEqual({ messageId: 'mail-1', attachmentIndex: 0 })
    expect(harness.client.mailDownloadCalls).toBe(2)
  })

  it('rejects malformed attachment uploads and downloads before the provider', async () => {
    const harness = await setup({
      mailAttachmentMaxCount: 2,
      mailAttachmentMaxBytes: 6,
      mailAttachmentTotalMaxBytes: 10,
    })
    context = harness.ctx
    const base = { to: ['bob@example.com'], subject: 'Attachment', bodyText: 'Body' }
    const valid = { fileName: 'ok.bin', contentType: 'application/octet-stream', sizeBytes: 1, bytesBase64: 'AA==' }
    const invalidAttachments = [
      'not-an-array',
      [valid, valid, valid],
      [{ ...valid, fileName: '../secret' }],
      [{ ...valid, fileName: 'line\nbreak.txt' }],
      [{ ...valid, fileName: 'payload.exe ' }],
      [{ ...valid, fileName: 'safe\u202egnp.txt' }],
      [{ ...valid, fileName: 'private\ue000.txt' }],
      [{ ...valid, fileName: 'unassigned\u0378.txt' }],
      [{ ...valid, fileName: `${'界'.repeat(84)}.txt` }],
      [{ ...valid, fileName: '.' }],
      [{ ...valid, contentType: 'text/plain\r\nX-Evil: 1' }],
      [{ ...valid, sizeBytes: -1 }],
      [{ ...valid, sizeBytes: 1.5 }],
      [{ ...valid, sizeBytes: 2 }],
      [{ ...valid, bytesBase64: 'AB==' }],
      [
        { ...valid, sizeBytes: 6, bytesBase64: Buffer.alloc(6).toString('base64') },
        { ...valid, fileName: 'two.bin', sizeBytes: 6, bytesBase64: Buffer.alloc(6).toString('base64') },
      ],
    ]
    for (const attachments of invalidAttachments) {
      await expect(harness.ctx.awiki.sendMail({ ...base, attachments } as never)).resolves.toMatchObject({
        ok: false, error: { code: 'invalid-request' },
      })
    }
    expect(harness.client.mailSendCalls).toBe(0)

    for (const attachmentIndex of [-1, 1.5, 0x1_0000_0000, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(harness.ctx.awiki.downloadMailAttachment({
        localMessageId: 'mail-1' as never,
        attachmentIndex,
      })).resolves.toMatchObject({ ok: false, error: { code: 'invalid-request' } })
    }
    expect(harness.client.mailDownloadCalls).toBe(0)

    harness.client.mailDownloadBytes = new Uint8Array(5)
    harness.client.mailDownloadSizeBytes = 6
    await expect(harness.ctx.awiki.downloadMailAttachment({
      localMessageId: 'mail-1' as never, attachmentIndex: 0,
    })).resolves.toMatchObject({ ok: false, error: { code: 'remote' } })
    harness.client.mailDownloadSizeBytes = undefined
    harness.client.mailDownloadBytes = new Uint8Array(7)
    await expect(harness.ctx.awiki.downloadMailAttachment({
      localMessageId: 'mail-1' as never, attachmentIndex: 0,
    })).resolves.toMatchObject({ ok: false, error: { code: 'attachment-too-large' } })
  })

  it('does not write sent history when a provider is disposed before a late send settles', async () => {
    const harness = await setup()
    context = harness.ctx
    let release!: () => void
    let started!: () => void
    const didStart = new Promise<void>(resolve => { started = resolve })
    const blocked = new Promise<void>(resolve => { release = resolve })
    harness.client.sendMail = async (request) => {
      harness.client.mailSendCalls += 1
      harness.client.mailSendRequest = request
      started()
      await blocked
      return { accepted: true, messageId: 'late-mail' as never, warnings: [] }
    }
    const pending = harness.ctx.awiki.sendMail({
      to: ['bob@example.com'], subject: 'Late', bodyText: 'Must not persist.',
    })
    await didStart
    await harness.providerFiber.dispose()
    release()
    await expect(pending).resolves.toMatchObject({ ok: false, error: { code: 'remote' } })
    await expect(lstat(join(harness.options.stateRoot, '.host', 'sent-mail-v2')))
      .rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('keeps an adapted final MIME limit as invalid-request without writing sent history', async () => {
    const harness = await setup()
    context = harness.ctx
    for (let attempt = 0; attempt < 2; attempt += 1) {
      harness.client.sendMail = async (request) => {
        harness.client.mailSendCalls += 1
        harness.client.mailSendRequest = request
        throw new AwikiSdkError('invalid-request')
      }
      await expect(harness.ctx.awiki.sendMail({
        to: ['bob@example.com'],
        subject: 'Final MIME limit',
        bodyText: 'Must not create accepted history.',
      })).resolves.toMatchObject({
        ok: false,
        error: { code: 'invalid-request' },
      })
    }

    expect(harness.client.mailSendCalls).toBe(2)
    await expect(harness.ctx.awiki.listMailInbox({ folder: 'sent', limit: 20, offset: 0 }))
      .resolves.toMatchObject({ ok: true, value: { items: [] } })
    await expect(lstat(join(harness.options.stateRoot, '.host', 'sent-mail-v2')))
      .rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('does not return mail bytes when a provider is disposed before a late download settles', async () => {
    const harness = await setup()
    context = harness.ctx
    let release!: () => void
    let started!: () => void
    const didStart = new Promise<void>(resolve => { started = resolve })
    const blocked = new Promise<void>(resolve => { release = resolve })
    harness.client.downloadMailAttachment = async (request) => {
      harness.client.mailDownloadCalls += 1
      harness.client.mailDownloadRequest = request
      started()
      await blocked
      return {
        fileName: 'late.bin', contentType: 'application/octet-stream', sizeBytes: 1, bytes: Uint8Array.of(1),
      }
    }
    const pending = harness.ctx.awiki.downloadMailAttachment({
      localMessageId: 'mail-1' as never, attachmentIndex: 0,
    })
    await didStart
    await harness.providerFiber.dispose()
    release()
    await expect(pending).resolves.toEqual({
      ok: false,
      error: { code: 'remote', message: 'AWiki client provider is unavailable.' },
    })
  })

  it('does not write sent history when same-provider recovery switches owners during send', async () => {
    const harness = await setup()
    context = harness.ctx
    let release!: () => void
    let started!: () => void
    const didStart = new Promise<void>(resolve => { started = resolve })
    const blocked = new Promise<void>(resolve => { release = resolve })
    harness.client.sendMail = async (request) => {
      harness.client.mailSendCalls += 1
      harness.client.mailSendRequest = request
      started()
      await blocked
      return { accepted: true, messageId: 'late-recovered-mail' as never, warnings: [] }
    }
    const pending = harness.ctx.awiki.sendMail({
      to: ['bob@example.com'], subject: 'Owner switch', bodyText: 'Must not persist under either owner.',
    })
    await didStart
    const recoveredDid = 'did:awiki:recovered' as never
    harness.client.identity = { handle: 'recovered' as never, did: recoveredDid, registeredAt: 2 }
    harness.client.recoveryProgress = {
      ...harness.client.recoveryProgress,
      previousDid: 'did:awiki:alice' as never,
      currentDid: recoveredDid,
      phase: 'applied',
    }
    await expect(harness.ctx.awiki.getRecoveryStatus({ operationId: 'recovery-1' }))
      .resolves.toMatchObject({ ok: true, value: { currentDid: recoveredDid, phase: 'applied' } })
    release()
    await expect(pending).resolves.toMatchObject({ ok: false, error: { code: 'remote' } })
    await expect(lstat(join(harness.options.stateRoot, '.host', 'sent-mail-v2')))
      .rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('does not return mail bytes when same-provider recovery switches owners during download', async () => {
    const harness = await setup()
    context = harness.ctx
    let release!: () => void
    let started!: () => void
    const didStart = new Promise<void>(resolve => { started = resolve })
    const blocked = new Promise<void>(resolve => { release = resolve })
    harness.client.downloadMailAttachment = async (request) => {
      harness.client.mailDownloadCalls += 1
      harness.client.mailDownloadRequest = request
      started()
      await blocked
      return {
        fileName: 'late.bin', contentType: 'application/octet-stream', sizeBytes: 1, bytes: Uint8Array.of(1),
      }
    }
    const pending = harness.ctx.awiki.downloadMailAttachment({
      localMessageId: 'mail-1' as never, attachmentIndex: 0,
    })
    await didStart
    const recoveredDid = 'did:awiki:recovered' as never
    harness.client.identity = { handle: 'recovered' as never, did: recoveredDid, registeredAt: 2 }
    harness.client.recoveryProgress = {
      ...harness.client.recoveryProgress,
      previousDid: 'did:awiki:alice' as never,
      currentDid: recoveredDid,
      phase: 'applied',
    }
    await expect(harness.ctx.awiki.getRecoveryStatus({ operationId: 'recovery-1' }))
      .resolves.toMatchObject({ ok: true, value: { currentDid: recoveredDid, phase: 'applied' } })
    release()
    await expect(pending).resolves.toEqual({
      ok: false,
      error: { code: 'remote', message: 'AWiki client provider is unavailable.' },
    })
  })

  it('rejects mail work before the SDK call when the current Core owner differs at operation start', async () => {
    const harness = await setup()
    context = harness.ctx
    await expect(harness.ctx.awiki.getMailAccount()).resolves.toMatchObject({ ok: true })
    harness.client.identity = {
      handle: 'other' as never,
      did: 'did:awiki:other' as never,
      registeredAt: 2,
    }

    await expect(harness.ctx.awiki.sendMail({
      to: ['bob@example.com'], subject: 'Wrong owner', bodyText: 'Must not send.',
    })).resolves.toMatchObject({ ok: false, error: { code: 'remote' } })
    await expect(harness.ctx.awiki.downloadMailAttachment({
      localMessageId: 'mail-1' as never, attachmentIndex: 0,
    })).resolves.toMatchObject({ ok: false, error: { code: 'remote' } })
    expect(harness.client.mailSendCalls).toBe(0)
    expect(harness.client.mailDownloadCalls).toBe(0)
    await expect(lstat(join(harness.options.stateRoot, '.host', 'sent-mail-v2')))
      .rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('does not return accepted send state or persist history after logout wins an in-flight send', async () => {
    const harness = await setup()
    context = harness.ctx
    let release!: () => void
    let started!: () => void
    const didStart = new Promise<void>(resolve => { started = resolve })
    const blocked = new Promise<void>(resolve => { release = resolve })
    harness.client.sendMail = async (request) => {
      harness.client.mailSendCalls += 1
      harness.client.mailSendRequest = request
      started()
      await blocked
      return { accepted: true, messageId: 'late-after-logout' as never, warnings: [] }
    }
    const pending = harness.ctx.awiki.sendMail({
      to: ['bob@example.com'], subject: 'Logout race', bodyText: 'Must fail closed.',
    })
    await didStart
    await expect(harness.ctx.awiki.logout({ confirmation: AWIKI_LOGOUT_CONFIRMATION }))
      .resolves.toMatchObject({ ok: true, value: { status: 'signed-out' } })
    release()
    await expect(pending).resolves.toMatchObject({ ok: false, error: { code: 'remote' } })
    await expect(lstat(join(harness.options.stateRoot, '.host', 'sent-mail-v2')))
      .rejects.toMatchObject({ code: 'ENOENT' })
  })

  it('does not return attachment bytes after logout wins an in-flight download', async () => {
    const harness = await setup()
    context = harness.ctx
    let release!: () => void
    let started!: () => void
    const didStart = new Promise<void>(resolve => { started = resolve })
    const blocked = new Promise<void>(resolve => { release = resolve })
    harness.client.downloadMailAttachment = async (request) => {
      harness.client.mailDownloadCalls += 1
      harness.client.mailDownloadRequest = request
      started()
      await blocked
      return {
        fileName: 'late.bin', contentType: 'application/octet-stream', sizeBytes: 1, bytes: Uint8Array.of(1),
      }
    }
    const pending = harness.ctx.awiki.downloadMailAttachment({
      localMessageId: 'mail-1' as never, attachmentIndex: 0,
    })
    await didStart
    await expect(harness.ctx.awiki.logout({ confirmation: AWIKI_LOGOUT_CONFIRMATION }))
      .resolves.toMatchObject({ ok: true, value: { status: 'signed-out' } })
    release()
    await expect(pending).resolves.toMatchObject({ ok: false, error: { code: 'remote' } })
  })

  it('returns accepted with a warning when local sent history cannot be written and never resends', async () => {
    if (process.platform === 'win32') return
    const harness = await setup()
    context = harness.ctx
    const host = join(harness.options.stateRoot, '.host')
    const target = join(harness.options.stateRoot, 'sent-mail-target')
    await mkdir(host, { recursive: true })
    await mkdir(target)
    await symlink(target, join(host, 'sent-mail-v2'))
    await expect(harness.ctx.awiki.sendMail({
      to: ['bob@example.com'], subject: 'Accepted', bodyText: 'Local projection will fail.',
    })).resolves.toEqual({
      ok: true,
      value: {
        accepted: true,
        messageId: 'mail-sent-1',
        warnings: ['Sent history could not be saved locally.'],
      },
    })
    expect(harness.client.mailSendCalls).toBe(1)
  })

  it('keeps an accepted attachment send non-retryable when the service omits its message id', async () => {
    const harness = await setup()
    context = harness.ctx
    harness.client.sendMail = async (request) => {
      harness.client.mailSendCalls += 1
      harness.client.mailSendRequest = request
      return { accepted: true, warnings: [] }
    }
    await expect(harness.ctx.awiki.sendMail({
      to: ['bob@example.com'],
      subject: 'Accepted without id',
      bodyText: 'Do not retry this send.',
      attachments: [{ fileName: 'a.txt', contentType: 'text/plain', sizeBytes: 1, bytesBase64: 'YQ==' }],
    })).resolves.toEqual({
      ok: true,
      value: {
        accepted: true,
        warnings: ['Sent attachment download is unavailable because the service returned no message id.'],
      },
    })
    const sent = await harness.ctx.awiki.listMailInbox({ folder: 'sent', limit: 20, offset: 0 })
    if (!sent.ok) throw new Error('expected local sent projection')
    await expect(harness.ctx.awiki.downloadMailAttachment({
      localMessageId: sent.value.items[0]!.id,
      attachmentIndex: 0,
    })).resolves.toMatchObject({ ok: false, error: { code: 'not-found' } })
    expect(harness.client.mailSendCalls).toBe(1)
    expect(harness.client.mailDownloadCalls).toBe(0)
  })

  it('rejects malformed mailbox requests before any provider call, including coercion objects', async () => {
    const harness = await setup()
    context = harness.ctx
    let coerced = 0
    const coercion = { toString: () => { coerced += 1; return 'mail-1' } }

    const invalidInbox = [
      { folder: '' },
      { folder: 'x'.repeat(65) },
      { folder: 'in\nbox' },
      { unreadOnly: 'true' },
      { limit: 0 },
      { limit: 101 },
      { limit: 1.5 },
      { offset: -1 },
      { offset: 0x1_0000_0000 },
    ]
    for (const request of invalidInbox) {
      await expect(harness.ctx.awiki.listMailInbox(request as never)).resolves.toMatchObject({
        ok: false, error: { code: 'invalid-request' },
      })
    }
    await expect(harness.ctx.awiki.readMail({ messageId: coercion } as never)).resolves.toMatchObject({
      ok: false, error: { code: 'invalid-request' },
    })
    await expect(harness.ctx.awiki.markMailRead({ messageIds: [] })).resolves.toMatchObject({
      ok: false, error: { code: 'invalid-request' },
    })
    await expect(harness.ctx.awiki.markMailRead({
      messageIds: Array.from({ length: 101 }, (_, index) => `mail-${index}`) as never[],
    })).resolves.toMatchObject({ ok: false, error: { code: 'invalid-request' } })

    const invalidSends = [
      { to: [], subject: 'Subject', bodyText: 'Body' },
      { to: ['invalid'], subject: 'Subject', bodyText: 'Body' },
      { to: ['a @example.com'], subject: 'Subject', bodyText: 'Body' },
      { to: ['a\u0007@example.com'], subject: 'Subject', bodyText: 'Body' },
      { to: ['same@example.com'], cc: ['same@example.com'], subject: 'Subject', bodyText: 'Body' },
      { to: Array.from({ length: 21 }, (_, index) => `user${index}@example.com`), subject: 'Subject', bodyText: 'Body' },
      { to: ['a@example.com'], subject: ' Subject', bodyText: 'Body' },
      { to: ['a@example.com'], subject: 'x'.repeat(1_025), bodyText: 'Body' },
      { to: ['a@example.com'], subject: 'Subject', bodyText: ' \n ' },
      { to: ['a@example.com'], subject: 'Subject', bodyText: 'x'.repeat(65_537) },
      { to: [coercion], subject: 'Subject', bodyText: 'Body' },
    ]
    for (const request of invalidSends) {
      await expect(harness.ctx.awiki.sendMail(request as never)).resolves.toMatchObject({
        ok: false, error: { code: 'invalid-request' },
      })
    }

    expect(coerced).toBe(0)
    expect(harness.client.mailInboxCalls).toBe(0)
    expect(harness.client.mailReadCalls).toBe(0)
    expect(harness.client.mailMarkReadCalls).toBe(0)
    expect(harness.client.mailSendCalls).toBe(0)
  })

  it('accepts exact UTF-8 boundaries and keeps detached request collections', async () => {
    const harness = await setup()
    context = harness.ctx
    const to = ['bob@example.com']
    const messageIds = ['mail-1'] as never[]
    const subject = 'é'.repeat(512)
    const bodyText = '界'.repeat(21_845) + 'a'

    await expect(harness.ctx.awiki.sendMail({ to, subject, bodyText })).resolves.toMatchObject({ ok: true })
    await expect(harness.ctx.awiki.markMailRead({ messageIds })).resolves.toMatchObject({ ok: true })
    to[0] = 'mutated@example.com'
    messageIds[0] = 'mutated' as never
    expect(harness.client.mailSendRequest?.to).toEqual(['bob@example.com'])
    expect(harness.client.mailMarkReadRequest?.messageIds).toEqual(['mail-1'])
  })

  it('uses the existing signed-out, provider, rate-limit, and fixed-error boundary', async () => {
    const harness = await setup()
    context = harness.ctx
    harness.client.failure = Object.assign(new Error('private mailbox response'), {
      name: 'AwikiImError', code: 'rate-limited',
    })
    await expect(harness.ctx.awiki.getMailAccount()).resolves.toEqual({
      ok: false,
      error: { code: 'rate-limited', message: 'The AWiki service rate-limited the request.' },
    })

    harness.client.failure = undefined
    await harness.ctx.awiki.logout({ confirmation: AWIKI_LOGOUT_CONFIRMATION })
    const calls = harness.client.mailAccountCalls
    await expect(harness.ctx.awiki.getMailAccount()).resolves.toMatchObject({
      ok: false, error: { code: 'signed-out' },
    })
    expect(harness.client.mailAccountCalls).toBe(calls)

    await harness.providerFiber.dispose()
    await expect(harness.ctx.awiki.listMailInbox()).resolves.toEqual({
      ok: false,
      error: { code: 'signed-out', message: 'This installation is signed out of AWiki.' },
    })
  })
})
