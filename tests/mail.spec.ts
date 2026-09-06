import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { remoteMethods } from '@deepseek-ai/dsh-typert-protocol'
import { AWIKI_LOGOUT_CONFIRMATION } from '../src/index.ts'
import { setup } from './harness.ts'

let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  vi.unstubAllGlobals()
})

describe('AWiki on-demand mail Host service', () => {
  it('resolves the mail endpoint independently and exposes the bounded browser Remote surface', async () => {
    const defaulted = await setup()
    context = defaulted.ctx
    expect(defaulted.options.mailServiceUrl).toBe('https://users.awiki.example')
    expect(remoteMethods(defaulted.ctx.awiki).map(marker => marker.method))
      .toEqual(expect.arrayContaining([
        'getMailAccount', 'listMailInbox', 'readMail', 'markMailRead', 'sendMail',
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
    expect(harness.client.mailAccountCalls).toBe(1)
    expect(harness.client.mailInboxCalls).toBe(2)
    expect(harness.client.mailReadCalls).toBe(1)
    expect(harness.client.mailMarkReadCalls).toBe(1)
    expect(harness.client.mailSendCalls).toBe(1)
  })

  it('uses server outbound history as sent authority and reads its real message details', async () => {
    const harness = await setup()
    context = harness.ctx
    let outboundItems = [{
      id: 'mail-sent-1',
      direction: 'outbound',
      from_addr: 'alice@awiki.example',
      to_addr: 'bob@example.com, carol@example.com',
      subject: 'Server sent history',
      status: 'sent',
      has_attachments: true,
      is_read: true,
      created_at: '2026-09-02T10:00:00',
    }]
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      jsonrpc: '2.0', id: 1,
      result: { total: outboundItems.length, page: 1, page_size: 100, items: outboundItems },
      error: null,
    })))

    await expect(harness.ctx.awiki.listMailInbox({ folder: 'sent', limit: 20, offset: 0 }))
      .resolves.toMatchObject({
        ok: true,
        value: {
          items: [{
            id: 'mail-sent-1',
            folder: 'sent',
            from: ['alice@awiki.example'],
            to: ['bob@example.com', 'carol@example.com'],
            subject: 'Server sent history',
            sentAt: '2026-09-02T10:00:00Z',
            unread: false,
            hasAttachments: true,
          }],
          hasMore: false,
        },
      })
    expect(harness.client.mailInboxCalls).toBe(0)
    expect(harness.client.externalHttpRequests).toHaveLength(1)
    expect(JSON.parse(new TextDecoder().decode(harness.client.externalHttpRequests[0]?.body))).toEqual({
      jsonrpc: '2.0', id: 1, method: 'mail.list',
      params: { direction: 'outbound', page: 1, page_size: 100 },
    })

    await expect(harness.ctx.awiki.readMail({ messageId: 'mail-sent-1' as never })).resolves.toMatchObject({
      ok: true,
      value: {
        bodyText: 'Untrusted mail body',
        hasHtmlBody: true,
        attachments: [{ fileName: 'report.txt', contentType: 'text/plain', sizeBytes: '42' }],
      },
    })
    expect(harness.client.mailReadCalls).toBe(1)

    await expect(harness.ctx.awiki.sendMail({
      to: ['bob@example.com'], subject: 'New server mail', bodyText: 'One accepted send.',
    })).resolves.toMatchObject({ ok: true, value: { accepted: true } })
    outboundItems = [{
      ...outboundItems[0]!,
      id: 'mail-sent-2',
      subject: 'New server mail',
      has_attachments: false,
    }, ...outboundItems]
    await expect(harness.ctx.awiki.listMailInbox({ folder: 'sent', limit: 20, offset: 0 }))
      .resolves.toMatchObject({
        ok: true,
        value: { items: [{ id: 'mail-sent-2' }, { id: 'mail-sent-1' }], hasMore: false },
      })
    expect(harness.client.mailSendCalls).toBe(1)
    expect(harness.client.mailAccountCalls).toBe(0)
    expect(harness.client.externalHttpRequests).toHaveLength(2)
  })

  it('returns outbound service failures as retryable UI errors, never empty sent history', async () => {
    const harness = await setup()
    context = harness.ctx
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ detail: 'private timeout' }, { status: 503 })))

    await expect(harness.ctx.awiki.listMailInbox({ folder: 'sent', limit: 20, offset: 0 }))
      .resolves.toEqual({
        ok: false,
        error: { code: 'network', message: 'The AWiki service could not be reached.' },
      })
    expect(harness.client.mailInboxCalls).toBe(0)
    expect(harness.client.externalHttpRequests).toHaveLength(1)
  })

  it('drops an outbound completion from an older identity generation', async () => {
    const harness = await setup()
    context = harness.ctx
    let release = () => {}
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => {
      release = () => { resolve(Response.json({
        jsonrpc: '2.0', id: 1,
        result: { total: 1, page: 1, page_size: 100, items: [{
          id: 'mail-old', direction: 'outbound', from_addr: 'old@example.com',
          to_addr: 'peer@example.com', subject: 'Old generation', status: 'sent',
          has_attachments: false, is_read: true, created_at: '2026-09-02T10:00:00+00:00',
        }] }, error: null,
      })) }
    })))

    const pending = harness.ctx.awiki.listMailInbox({ folder: 'sent', limit: 20, offset: 0 })
    await vi.waitFor(() => { expect(harness.client.externalHttpRequests).toHaveLength(1) })
    await harness.ctx.awiki.logout({ confirmation: AWIKI_LOGOUT_CONFIRMATION })
    release()
    await expect(pending).resolves.toMatchObject({ ok: false, error: { code: 'network' } })
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
