import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import AwikiService from '../src/index.ts'
import type { Config } from '../src/index.ts'
import { FakeAwikiClient, setup } from './harness.ts'

let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
})

function baseConfig(overrides: Partial<Config> = {}): Config {
  return {
    userServiceUrl: 'https://users.awiki.example',
    userServiceDomain: 'awiki.example',
    messageServiceUrl: 'https://messages.awiki.example',
    messageServicePublicUrl: 'https://messages.awiki.example',
    messageServiceDid: 'did:wba:messages.awiki.example',
    statePath: '/tmp/awiki-index-coverage.json',
    ...overrides,
  }
}

async function directService(config: Config): Promise<{ readonly ctx: Context; readonly service: AwikiService }> {
  const ctx = new Context()
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(ApprovalService)
  let service: AwikiService | undefined
  const plugin = Object.assign((scope: Context) => {
    service = new AwikiService(scope, config)
  }, { inject: ['tools'] })
  await ctx.plugin(plugin)
  if (service === undefined) throw new Error('direct AWiki service was not constructed')
  return { ctx, service }
}

describe('AWiki Host defensive branches', () => {
  it('applies constructor defaults before schema materialization', async () => {
    const mounted = await directService(baseConfig())
    context = mounted.ctx
    await expect(mounted.service.getConfig()).resolves.toEqual({
      ok: true,
      value: { pollIntervalMs: 3_000, attachmentMaxBytes: 10 * 1024 * 1024 },
    })
  })

  it('accepts each test-only loopback spelling and rejects URL credentials and fragments', async () => {
    const harness = await setup({
      allowInsecureLoopbackForTesting: true,
      userServiceUrl: 'http://localhost:8080',
      messageServiceUrl: 'http://127.0.0.1:8081',
      messageServicePublicUrl: 'http://[::1]:8082',
    })
    context = harness.ctx
    expect(harness.options).toMatchObject({
      userServiceUrl: 'http://localhost:8080',
      messageServiceUrl: 'http://127.0.0.1:8081',
      messageServicePublicUrl: 'http://[::1]:8082',
      allowedAttachmentOrigins: ['http://[::1]:8082'],
    })

    await expect(setup({ userServiceUrl: 'https://alice:secret@users.awiki.example' })).rejects.toThrow('credentials')
    await expect(setup({ messageServiceUrl: 'https://messages.awiki.example#private' })).rejects.toThrow('fragment')
  })

  it.each([
    [{ attachmentMaxBytes: 1.5 }, 'attachmentMaxBytes'],
    [{ pollIntervalMs: 1.5 }, 'pollIntervalMs'],
    [{ userServiceDomain: 'a'.repeat(254) }, 'userServiceDomain'],
    [{ messageServiceDid: 'did:wba:MESSAGES.AWIKI.EXAMPLE' }, 'messageServiceDid'],
    [{ messageServiceDid: 'did:wba:https://messages.awiki.example' }, 'messageServiceDid'],
  ])('rejects an additional invalid configuration branch %o', async (config, message) => {
    await expect(setup(config)).rejects.toThrow(message)
  })

  it('covers registration operations and preserves an attachment caption', async () => {
    const harness = await setup()
    context = harness.ctx
    await expect(harness.ctx.awiki.sendRegistrationOtp({ handle: 'alice', phone: '+15555550123' })).resolves.toEqual({
      ok: true,
      value: { retryAfterSeconds: 60, retryAt: '2026-08-14T00:01:00Z' },
    })
    await expect(harness.ctx.awiki.registerIdentity({ handle: 'alice', phone: '+15555550123', otp: '123456' })).resolves.toMatchObject({
      ok: true,
      value: { handle: 'alice' },
    })
    await expect(harness.ctx.awiki.updateDisplayName({ displayName: '新昵称' })).resolves.toMatchObject({
      ok: true,
      value: { handle: 'alice', displayName: '新昵称' },
    })
    await expect(harness.ctx.awiki.sendAttachment({
      target: { kind: 'direct', peer: 'bob' },
      fileName: 'hello.txt',
      mimeType: 'text/plain',
      bytesBase64: 'aGVsbG8=',
      caption: 'hello file',
      idempotencyKey: 'captioned-file',
    })).resolves.toMatchObject({
      ok: true,
      value: { content: { kind: 'attachment', caption: 'hello file' } },
    })
  })

  it('rejects encoded length overflow and noncanonical pad bits before dispatch', async () => {
    const harness = await setup({ attachmentMaxBytes: 5 })
    context = harness.ctx
    await expect(harness.ctx.awiki.sendAttachment({
      target: { kind: 'direct', peer: 'bob' },
      fileName: 'long.txt',
      mimeType: 'text/plain',
      bytesBase64: 'aGVsbG8hIQ==',
      idempotencyKey: 'encoded-overflow',
    })).resolves.toMatchObject({ ok: false, error: { code: 'attachment-too-large' } })
    await expect(harness.ctx.awiki.sendAttachment({
      target: { kind: 'direct', peer: 'bob' },
      fileName: 'noncanonical.txt',
      mimeType: 'text/plain',
      bytesBase64: 'Zh==',
      idempotencyKey: 'noncanonical-padding',
    })).resolves.toMatchObject({ ok: false, error: { code: 'invalid-request' } })
    expect(harness.client.sentAttachments).toBe(0)
  })

  it('normalizes primitive and unrecognized SDK failures', async () => {
    const harness = await setup()
    context = harness.ctx
    for (const failure of [
      'private failure',
      { name: 'OtherError', code: 'forbidden' },
      { name: 'AwikiImError', code: 403 },
      { name: 'AwikiImError', code: 'private-provider-code' },
      null,
    ]) {
      harness.client.failure = failure
      await expect(harness.ctx.awiki.getIdentity()).resolves.toEqual({
        ok: false,
        error: { code: 'remote', message: 'The AWiki service rejected the operation.' },
      })
    }
  })

  it('rejects raw bytes at every public DTO depth but accepts null and cyclic objects', async () => {
    const harness = await setup()
    context = harness.ctx
    harness.client.getIdentity = () => Promise.resolve(new Uint8Array([1]) as never)
    await expect(harness.ctx.awiki.getIdentity()).resolves.toMatchObject({ ok: false, error: { code: 'remote' } })
    harness.client.getIdentity = () => Promise.resolve({ nested: new Uint8Array([1]) } as never)
    await expect(harness.ctx.awiki.getIdentity()).resolves.toMatchObject({ ok: false, error: { code: 'remote' } })
    harness.client.getIdentity = () => Promise.resolve(null)
    await expect(harness.ctx.awiki.getIdentity()).resolves.toEqual({ ok: true, value: null })
    const cycle: { self?: unknown } = {}
    cycle.self = cycle
    harness.client.getIdentity = () => Promise.resolve(cycle as never)
    await expect(harness.ctx.awiki.getIdentity()).resolves.toEqual({ ok: true, value: cycle })
  })

  it('returns failed and oversized downloads without encoding their bytes', async () => {
    const harness = await setup({ attachmentMaxBytes: 2 })
    context = harness.ctx
    harness.client.failure = new Error('private download failure')
    await expect(harness.ctx.awiki.downloadAttachment({
      attachmentId: 'attachment-1' as never,
      messageId: 'message-1' as never,
    })).resolves.toMatchObject({ ok: false, error: { code: 'remote' } })
    harness.client.failure = undefined
    await expect(harness.ctx.awiki.downloadAttachment({
      attachmentId: 'attachment-1' as never,
      messageId: 'message-1' as never,
    })).resolves.toMatchObject({ ok: false, error: { code: 'attachment-too-large' } })
  })

  it('makes a provider disposer idempotent after its slot is already clear', async () => {
    const harness = await setup()
    context = harness.ctx
    await harness.providerFiber.dispose()
    const client = new FakeAwikiClient()
    const dispose = harness.ctx.awiki.registerClientFactory(() => client)
    await dispose()
    await dispose()
    expect(client.disposed).toBe(1)
  })
})
