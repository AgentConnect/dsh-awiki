import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import AwikiService from '../src/index.ts'
import type { Config } from '../src/index.ts'
import type {
  AwikiClientOptions,
  AwikiSdkAgentInboxClient,
  AwikiSdkListenerRealtimeSession,
  AwikiSdkListenerSyncReason,
  AwikiSdkRealtimeClient,
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
  const generatedStateRoot = config.stateRoot === '/tmp/awiki-index-coverage'
    ? await mkdtemp(join(tmpdir(), 'awiki-index-coverage-'))
    : undefined
  if (generatedStateRoot !== undefined) {
    ctx.effect(() => () => rm(generatedStateRoot, { recursive: true, force: true }), 'remove index coverage state')
  }
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(ApprovalService)
  await installTestSettings(ctx)
  let service: AwikiService | undefined
  const plugin = Object.assign((scope: Context) => {
    service = new AwikiService(scope, generatedStateRoot === undefined ? config : { ...config, stateRoot: generatedStateRoot })
  }, { inject: ['tools', 'settings'] })
  await ctx.plugin(plugin)
  if (service === undefined) throw new Error('direct AWiki service was not constructed')
  return { ctx, service }
}

async function flushMicrotasks(assertion: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (assertion()) return
    await new Promise(resolve => setTimeout(resolve, 2))
  }
  expect(assertion()).toBe(true)
}

function runtimePorts() {
  const syncReasons: AwikiSdkListenerSyncReason[] = []
  let realtimeStarts = 0
  let realtimeStops = 0
  let holdNextSync = false
  let releaseSync: (() => void) | undefined
  let releaseEvent: ((event: Awaited<ReturnType<AwikiSdkListenerRealtimeSession['nextEvent']>>) => void) | undefined
  const queuedEvents: Array<Awaited<ReturnType<AwikiSdkListenerRealtimeSession['nextEvent']>>> = []
  const realtime: AwikiSdkRealtimeClient = {
    syncNow: (reason) => {
      syncReasons.push(reason)
      const result = { pagesFetched: 1, messagesHydrated: 2, olderHistoryExcluded: true }
      if (!holdNextSync) return Promise.resolve(result)
      holdNextSync = false
      return new Promise<typeof result>(resolve => { releaseSync = () => resolve(result) })
    },
    startRealtime: () => {
      realtimeStarts += 1
      const session: AwikiSdkListenerRealtimeSession = {
        nextEvent: () => {
          if (queuedEvents.length > 0) return Promise.resolve(queuedEvents.shift() ?? null)
          return new Promise(resolve => { releaseEvent = resolve })
        },
        getStatus: () => Promise.resolve({ connected: true }),
        stop: () => {
          realtimeStops += 1
          releaseEvent?.(null)
          return Promise.resolve()
        },
      }
      return Promise.resolve(session)
    },
  }
  const agentInbox: AwikiSdkAgentInboxClient = {
    listConversations: () => Promise.resolve({ items: [], hasMore: false }),
    getHistory: () => Promise.resolve({ items: [], hasMore: false }),
    markConversationRead: () => Promise.resolve(0),
    sendText: () => Promise.reject(new Error('unexpected Agent send')),
  }
  return {
    realtime,
    agentInbox,
    holdSync() { holdNextSync = true },
    releaseSync() { releaseSync?.(); releaseSync = undefined },
    emit(event: Awaited<ReturnType<AwikiSdkListenerRealtimeSession['nextEvent']>>) {
      const release = releaseEvent
      releaseEvent = undefined
      if (release === undefined) queuedEvents.push(event)
      else release(event)
    },
    counts: () => ({ syncReasons: [...syncReasons], realtimeStarts, realtimeStops }),
  }
}

