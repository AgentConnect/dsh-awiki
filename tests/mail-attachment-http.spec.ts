import { afterEach, describe, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import { createHash } from 'node:crypto'
import type { Context } from '@deepseek-ai/cordis'
import { setup } from './harness.ts'
import { AWIKI_CHINA_TENANT_ID, AWIKI_GLOBAL_TENANT_ID } from '../src/tenant-registry.ts'
import { AWIKI_LOGOUT_CONFIRMATION } from '../src/types.ts'
import { AWIKI_EXTERNAL_HTTP_MAX_BODY_BYTES } from '../src/external-http-auth.ts'
import { MAIL_HTTP_UPLOAD_MAX_BYTES } from '../src/mail-attachment-client.ts'

let ctx: Context | undefined
let server: Server | undefined
const upload = (bytes = Buffer.from('hello')) => ({
  to: ['peer@example.com'], subject: 'Attachment', bodyText: 'Explicit attachment',
  attachments: [{ fileName: 'hello.txt', contentType: 'text/plain', sizeBytes: bytes.length, bytesBase64: bytes.toString('base64') }],
})
const attachment = (bytes = Buffer.from('hello'), index = 0) => ({
  index, filename: 'hello.txt', content_type: 'text/plain', size: bytes.length, content_base64: bytes.toString('base64'),
})
const envelope = (result: unknown) => ({ jsonrpc: '2.0', id: 1, result })
afterEach(async () => {
  await ctx?.fiber.dispose(); ctx = undefined
  if (server) { server.closeAllConnections(); await new Promise<void>(resolve => server!.close(() => resolve())); server = undefined }
  vi.unstubAllGlobals()
})

describe('Host mail attachments over authenticated HTTP', () => {
  it('sends exact signed JSON and downloads a 10 MiB server sent-mail attachment over real HTTP', async () => {
    const requests: { body: any; signature: string | undefined }[] = []
    const large = Buffer.alloc(10 * 1024 * 1024, 0x6b)
    server = createServer(async (req, res) => {
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const body = JSON.parse(Buffer.concat(chunks).toString())
      requests.push({ body, signature: req.headers.signature as string | undefined })
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify(envelope(body.method === 'mail.send'
        ? { accepted: true, status: 'sent', message_id: 'server-sent-123', warnings: [] }
        : attachment(large))))
    })
    await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve))
    const address = server.address() as { port: number }
    const origin = `http://127.0.0.1:${address.port}`
    const harness = await setup({ mailServiceUrl: origin, allowInsecureLoopbackForTesting: true })
    ctx = harness.ctx
    await expect(ctx.awiki.sendMail(upload())).resolves.toMatchObject({ ok: true, value: { messageId: 'server-sent-123' } })
    expect(harness.client.mailSendCalls).toBe(0)
    expect(requests[0]).toEqual({ signature: 'sig1=:fixture:', body: {
      jsonrpc: '2.0', id: 1, method: 'mail.send', params: {
        to: ['peer@example.com'], cc: [], subject: 'Attachment', body_text: 'Explicit attachment', body_html: null,
        attachments: [{ filename: 'hello.txt', content_type: 'text/plain', content_base64: 'aGVsbG8=' }],
      },
    } })
    const downloaded = await ctx.awiki.downloadMailAttachment({ localMessageId: 'server-sent-123' as never, attachmentIndex: 0 })
    expect(downloaded).toMatchObject({ ok: true, value: { sizeBytes: large.length, sha256: createHash('sha256').update(large).digest('hex') } })
    if (!downloaded.ok) throw new Error('download failed')
    expect(Buffer.from(downloaded.value.bytesBase64, 'base64').equals(large)).toBe(true)
    expect(requests[1]?.body.params).toEqual({ message_id: 'server-sent-123', attachment_index: 0 })
    expect(harness.client.externalHttpRequests.map(value => value.url)).toEqual([`${origin}/mail/rpc`, `${origin}/mail/rpc`])
    expect(JSON.parse(Buffer.from(harness.client.externalHttpRequests[0]!.body!).toString())).toEqual(requests[0]?.body)
  })

  it('advertises the real upload budget and rejects over-budget or malformed input before signing', async () => {
    const harness = await setup(); ctx = harness.ctx
    expect(await ctx.awiki.getConfig()).toMatchObject({ ok: true, value: {
      mailAttachmentMaxBytes: MAIL_HTTP_UPLOAD_MAX_BYTES, mailAttachmentTotalMaxBytes: MAIL_HTTP_UPLOAD_MAX_BYTES,
      mailAttachmentDownloadMaxBytes: 10 * 1024 * 1024,
    } })
    for (const input of [upload(Buffer.alloc(MAIL_HTTP_UPLOAD_MAX_BYTES + 1)), { ...upload(), attachments: [{ ...upload().attachments[0], fileName: '../private' }] }]) {
      await expect(ctx.awiki.sendMail(input as never)).resolves.toMatchObject({ ok: false, error: { code: 'invalid-request' } })
    }
    expect(harness.client.externalHttpRequests).toHaveLength(0)
    expect(harness.client.mailSendCalls).toBe(0)
  })

  it('accepts the exact advertised upload limit without exceeding the native signing body budget', async () => {
    const harness = await setup(); ctx = harness.ctx
    vi.stubGlobal('fetch', vi.fn(async (request: Request) => {
      expect((await request.arrayBuffer()).byteLength).toBeLessThanOrEqual(AWIKI_EXTERNAL_HTTP_MAX_BODY_BYTES)
      return Response.json(envelope({ accepted: true, status: 'sent', message_id: 'mail-max', warnings: [] }))
    }))
    await expect(ctx.awiki.sendMail(upload(Buffer.alloc(MAIL_HTTP_UPLOAD_MAX_BYTES)))).resolves.toMatchObject({ ok: true })
    expect(harness.client.externalHttpRequests).toHaveLength(1)
  })

  it('never replays an attachment send, even when the authentication provider offers a retry', async () => {
    const harness = await setup(); ctx = harness.ctx
    harness.client.externalHttpFactory = request => ({
      targetUrl: request.url, method: request.method, headerPatch: [], retryCount: 0,
      handleResponse: async () => ({ targetUrl: request.url, method: request.method, headerPatch: [], retryCount: 1, handleResponse: async () => null }),
    })
    const fetcher = vi.fn(async () => Response.json({ error: 'private' }, { status: 401 }))
    vi.stubGlobal('fetch', fetcher)
    await expect(ctx.awiki.sendMail(upload())).resolves.toMatchObject({ ok: false, error: { code: 'not-registered' } })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('reports ambiguous send transport failure without retrying or invoking plain-text SDK send', async () => {
    const harness = await setup(); ctx = harness.ctx
    const fetcher = vi.fn(async () => { throw new Error('connection lost after write') })
    vi.stubGlobal('fetch', fetcher)
    await expect(ctx.awiki.sendMail(upload())).resolves.toMatchObject({ ok: false, error: { code: 'delivery-unknown' } })
    expect(fetcher).toHaveBeenCalledTimes(1); expect(harness.client.mailSendCalls).toBe(0)
  })

  it.each(['index', 'base64', 'size', 'filename'])('rejects mismatched download %s without exposing server payloads', async kind => {
    const harness = await setup(); ctx = harness.ctx
    const value = attachment()
    if (kind === 'index') value.index = 1
    if (kind === 'base64') value.content_base64 = 'aGVsbG9='
    if (kind === 'size') value.size = 4
    if (kind === 'filename') value.filename = '../secret'
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(envelope(value))))
    await expect(ctx.awiki.downloadMailAttachment({ localMessageId: 'mail-1' as never, attachmentIndex: 0 }))
      .resolves.toMatchObject({ ok: false, error: { code: 'remote' } })
  })

  it('cancels an oversized chunked response before JSON aggregation', async () => {
    const harness = await setup({ mailAttachmentMaxBytes: 16 }); ctx = harness.ctx
    const cancel = vi.fn()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(70 * 1024)) }, cancel,
    }))))
    await expect(ctx.awiki.downloadMailAttachment({ localMessageId: 'mail-1' as never, attachmentIndex: 0 }))
      .resolves.toMatchObject({ ok: false, error: { code: 'remote' } })
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('discards completed attachment bytes after logout while HTTP is pending', async () => {
    const harness = await setup(); ctx = harness.ctx
    let finish!: (value: Response) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { finish = resolve })))
    const pending = ctx.awiki.downloadMailAttachment({ localMessageId: 'mail-1' as never, attachmentIndex: 0 })
    await vi.waitFor(() => expect(finish).toBeDefined())
    await ctx.awiki.logout({ confirmation: AWIKI_LOGOUT_CONFIRMATION })
    finish(Response.json(envelope(attachment())))
    await expect(pending).resolves.toMatchObject({ ok: false })
  })
  it('routes downloads by active tenant and fences a response after A to B to A', async () => {
    const harness = await setup({ userServiceUrl: 'https://awiki.me', userServiceDomain: 'awiki.me',
      messageServiceUrl: 'https://awiki.me', mailServiceUrl: 'https://awiki.me',
      messageServicePublicUrl: 'https://awiki.me', messageServiceDid: 'did:wba:awiki.me' })
    ctx = harness.ctx
    let finish!: (value: Response) => void
    const origins: string[] = []
    let pendingFirst = true
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(input instanceof Request ? input.url : String(input))
      if (url.pathname !== '/mail/rpc') return new Response('', { status: 503 })
      origins.push(url.origin)
      if (pendingFirst) { pendingFirst = false; return new Promise<Response>(resolve => { finish = resolve }) }
      return Response.json(envelope(attachment()))
    }))
    const request = { localMessageId: 'server-mail' as never, attachmentIndex: 0 }
    const old = ctx.awiki.downloadMailAttachment(request)
    await vi.waitFor(() => expect(finish).toBeDefined())
    await ctx.awiki.switchTenant(AWIKI_GLOBAL_TENANT_ID)
    await expect(ctx.awiki.downloadMailAttachment(request)).resolves.toMatchObject({ ok: true })
    await ctx.awiki.switchTenant(AWIKI_CHINA_TENANT_ID)
    finish(Response.json(envelope(attachment())))
    await expect(old).resolves.toMatchObject({ ok: false, error: { code: 'conflict' } })
    await expect(ctx.awiki.downloadMailAttachment(request)).resolves.toMatchObject({ ok: true })
    expect(origins).toEqual(['https://awiki.me', 'https://awiki.ai', 'https://awiki.me'])
  })

})
