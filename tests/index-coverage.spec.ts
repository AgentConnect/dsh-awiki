import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import AwikiService, { AWIKI_LOGOUT_CONFIRMATION } from '../src/index.ts'
import type { Config } from '../src/index.ts'
import type {
  AwikiClientOptions,
  AwikiSdkListenerClient,
  AwikiSdkListenerRealtimeEvent,
} from '../src/provider-api.ts'
import { FakeAwikiClient, installTestSettings, setup } from './harness.ts'

let context: Context | undefined

afterEach(async () => {
  await context?.fiber.dispose()
  context = undefined
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function baseConfig(overrides: Partial<Config> = {}): Config {
  return {
    userServiceUrl: 'https://users.awiki.example',
    userServiceDomain: 'awiki.example',
    messageServiceUrl: 'https://messages.awiki.example',
    messageServicePublicUrl: 'https://messages.awiki.example',
    messageServiceDid: 'did:wba:messages.awiki.example',
    stateRoot: '/tmp/awiki-index-coverage',
    ...overrides,
  }
}

async function directService(config: Config): Promise<{ readonly ctx: Context; readonly service: AwikiService }> {
  const ctx = new Context()
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(ApprovalService)
  await installTestSettings(ctx)
  let service: AwikiService | undefined
  const plugin = Object.assign((scope: Context) => {
    service = new AwikiService(scope, config)
  }, { inject: ['tools', 'settings'] })
  await ctx.plugin(plugin)
  if (service === undefined) throw new Error('direct AWiki service was not constructed')
  return { ctx, service }
}

async function flushMicrotasks(assertion: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (assertion()) return
    await Promise.resolve()
  }
  expect(assertion()).toBe(true)
}

async function recoveryFixture(label: string) {
  const stateRoot = await mkdtemp(join(tmpdir(), `dsh-awiki-recovery-${label}-`))
  const mounted = await directService(baseConfig({
    stateRoot,
    listenerEnabled: true,
    listenerAllowedPeers: ['did:awiki:bob'],
    listenerWorkspacePath: join(stateRoot, 'workspace'),
  }))
  mounted.ctx.effect(() => () => rm(stateRoot, { recursive: true, force: true }), 'remove listener recovery state')
  const pendingEvents: Array<(event: AwikiSdkListenerRealtimeEvent | null) => void> = []
  let syncCalls = 0
  let realtimeStarts = 0
  let realtimeStops = 0
  let realtimeStartFailures = 0
  let failNextSync = false
  const listener: AwikiSdkListenerClient = {
    syncNow: () => {
      syncCalls += 1
      if (failNextSync) {
        failNextSync = false
        return Promise.reject(new Error('injected post-start sync failure'))
      }
      return Promise.resolve()
    },
    startRealtime: () => {
      realtimeStarts += 1
      if (realtimeStartFailures > 0) {
        realtimeStartFailures -= 1
        return Promise.reject(new Error('injected replacement start failure'))
      }
      let release: ((event: AwikiSdkListenerRealtimeEvent | null) => void) | undefined
      return Promise.resolve({
        nextEvent: () => new Promise<AwikiSdkListenerRealtimeEvent | null>((resolve) => {
          release = resolve
          pendingEvents.push(resolve)
        }),
        stop: () => {
          realtimeStops += 1
          release?.(null)
          return Promise.resolve()
        },
      })
    },
    listConversations: () => Promise.resolve({ items: [], hasMore: false }),
    getHistory: () => Promise.resolve({ items: [], hasMore: false }),
    markConversationRead: () => Promise.resolve(0),
    sendText: () => Promise.reject(new Error('unexpected listener send')),
  }
  const client = Object.assign(new FakeAwikiClient(), { listener })
  const internal = mounted.service as unknown as {
    workspaceContext?: Context
    provider?: {
      listener?: unknown
      listenerStartup?: Promise<void>
      listenerCleanup?: Promise<void>
      listenerRestartTimer?: ReturnType<typeof setTimeout>
      listenerRestartAttempt: number
      listenerRecoveryBlocked: boolean
    }
    stopListener(provider: NonNullable<typeof internal.provider>): Promise<void>
  }
  internal.workspaceContext = mounted.ctx
  const disposeProvider = mounted.service.registerClientFactory(() => client)
  await internal.provider?.listenerStartup
  return {
    ...mounted,
    internal,
    disposeProvider,
    failPostStartSync() {
      failNextSync = true
      const release = pendingEvents.shift()
      if (release === undefined) throw new Error('listener event waiter is unavailable')
      release({ kind: 'sync_required', cause: 'message', dirty: true, gapDetected: false })
    },
    failRealtimeStarts(count: number) { realtimeStartFailures = count },
    counts: () => ({ syncCalls, realtimeStarts, realtimeStops }),
  }
}

describe('AWiki Host defensive branches', () => {
  it('resolves the public tenant and private DSH state defaults', async () => {
    const dshHome = '/tmp/dsh-awiki-product-defaults'
    vi.stubEnv('DSH_HOME', dshHome)
    const mounted = await directService({})
    context = mounted.ctx
    let options: AwikiClientOptions | undefined
    mounted.service.registerClientFactory((resolved) => {
      options = resolved
      return new FakeAwikiClient()
    })
    expect(options).toMatchObject({
      userServiceUrl: 'https://awiki.ai',
      userServiceDomain: 'awiki.ai',
      messageServiceUrl: 'https://awiki.ai',
      messageServicePublicUrl: 'https://awiki.ai',
      messageServiceDid: 'did:wba:awiki.ai',
      stateRoot: join(dshHome, 'awiki', 'im-core'),
    })
    const internal = mounted.service as unknown as {
      readonly resolved: { readonly listener: { readonly workspacePath: string } }
    }
    expect(internal.resolved.listener.workspacePath).toBe(join(dshHome, 'workspaces', 'awiki'))
  })

  it('applies constructor defaults before schema materialization', async () => {
    const mounted = await directService(baseConfig())
    context = mounted.ctx
    await expect(mounted.service.getConfig()).resolves.toEqual({
      ok: true,
      value: { pollIntervalMs: 3_000, attachmentMaxBytes: 10 * 1024 * 1024, handleRecoveryPhoneEnabled: false },
    })
  })

  it('enables phone Recovery only from canonical schema-v1 server-info', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      schema_version: 1,
      identity: { handle_recovery: { methods: [{ id: 'phone', enabled: true, verification: { required: true, type: 'sms_otp' } }] } },
    }), { status: 200, headers: { 'content-type': 'application/json' } }))))
    const mounted = await directService(baseConfig())
    context = mounted.ctx
    await expect(mounted.service.getConfig()).resolves.toMatchObject({
      ok: true, value: { handleRecoveryPhoneEnabled: true },
    })
  })

  it('does not leave a listener slot before identity exists and starts it after registration', async () => {
    const mounted = await directService(baseConfig({
      listenerEnabled: true,
      listenerAllowedPeers: ['did:awiki:bob'],
      listenerWorkspacePath: '/tmp/dsh-awiki-provider-before-identity',
    }))
    context = mounted.ctx
    const syncReasons: string[] = []
    let realtimeStarts = 0
    let release: ((event: null) => void) | undefined
    const listener: AwikiSdkListenerClient = {
      syncNow: (reason) => { syncReasons.push(reason); return Promise.resolve() },
      startRealtime: () => {
        realtimeStarts += 1
        return Promise.resolve({
          nextEvent: () => new Promise<null>(resolve => { release = resolve }),
          stop: () => { release?.(null); return Promise.resolve() },
        })
      },
      listConversations: () => Promise.resolve({ items: [], hasMore: false }),
      getHistory: () => Promise.resolve({ items: [], hasMore: false }),
      markConversationRead: () => Promise.resolve(0),
      sendText: () => Promise.reject(new Error('unexpected listener send')),
    }
    const client = Object.assign(new FakeAwikiClient(), { identity: null, listener })
    const internal = mounted.service as unknown as {
      workspaceContext?: Context
      provider?: { listener?: unknown; listenerStartup?: Promise<void> }
    }
    internal.workspaceContext = mounted.ctx
    mounted.service.registerClientFactory(() => client)
    await internal.provider?.listenerStartup
    expect(internal.provider?.listener).toBeUndefined()
    expect(syncReasons).toEqual([])

    await expect(mounted.service.registerIdentity({ handle: 'alice', phone: '+15555550123', otp: '123456' }))
      .resolves.toMatchObject({ ok: true })
    expect(syncReasons).toEqual(['session_start'])
    expect(realtimeStarts).toBe(1)
    expect(internal.provider?.listener).toBeDefined()
  })

  it('atomically releases a failed startup and retries after sign-in', async () => {
    const mounted = await directService(baseConfig({
      listenerEnabled: true,
      listenerAllowedPeers: ['did:awiki:bob'],
      listenerWorkspacePath: '/tmp/dsh-awiki-startup-retry',
    }))
    context = mounted.ctx
    let syncCalls = 0
    let release: ((event: null) => void) | undefined
    const listener: AwikiSdkListenerClient = {
      syncNow: () => {
        syncCalls += 1
        return syncCalls === 1 ? Promise.reject(new Error('startup sync failed')) : Promise.resolve()
      },
      startRealtime: () => Promise.resolve({
        nextEvent: () => new Promise<null>(resolve => { release = resolve }),
        stop: () => { release?.(null); return Promise.resolve() },
      }),
      listConversations: () => Promise.resolve({ items: [], hasMore: false }),
      getHistory: () => Promise.resolve({ items: [], hasMore: false }),
      markConversationRead: () => Promise.resolve(0),
      sendText: () => Promise.reject(new Error('unexpected listener send')),
    }
    const client = Object.assign(new FakeAwikiClient(), { listener })
    const internal = mounted.service as unknown as {
      workspaceContext?: Context
      provider?: { listener?: unknown; listenerStartup?: Promise<void> }
    }
    internal.workspaceContext = mounted.ctx
    mounted.service.registerClientFactory(() => client)
    await internal.provider?.listenerStartup
    expect(internal.provider?.listener).toBeUndefined()

    await expect(mounted.service.login()).resolves.toMatchObject({ ok: true })
    await internal.provider?.listenerStartup
    expect(syncCalls).toBe(2)
    expect(internal.provider?.listener).toBeDefined()
  })

  it('observes a post-start failure and creates exactly one bounded-backoff replacement', async () => {
    vi.useFakeTimers()
    const f = await recoveryFixture('replacement')
    context = f.ctx
    expect(f.counts()).toMatchObject({ syncCalls: 1, realtimeStarts: 1 })

    f.failPostStartSync()
    await flushMicrotasks(() => f.internal.provider?.listenerRestartTimer !== undefined)
    expect(f.internal.provider?.listener).toBeUndefined()
    expect(f.counts()).toMatchObject({ realtimeStarts: 1, realtimeStops: 1 })

    await expect(f.service.login()).resolves.toMatchObject({ ok: true })
    await vi.advanceTimersByTimeAsync(999)
    expect(f.counts().realtimeStarts).toBe(1)
    await vi.advanceTimersByTimeAsync(1)
    await f.internal.provider?.listenerStartup
    expect(f.counts().realtimeStarts).toBe(2)

    expect(f.counts()).toMatchObject({ syncCalls: 3, realtimeStarts: 2 })
    expect(f.internal.provider?.listener).toBeDefined()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(f.counts().realtimeStarts).toBe(2)
  })

  it('continues bounded backoff across replacement startup failures under one generation fence', async () => {
    vi.useFakeTimers()
    const f = await recoveryFixture('replacement-start-failures')
    context = f.ctx
    f.failRealtimeStarts(7)
    f.failPostStartSync()
    await flushMicrotasks(() => f.internal.provider?.listenerRestartTimer !== undefined)

    const delays = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000]
    for (const [index, delay] of delays.entries()) {
      await vi.advanceTimersByTimeAsync(delay - 1)
      expect(f.counts().realtimeStarts).toBe(index + 1)
      await vi.advanceTimersByTimeAsync(1)
      await f.internal.provider?.listenerStartup
      await flushMicrotasks(() => f.counts().realtimeStarts === index + 2
        && f.internal.provider?.listenerRestartTimer !== undefined)
      expect(f.internal.provider?.listenerRestartAttempt).toBe(Math.min(index + 2, 6))
    }
    await f.disposeProvider()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(f.counts().realtimeStarts).toBe(8)
  })

  it('resets accumulated backoff only after one replacement remains stable for 60 seconds', async () => {
    vi.useFakeTimers()
    const f = await recoveryFixture('stable-reset')
    context = f.ctx
    f.failPostStartSync()
    await flushMicrotasks(() => f.internal.provider?.listenerRestartTimer !== undefined)
    await vi.advanceTimersByTimeAsync(1_000)
    await f.internal.provider?.listenerStartup
    expect(f.counts().realtimeStarts).toBe(2)
    expect(f.internal.provider?.listenerRestartAttempt).toBe(1)

    await vi.advanceTimersByTimeAsync(60_000)
    f.failPostStartSync()
    await flushMicrotasks(() => f.internal.provider?.listenerRestartTimer !== undefined)
    expect(f.internal.provider?.listenerRestartAttempt).toBe(1)
    await vi.advanceTimersByTimeAsync(999)
    expect(f.counts().realtimeStarts).toBe(2)
    await vi.advanceTimersByTimeAsync(1)
    await f.internal.provider?.listenerStartup
    expect(f.counts().realtimeStarts).toBe(3)
    expect(f.internal.provider?.listener).toBeDefined()
  })

  it('blocks every later restart when failed-listener cleanup cannot quiesce', async () => {
    vi.useFakeTimers()
    const f = await recoveryFixture('cleanup-failure')
    context = f.ctx
    const failed = f.internal.provider?.listener as { dispose(): Promise<void> } | undefined
    if (failed === undefined) throw new Error('active listener is unavailable')
    vi.spyOn(failed, 'dispose').mockRejectedValueOnce(new Error('injected cleanup failure'))

    f.failPostStartSync()
    await flushMicrotasks(() => f.internal.provider?.listenerRecoveryBlocked === true)
    expect(f.internal.provider?.listener).toBeUndefined()
    expect(f.internal.provider?.listenerRestartTimer).toBeUndefined()
    await expect(f.service.login()).resolves.toMatchObject({ ok: true })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(f.counts().realtimeStarts).toBe(1)
  })

  it.each(['sign-out', 'workspace', 'provider-disposal'] as const)(
    'fences a scheduled replacement after %s',
    async (fence) => {
      vi.useFakeTimers()
      const f = await recoveryFixture(fence)
      context = f.ctx
      f.failPostStartSync()
      await flushMicrotasks(() => f.internal.provider?.listenerRestartTimer !== undefined)

      const provider = f.internal.provider
      if (provider === undefined) throw new Error('listener provider is unavailable')
      if (fence === 'sign-out') {
        await expect(f.service.logout({ confirmation: AWIKI_LOGOUT_CONFIRMATION })).resolves.toMatchObject({
          ok: true,
          value: { status: 'signed-out' },
        })
      } else if (fence === 'workspace') {
        f.internal.workspaceContext = undefined
        await f.internal.stopListener(provider)
      } else {
        await f.disposeProvider()
      }

      await vi.advanceTimersByTimeAsync(60_000)
      expect(f.counts().realtimeStarts).toBe(1)
      expect(f.internal.provider?.listener).toBeUndefined()
    },
  )

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
    [{ listenerEnabled: true }, 'listenerAllowedPeers'],
    [{ listenerAllowedPeers: ['*'] }, 'listenerAllowedPeers'],
    [{ listenerWorkspacePath: 'relative/workspace' }, 'listenerWorkspacePath'],
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
      value: { status: 'registered', identity: { handle: 'alice' } },
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

  it('classifies configured-domain Handles before OTP and fails closed on untrusted responses', async () => {
    const harness = await setup()
    context = harness.ctx
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)

    fetch.mockResolvedValueOnce(new Response('', { status: 404 }))
    await expect(harness.ctx.awiki.inspectIdentityAccess({ handle: ' Alice ' })).resolves.toEqual({
      ok: true,
      value: { status: 'available', fullHandle: 'alice.awiki.example' },
    })
    expect(fetch).toHaveBeenLastCalledWith(
      new URL('https://users.awiki.example/.well-known/handle/alice'),
      expect.objectContaining({ method: 'GET', cache: 'no-store', redirect: 'error' }),
    )

    fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      handle: 'alice.awiki.example', did: 'did:wba:alice.awiki.example', status: 'active',
    }), { status: 200, headers: { 'content-type': 'application/json' } }))
    await expect(harness.ctx.awiki.inspectIdentityAccess({ handle: 'wba://alice.awiki.example' })).resolves.toEqual({
      ok: true,
      value: { status: 'existing', fullHandle: 'alice.awiki.example' },
    })

    await expect(harness.ctx.awiki.inspectIdentityAccess({ handle: 'alice.other.example' })).resolves.toMatchObject({
      ok: false, error: { code: 'invalid-request' },
    })
    expect(fetch).toHaveBeenCalledTimes(2)

    for (const response of [
      new Response('{not-json', { status: 200 }),
      new Response(JSON.stringify({ handle: 'mallory.awiki.example', did: 'did:wba:mallory', status: 'active' }), { status: 200 }),
      new Response('x'.repeat(64 * 1024 + 1), { status: 200 }),
      new Response('', { status: 500 }),
    ]) {
      fetch.mockResolvedValueOnce(response)
      await expect(harness.ctx.awiki.inspectIdentityAccess({ handle: 'alice' })).resolves.toMatchObject({
        ok: false, error: { code: 'remote' },
      })
    }
    fetch.mockRejectedValueOnce(new TypeError('offline'))
    await expect(harness.ctx.awiki.inspectIdentityAccess({ handle: 'alice' })).resolves.toMatchObject({
      ok: false, error: { code: 'network' },
    })
  })

  it('validates profile, recovery, group, and mention Remote inputs before provider dispatch', async () => {
    const harness = await setup()
    context = harness.ctx
    await expect(harness.ctx.awiki.getProfile()).resolves.toMatchObject({
      ok: true,
      value: { did: 'did:awiki:alice', displayName: 'Alice', bio: '', tags: [] },
    })
    await expect(harness.ctx.awiki.updateProfile({
      displayName: ' Alice Zhang ',
      bio: ' Desktop maintainer ',
      tags: [' Desktop ', 'Rust'],
    })).resolves.toMatchObject({
      ok: true,
      value: { displayName: 'Alice Zhang', bio: 'Desktop maintainer', tags: ['Desktop', 'Rust'] },
    })
    await expect(harness.ctx.awiki.updateProfile({
      displayName: '', bio: '', tags: [],
    })).resolves.toMatchObject({ ok: false, error: { code: 'invalid-request' } })

    await expect(harness.ctx.awiki.sendRecoveryOtp({
      fullHandle: ' @alice.awiki.example ',
      phone: ' +15555550123 ',
    })).resolves.toMatchObject({
      ok: true,
      value: { operationId: 'recovery-1', fullHandle: 'alice.awiki.example' },
    })
    await expect(harness.ctx.awiki.prepareRecovery({
      operationId: ' recovery-1 ',
      phone: ' +15555550123 ',
      otp: ' 123456 ',
    })).resolves.toMatchObject({ ok: true, value: { phase: 'ready_to_commit' } })
    await expect(harness.ctx.awiki.prepareRecovery({
      operationId: 'recovery-1', phone: '+15555550123', otp: 'secret-code',
    })).resolves.toMatchObject({ ok: false, error: { code: 'invalid-request' } })

    const groupDid = 'did:awiki:release-crew' as never
    await expect(harness.ctx.awiki.getGroup({ groupDid })).resolves.toMatchObject({
      ok: true, value: { groupDid, myRole: 'owner' },
    })
    await expect(harness.ctx.awiki.joinGroup({ groupDid })).resolves.toMatchObject({ ok: true })
    await expect(harness.ctx.awiki.listGroupMembers({ groupDid, limit: 50 })).resolves.toMatchObject({
      ok: true, value: { pageGroup: groupDid, items: expect.any(Array) },
    })
    await expect(harness.ctx.awiki.listGroupMembers({ groupDid, limit: 101 })).resolves.toMatchObject({
      ok: false, error: { code: 'invalid-request' },
    })
    await expect(harness.ctx.awiki.addGroupMember({ groupDid, member: 'bob', role: 'admin' })).resolves.toMatchObject({
      ok: false, error: { code: 'invalid-request' },
    })
    await expect(harness.ctx.awiki.removeGroupMember({ groupDid, member: 'bob' })).resolves.toMatchObject({ ok: true })
    await expect(harness.ctx.awiki.leaveGroup({ groupDid })).resolves.toMatchObject({ ok: true })

    const validMention = {
      id: 'mention-bob', start: 8, end: 12, did: 'did:awiki:bob' as never, displayName: 'Bob',
    }
    await expect(harness.ctx.awiki.sendText({
      target: { kind: 'group', group: groupDid },
      text: '😀 hello @Bob',
      mentions: [validMention],
      idempotencyKey: 'mention-message-1',
    })).resolves.toMatchObject({ ok: true })
    await expect(harness.ctx.awiki.sendText({
      target: { kind: 'direct', peer: 'did:awiki:bob' },
      text: '@Bob',
      mentions: [{ ...validMention, start: 0, end: 4 }],
      idempotencyKey: 'invalid-direct-mention',
    })).resolves.toMatchObject({ ok: false, error: { code: 'invalid-request' } })
    await expect(harness.ctx.awiki.sendText({
      target: { kind: 'group', group: groupDid },
      text: '@Bob @Alice',
      mentions: [
        { ...validMention, start: 0, end: 4 },
        { ...validMention, id: 'mention-alice', start: 3, end: 10, did: 'did:awiki:alice' as never },
      ],
      idempotencyKey: 'invalid-overlap',
    })).resolves.toMatchObject({ ok: false, error: { code: 'invalid-request' } })
  })

  it('applies one recovered Host session once even when applied status is queried repeatedly', async () => {
    const harness = await setup()
    context = harness.ctx
    harness.client.recoveryProgress = { ...harness.client.recoveryProgress, phase: 'applied' }
    const sessions: unknown[] = []
    harness.ctx.on('awiki/session', session => { sessions.push(session) })

    await expect(harness.ctx.awiki.getRecoveryStatus({ operationId: 'recovery-1' }))
      .resolves.toMatchObject({ ok: true, value: { phase: 'applied' } })
    await expect(harness.ctx.awiki.getRecoveryStatus({ operationId: 'recovery-1' }))
      .resolves.toMatchObject({ ok: true, value: { phase: 'applied' } })
    expect(sessions).toEqual([{
      status: 'active',
      identity: expect.objectContaining({ did: harness.client.recoveryProgress.currentDid }),
    }])
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