describe('AWiki Host defensive branches', () => {
  it('resolves the public tenant and private DSH state defaults', async () => {
    const dshHome = await mkdtemp(join(tmpdir(), 'dsh-awiki-product-defaults-'))
    vi.stubEnv('DSH_HOME', dshHome)
    const mounted = await directService({})
    mounted.ctx.effect(() => () => rm(dshHome, { recursive: true, force: true }), 'remove product-default state')
    context = mounted.ctx
    let options: AwikiClientOptions | undefined
    mounted.service.registerClientFactory((resolved) => {
      options = resolved
      return new FakeAwikiClient()
    })
    expect(options).toMatchObject({
      userServiceUrl: 'https://awiki.me',
      userServiceDomain: 'awiki.me',
      messageServiceUrl: 'https://awiki.me',
      messageServicePublicUrl: 'https://awiki.me',
      messageServiceDid: 'did:wba:awiki.me',
      stateRoot: join(dshHome, 'awiki', 'tenant-scopes', 'official-china-v1', 'im-core'),
    })
    const internal = mounted.service as unknown as {
      readonly resolved: {
        readonly realtimeEnabled: boolean
        readonly listenerEnabled: boolean
        readonly listener: { readonly workspacePath: string }
      }
    }
    expect(internal.resolved.realtimeEnabled).toBe(true)
    expect(internal.resolved.listenerEnabled).toBe(false)
    expect(internal.resolved.listener.workspacePath).toBe(join(dshHome, 'workspaces', 'awiki'))
  })

  it('applies constructor defaults before schema materialization', async () => {
    const mounted = await directService(baseConfig())
    context = mounted.ctx
    await expect(mounted.service.getConfig()).resolves.toMatchObject({
      ok: true,
      value: { pollIntervalMs: 3_000, attachmentMaxBytes: 10 * 1024 * 1024, handleRecoveryPhoneEnabled: false, tenantOnline: false, services: { modelProxy: { enabled: false }, guestGateway: { enabled: false } } },
    })
  })

  it('enables phone Recovery only from canonical schema-v1 server-info', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      schema_version: 1,
      identity: { handle_recovery: { methods: [{ id: 'phone', enabled: true, verification: { required: true, type: 'sms_otp' } }] } },
      services: {
        model_proxy: { enabled: true, base_url: 'https://model.tenant.example' },
        guest_gateway: { enabled: true, base_url: 'https://guest.tenant.example' },
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } }))))
    const mounted = await directService(baseConfig())
    context = mounted.ctx
    await expect(mounted.service.getConfig()).resolves.toMatchObject({
      ok: true,
      value: {
        handleRecoveryPhoneEnabled: true,
        tenantOnline: true,
        integrationGuideUrl: 'https://guest.tenant.example/guest/guide/integration',
        services: { modelProxy: { enabled: true }, guestGateway: { enabled: true } },
      },
    })
    expect(mounted.service.getTenantCapabilities()).toMatchObject({
      modelProxyBaseUrl: 'https://model.tenant.example',
      guestGatewayBaseUrl: 'https://guest.tenant.example',
    })
    expect(JSON.stringify(await mounted.service.getConfig())).not.toContain('model.tenant.example')
  })

  it('ignores missing, disabled, and unsafe optional services without disabling the tenant Core', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      schema_version: 1,
      services: {
        model_proxy: { enabled: true, base_url: 'http://model.remote.example' },
        guest_gateway: { enabled: false, base_url: 'https://guest.tenant.example' },
      },
    }), { status: 200, headers: { 'content-type': 'application/json' } }))))
    const mounted = await directService(baseConfig())
    context = mounted.ctx
    await expect(mounted.service.getConfig()).resolves.toMatchObject({
      ok: true,
      value: { tenantOnline: true, services: { modelProxy: { enabled: false }, guestGateway: { enabled: false } } },
    })
    await expect(mounted.service.getIntegration()).resolves.toMatchObject({ ok: false, error: { code: 'unavailable' } })
  })

  it('starts default identity realtime without Workspace and does not await startup sync', async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), 'dsh-awiki-default-realtime-'))
    const mounted = await directService(baseConfig({ stateRoot }))
    mounted.ctx.effect(() => () => rm(stateRoot, { recursive: true, force: true }), 'remove default realtime state')
    context = mounted.ctx
    const ports = runtimePorts()
    const client = Object.assign(new FakeAwikiClient(), {
      identity: null,
      realtime: ports.realtime,
      agentInbox: ports.agentInbox,
    })
    const internal = mounted.service as unknown as {
      provider?: { realtimeStartup?: Promise<void>; agentConsumer?: unknown }
    }
    mounted.service.registerClientFactory(() => client)
    await internal.provider?.realtimeStartup
    expect(ports.counts()).toEqual({ syncReasons: [], realtimeStarts: 0, realtimeStops: 0 })

    ports.holdSync()
    await expect(mounted.service.registerIdentity({ handle: 'alice', phone: '+15555550123', otp: '123456' }))
      .resolves.toMatchObject({ ok: true, value: { status: 'registered' } })
    await flushMicrotasks(() => ports.counts().syncReasons.length === 1)
    expect(ports.counts()).toMatchObject({ syncReasons: ['session_start'], realtimeStarts: 0 })
    expect(internal.provider?.agentConsumer).toBeUndefined()

    ports.releaseSync()
    await flushMicrotasks(() => ports.counts().realtimeStarts === 1)
    expect(mounted.service.getRealtimeDiagnostics()).toMatchObject({
      activeSessionCount: 1, startCount: 1, stopCount: 0,
    })
  })

  it('stops only the Agent consumer when Workspace composition is released', async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), 'dsh-awiki-workspace-realtime-'))
    const mounted = await directService(baseConfig({
      stateRoot,
      listenerEnabled: true,
      listenerAllowedPeers: ['did:awiki:bob'],
    }))
    mounted.ctx.effect(() => () => rm(stateRoot, { recursive: true, force: true }), 'remove workspace realtime state')
    context = mounted.ctx
    const ports = runtimePorts()
    const client = Object.assign(new FakeAwikiClient(), {
      realtime: ports.realtime,
      agentInbox: ports.agentInbox,
    })
    const internal = mounted.service as unknown as {
      workspaceContext?: Context
      provider?: { realtimeStartup?: Promise<void>; agentConsumer?: unknown }
      ensureAgentConsumer(provider: NonNullable<typeof internal.provider>): void
      stopAgentConsumer(provider: NonNullable<typeof internal.provider>): Promise<void>
    }
    internal.workspaceContext = mounted.ctx
    mounted.service.registerClientFactory(() => client)
    await internal.provider?.realtimeStartup
    if (internal.provider === undefined) throw new Error('provider unavailable')
    internal.ensureAgentConsumer(internal.provider)
    await flushMicrotasks(() => internal.provider?.agentConsumer !== undefined)
    await flushMicrotasks(() => ports.counts().realtimeStarts === 1)
    expect(mounted.service.getRealtimeDiagnostics().activeSessionCount).toBe(1)

    internal.workspaceContext = undefined
    await internal.stopAgentConsumer(internal.provider)
    expect(internal.provider.agentConsumer).toBeUndefined()
    expect(mounted.service.getRealtimeDiagnostics()).toMatchObject({ activeSessionCount: 1, stopCount: 0 })
  })

  it('projects a local Join request from WSS sync without a foreground management refresh', async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), 'dsh-awiki-realtime-join-'))
    const mounted = await directService(baseConfig({ stateRoot }))
    mounted.ctx.effect(() => () => rm(stateRoot, { recursive: true, force: true }), 'remove realtime Join state')
    context = mounted.ctx
    const ports = runtimePorts()
    const client = Object.assign(new FakeAwikiClient(), {
      realtime: ports.realtime,
      agentInbox: ports.agentInbox,
    })
    client.deviceJoinRequests = [{
      joinSessionId: 'join-1',
      candidateKeyFingerprint: 'sha256:fixture',
      issuedAt: '2026-08-23T00:00:00Z',
      expiresAt: '2026-08-23T00:10:00Z',
      state: 'pending',
      claimedByCurrentDevice: false,
      canStartVerification: true,
    }]
    mounted.service.registerClientFactory(() => client)
    await flushMicrotasks(() => ports.counts().realtimeStarts === 1)

    ports.emit({ kind: 'sync_required', cause: 'stream_recovery', dirty: true, gapDetected: false })
    await flushMicrotasks(() => (
      mounted.service.getRealtimeDiagnostics().localDeviceJoinRequestCountAfterSync === 1
    ))
    expect(client.deviceManagementSyncs).toBe(0)
    expect(mounted.service.getRealtimeDiagnostics()).toMatchObject({
      activeSessionCount: 1,
      startCount: 1,
      lastCommittedSyncCause: 'stream_recovery',
      lastSyncPagesFetched: 1,
      lastSyncMessagesHydrated: 2,
      lastSyncOlderHistoryExcluded: true,
      localDeviceJoinRequestCountAfterSync: 1,
    })
  })

  it('replaces the identity-bound WSS after a DID change without overlapping sessions', async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), 'dsh-awiki-realtime-replacement-'))
    const mounted = await directService(baseConfig({ stateRoot }))
    mounted.ctx.effect(() => () => rm(stateRoot, { recursive: true, force: true }), 'remove realtime replacement state')
    context = mounted.ctx
    const ports = runtimePorts()
    const client = Object.assign(new FakeAwikiClient(), {
      realtime: ports.realtime,
      agentInbox: ports.agentInbox,
    })
    const internal = mounted.service as unknown as {
      provider?: { runtimeReplacement?: Promise<void> }
      activateRegisteredIdentity(identity: NonNullable<FakeAwikiClient['identity']>): Promise<void>
    }
    mounted.service.registerClientFactory(() => client)
    await flushMicrotasks(() => ports.counts().realtimeStarts === 1)
    const replacement = { ...client.identity!, did: 'did:awiki:replacement' as never }
    client.identity = replacement

    await internal.activateRegisteredIdentity(replacement)
    await internal.provider?.runtimeReplacement
    await flushMicrotasks(() => ports.counts().realtimeStarts === 2)
    expect(ports.counts()).toMatchObject({ realtimeStarts: 2, realtimeStops: 1 })
    expect(mounted.service.getRealtimeDiagnostics()).toMatchObject({ activeSessionCount: 1, startCount: 1 })
  })

  it('supports an explicit realtime opt-out and rejects Agent without realtime', async () => {
    const mounted = await directService(baseConfig({ realtimeEnabled: false }))
    context = mounted.ctx
    const ports = runtimePorts()
    mounted.service.registerClientFactory(() => Object.assign(new FakeAwikiClient(), {
      realtime: ports.realtime,
      agentInbox: ports.agentInbox,
    }))
    await flushMicrotasks(() => true)
    expect(ports.counts()).toEqual({ syncReasons: [], realtimeStarts: 0, realtimeStops: 0 })

    await expect(setup({
      realtimeEnabled: false,
      listenerEnabled: true,
      listenerAllowedPeers: ['did:awiki:bob'],
    })).rejects.toThrow('listenerEnabled requires realtimeEnabled')
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
