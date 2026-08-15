import { afterEach, describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { ApprovalOutcome } from '@deepseek-ai/dsh-user-approval'
import { remoteMethods } from '@deepseek-ai/dsh-typert-protocol'
import {
  AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION,
  AWIKI_HISTORY_TOOL,
  AWIKI_IDENTITY_STATUS_TOOL,
  AWIKI_LIST_CONVERSATIONS_TOOL,
  AWIKI_SEND_ATTACHMENT_TOOL,
  AWIKI_SEND_MESSAGE_TOOL,
} from '../src/index.ts'
import { ATTACHMENT, executeTool, FakeAwikiClient, setup, testAgent } from './harness.ts'

let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
})

describe('AWiki Host service', () => {
  it('exports only browser-safe Remote operations and configuration', async () => {
    const harness = await setup({ pollIntervalMs: 5_000 })
    context = harness.ctx
    expect(remoteMethods(harness.ctx.awiki).map(marker => marker.method)).toEqual([
      'getConfig',
      'getIdentity',
      'sendRegistrationOtp',
      'registerIdentity',
      'updateDisplayName',
      'resolvePeer',
      'listConversations',
      'getHistory',
      'markConversationRead',
      'sendText',
      'sendAttachment',
      'downloadAttachment',
      'clearLocalData',
    ])
    await expect(harness.ctx.awiki.getConfig()).resolves.toEqual({
      ok: true,
      value: { pollIntervalMs: 5_000, attachmentMaxBytes: 10 * 1024 * 1024 },
    })
    expect(JSON.stringify(await harness.ctx.awiki.getConfig())).not.toContain('statePath')
    expect(JSON.stringify(await harness.ctx.awiki.getConfig())).not.toContain('ServiceUrl')
  })

  it('uses one registered identity and exposes conversations and history', async () => {
    const harness = await setup()
    context = harness.ctx
    await expect(harness.ctx.awiki.getIdentity()).resolves.toMatchObject({ ok: true, value: { handle: 'alice' } })
    await expect(harness.ctx.awiki.resolvePeer({ peer: 'bob' })).resolves.toMatchObject({
      ok: true,
      value: { did: 'did:awiki:bob', handle: 'bob' },
    })
    await expect(harness.ctx.awiki.listConversations()).resolves.toMatchObject({
      ok: true,
      value: { items: [{ kind: 'direct', title: 'Bob' }] },
    })
    await expect(harness.ctx.awiki.getHistory({ conversationId: 'conversation-1' as never })).resolves.toMatchObject({
      ok: true,
      value: { items: [{ id: 'message-1', content: { kind: 'text', text: 'hello' } }] },
    })
    await expect(harness.ctx.awiki.markConversationRead({ conversationId: 'conversation-1' as never }))
      .resolves.toEqual({ ok: true, value: 1 })
    expect(harness.client.markedConversation).toBe('conversation-1')
  })

  it('resolves SDK limits and a fail-closed attachment-origin allowlist', async () => {
    const harness = await setup({
      attachmentMaxBytes: 17,
      allowedAttachmentOrigins: ['https://objects-a.awiki.example', 'https://objects-b.awiki.example'],
    })
    context = harness.ctx
    expect(harness.options).toMatchObject({
      allowedAttachmentOrigins: ['https://objects-a.awiki.example', 'https://objects-b.awiki.example'],
      attachmentMaxBytes: 17,
      allowInsecureLoopbackForTesting: false,
    })
    const defaulted = await setup()
    await defaulted.ctx.fiber.dispose()
    expect(defaulted.options.allowedAttachmentOrigins).toEqual(['https://messages.awiki.example'])
  })

  it('enforces canonical Base64 and the complete decoded attachment limit', async () => {
    const harness = await setup({ attachmentMaxBytes: 5 })
    context = harness.ctx
    await expect(harness.ctx.awiki.sendAttachment({
      target: { kind: 'direct', peer: 'bob' },
      fileName: 'hello.txt',
      mimeType: 'text/plain',
      bytesBase64: 'aGVsbG8=',
      idempotencyKey: 'attachment-1',
    })).resolves.toMatchObject({ ok: true })
    expect(harness.client.attachmentBytes).toEqual(new TextEncoder().encode('hello'))
    await expect(harness.ctx.awiki.sendAttachment({
      target: { kind: 'direct', peer: 'bob' },
      fileName: 'large.txt',
      mimeType: 'text/plain',
      bytesBase64: 'aGVsbG8h',
      idempotencyKey: 'attachment-large',
    })).resolves.toEqual({
      ok: false,
      error: { code: 'attachment-too-large', message: "The attachment exceeds this deployment's size limit." },
    })
    await expect(harness.ctx.awiki.sendAttachment({
      target: { kind: 'direct', peer: 'bob' },
      fileName: 'bad.txt',
      mimeType: 'text/plain',
      bytesBase64: 'a===',
      idempotencyKey: 'attachment-bad',
    })).resolves.toMatchObject({ ok: false, error: { code: 'invalid-request' } })
    expect(harness.client.sentAttachments).toBe(1)
  })

  it('returns verified downloads as Base64 and rejects inconsistent byte lengths', async () => {
    const harness = await setup()
    context = harness.ctx
    await expect(harness.ctx.awiki.downloadAttachment({
      attachmentId: 'attachment-1' as never,
      messageId: 'message-1' as never,
    })).resolves.toEqual({
      ok: true,
      value: { attachment: ATTACHMENT, bytesBase64: 'aGVsbG8=' },
    })
    harness.client.downloadAttachment = () => Promise.resolve({
      attachment: { ...ATTACHMENT, id: 'bad' as never },
      bytes: new Uint8Array([1]),
    })
    await expect(harness.ctx.awiki.downloadAttachment({
      attachmentId: 'bad' as never,
      messageId: 'message-1' as never,
    })).resolves.toMatchObject({
      ok: false,
      error: { code: 'remote' },
    })
  })

  it('redacts SDK messages, causes, and unknown thrown values', async () => {
    const harness = await setup()
    context = harness.ctx
    harness.client.failure = Object.assign(new Error('secret remote response token=abc'), {
      name: 'AwikiImError',
      code: 'forbidden',
      status: 403,
      cause: new Error('private key'),
    })
    await expect(harness.ctx.awiki.getIdentity()).resolves.toEqual({
      ok: false,
      error: { code: 'forbidden', message: 'The AWiki operation is not permitted.' },
    })
    harness.client.failure = new Proxy({}, { get: () => { throw new Error('secret trap') } })
    await expect(harness.ctx.awiki.getIdentity()).resolves.toEqual({
      ok: false,
      error: { code: 'remote', message: 'The AWiki service rejected the operation.' },
    })
  })

  it('rejects an unconfirmed reset and clears the provider only after the exact acknowledgement', async () => {
    const harness = await setup()
    context = harness.ctx
    await expect(harness.ctx.awiki.clearLocalData({ confirmation: 'clear' })).resolves.toEqual({
      ok: false,
      error: { code: 'invalid-request', message: 'The AWiki request is invalid.' },
    })
    expect(harness.client.localDataCleared).toBe(0)

    await expect(harness.ctx.awiki.clearLocalData({
      confirmation: AWIKI_CLEAR_LOCAL_DATA_CONFIRMATION,
    })).resolves.toEqual({ ok: true, value: { cleared: true } })
    expect(harness.client.localDataCleared).toBe(1)
  })

  it.each([
    [{ pollIntervalMs: 999 }, 'pollIntervalMs'],
    [{ pollIntervalMs: 60_001 }, 'pollIntervalMs'],
    [{ attachmentMaxBytes: 0 }, 'attachmentMaxBytes'],
    [{ userServiceUrl: 'http://public.example' }, 'userServiceUrl'],
    [{ messageServiceUrl: 'relative' }, 'messageServiceUrl'],
    [{ messageServicePublicUrl: 'http://public.example' }, 'messageServicePublicUrl'],
    [{ userServiceDomain: 'https://awiki.example' }, 'userServiceDomain'],
    [{ messageServiceDid: 'messages.awiki.example' }, 'messageServiceDid'],
    [{ messageServiceDid: 'did:key:z6Mkexample' }, 'messageServiceDid'],
    [{ allowedAttachmentOrigins: ['https://objects.awiki.example/path'] }, 'allowedAttachmentOrigins'],
    [{ allowedAttachmentOrigins: ['https://objects.awiki.example', 'https://objects.awiki.example'] }, 'allowedAttachmentOrigins'],
    [{ allowedAttachmentOrigins: ['http://127.0.0.1:8080'] }, 'allowedAttachmentOrigins'],
  ])('fails loud on invalid config %o', async (config, message) => {
    await expect(setup(config)).rejects.toThrow(message)
  })
})

describe('AWiki model tools and lifecycle', () => {
  it('registers exactly five tools and removes them with the service fiber', async () => {
    const harness = await setup()
    context = harness.ctx
    const names = harness.ctx.tools.schemas().map(tool => tool.name).filter(name => name.startsWith('awiki_')).sort()
    expect(names).toEqual([
      AWIKI_HISTORY_TOOL,
      AWIKI_IDENTITY_STATUS_TOOL,
      AWIKI_LIST_CONVERSATIONS_TOOL,
      AWIKI_SEND_ATTACHMENT_TOOL,
      AWIKI_SEND_MESSAGE_TOOL,
    ].sort())
    await harness.serviceFiber.dispose()
    expect(harness.ctx.tools.schemas().map(tool => tool.name).filter(name => name.startsWith('awiki_'))).toEqual([])
  })

  it('approves both send tools, lets reads run, and delegates unrelated tools', async () => {
    const harness = await setup()
    context = harness.ctx
    const agent = testAgent(harness.ctx)
    const asked: string[] = []
    harness.ctx.on('approval/request', (request) => {
      asked.push(request.toolName)
      return Promise.resolve<ApprovalOutcome>('allowed-once')
    })
    let unrelatedDelegated = false
    harness.ctx.on('tools/pre-execute', (exec, next) => {
      if (exec.name !== 'unrelated') return next()
      unrelatedDelegated = true
      return Promise.resolve({ kind: 'deny', reason: 'delegated sentinel' })
    })
    harness.ctx.effect(
      () => harness.ctx.tools.register({
        name: 'unrelated',
        description: 'test',
        parameters: { type: 'object', properties: {} },
        output: { schema: { type: 'null' }, render: () => [] },
        execute: () => Promise.resolve(null),
      }),
      'AWiki unrelated delegation probe',
    )

    await expect(executeTool(harness.ctx, agent, AWIKI_IDENTITY_STATUS_TOOL, {})).resolves.toMatchObject({ isError: false })
    await expect(executeTool(harness.ctx, agent, AWIKI_SEND_MESSAGE_TOOL, {
      target_kind: 'direct', target: 'bob', text: 'hello', idempotency_key: 'text-1',
    })).resolves.toMatchObject({ isError: false })
    await expect(executeTool(harness.ctx, agent, AWIKI_SEND_ATTACHMENT_TOOL, {
      target_kind: 'group', target: 'group-1', file_name: 'hello.txt', mime_type: 'text/plain',
      bytes_base64: 'aGVsbG8=', idempotency_key: 'file-1',
    })).resolves.toMatchObject({ isError: false })
    await expect(executeTool(harness.ctx, agent, 'unrelated', {})).resolves.toMatchObject({ isError: true })
    expect(asked).toEqual([AWIKI_SEND_MESSAGE_TOOL, AWIKI_SEND_ATTACHMENT_TOOL])
    expect(unrelatedDelegated).toBe(true)
  })

  it('does not dispatch a send when approval is denied', async () => {
    const harness = await setup()
    context = harness.ctx
    const agent = testAgent(harness.ctx)
    harness.ctx.on('approval/request', () => Promise.resolve<ApprovalOutcome>('rejected'))
    await expect(executeTool(harness.ctx, agent, AWIKI_SEND_MESSAGE_TOOL, {
      target_kind: 'direct', target: 'bob', text: 'no', idempotency_key: 'text-denied',
    })).resolves.toMatchObject({ isError: true })
    expect(harness.client.sentTexts).toBe(0)
  })

  it('clears the provider before awaited disposal and disposes the client once', async () => {
    const harness = await setup()
    context = harness.ctx
    await harness.providerFiber.dispose()
    await expect(harness.ctx.awiki.getIdentity()).resolves.toEqual({
      ok: false,
      error: { code: 'remote', message: 'AWiki client provider is unavailable.' },
    })
    expect(harness.client.disposed).toBe(1)
    await harness.serviceFiber.dispose()
    expect(harness.client.disposed).toBe(1)
  })

  it('disposes the client once when the Host service unloads before its provider', async () => {
    const harness = await setup()
    context = harness.ctx
    await harness.serviceFiber.dispose()
    expect(harness.client.disposed).toBe(1)
    await harness.providerFiber.dispose()
    expect(harness.client.disposed).toBe(1)
  })

  it('rejects a duplicate provider without constructing another client', async () => {
    const harness = await setup()
    context = harness.ctx
    let constructed = 0
    expect(() => harness.ctx.awiki.registerClientFactory(() => {
      constructed += 1
      return new FakeAwikiClient()
    })).toThrow('already registered')
    expect(constructed).toBe(0)
  })
})
