import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  AwikiSdkListenerRealtimeEvent,
  AwikiSdkListenerRealtimeSession,
  AwikiSdkListenerSyncReason,
  AwikiSdkRealtimeClient,
} from '../src/provider-api.ts'
import { IdentityRealtimeSupervisor } from '../src/realtime-supervisor.ts'

class FakeSession implements AwikiSdkListenerRealtimeSession {
  readonly queued: Array<AwikiSdkListenerRealtimeEvent | null> = []
  stopCalls = 0
  connected = false
  private waiter: ((event: AwikiSdkListenerRealtimeEvent | null) => void) | undefined

  public constructor(readonly name: string, private readonly operations: string[]) {}

  nextEvent(): Promise<AwikiSdkListenerRealtimeEvent | null> {
    const event = this.queued.shift()
    if (event !== undefined || this.queued.length > 0) return Promise.resolve(event ?? null)
    return new Promise(resolve => { this.waiter = resolve })
  }

  getStatus(): Promise<{ readonly connected: boolean }> {
    return Promise.resolve({ connected: this.connected })
  }

  push(event: AwikiSdkListenerRealtimeEvent | null): void {
    const waiter = this.waiter
    if (waiter === undefined) return void this.queued.push(event)
    this.waiter = undefined
    waiter(event)
  }

  stop(): Promise<void> {
    this.stopCalls += 1
    this.operations.push(`stop:${this.name}`)
    const waiter = this.waiter
    this.waiter = undefined
    waiter?.(null)
    return Promise.resolve()
  }
}

class FakeRealtime implements AwikiSdkRealtimeClient {
  readonly operations: string[] = []
  readonly syncReasons: AwikiSdkListenerSyncReason[] = []
  readonly sessions: FakeSession[] = []
  startFailures = 0

  syncNow(reason: AwikiSdkListenerSyncReason): Promise<void> {
    this.syncReasons.push(reason)
    this.operations.push(`sync:${reason}`)
    return Promise.resolve()
  }

  startRealtime(): Promise<AwikiSdkListenerRealtimeSession> {
    if (this.startFailures > 0) {
      this.startFailures -= 1
      return Promise.reject(new Error('injected start failure'))
    }
    const session = this.sessions.shift() ?? new FakeSession('default', this.operations)
    this.operations.push(`start:${session.name}`)
    return Promise.resolve(session)
  }
}

async function eventually(assertion: () => void): Promise<void> {
  let error: unknown
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      assertion()
      return
    } catch (caught) {
      error = caught
      await new Promise(resolve => setTimeout(resolve, 2))
    }
  }
  throw error
}

afterEach(() => { vi.useRealTimers() })

describe('identity realtime supervisor', () => {
  it('owns one WSS and schedules Direct, Group, and System Notification sync causes', async () => {
    const realtime = new FakeRealtime()
    const session = new FakeSession('first', realtime.operations)
    realtime.sessions.push(session)
    const causes: string[] = []
    const supervisor = new IdentityRealtimeSupervisor(realtime, {
      onSynchronized: cause => { causes.push(cause); return Promise.resolve() },
    })

    supervisor.start()
    await eventually(() => expect(realtime.operations).toEqual(['sync:session_start', 'start:first']))
    session.push({ kind: 'connection_state_changed', state: 'connected' })
    session.push({ kind: 'sync_required', cause: 'message', dirty: true, gapDetected: false })
    session.push({ kind: 'sync_required', cause: 'group', dirty: true, gapDetected: false })
    session.push({ kind: 'sync_required', cause: 'system_notification', dirty: true, gapDetected: false })
    await eventually(() => expect(causes).toEqual(['session_start', 'message', 'group', 'system_notification']))

    expect(supervisor.diagnostics()).toMatchObject({
      connected: true,
      activeSessionCount: 1,
      startCount: 1,
      stopCount: 0,
      maxActiveSessionCount: 1,
      retryCount: 0,
      lifecyclePhase: 'connected',
      lastCommittedSyncCause: 'system_notification',
    })
    await supervisor.dispose()
    expect(session.stopCalls).toBe(1)
  })

  it('recovers a closed stream as stop, reconnect sync, and one replacement', async () => {
    const realtime = new FakeRealtime()
    const first = new FakeSession('first', realtime.operations)
    const second = new FakeSession('second', realtime.operations)
    realtime.sessions.push(first, second)
    const supervisor = new IdentityRealtimeSupervisor(realtime)

    supervisor.start()
    await eventually(() => expect(realtime.operations).toContain('start:first'))
    first.push(null)
    await eventually(() => expect(realtime.operations).toContain('start:second'))

    expect(realtime.operations).toEqual([
      'sync:session_start', 'start:first', 'stop:first', 'sync:websocket_reconnect', 'start:second',
    ])
    expect(supervisor.diagnostics()).toMatchObject({
      activeSessionCount: 1,
      startCount: 2,
      stopCount: 1,
      maxActiveSessionCount: 1,
      retryCount: 0,
      lifecyclePhase: 'connected',
    })
    await supervisor.dispose()
    expect(second.stopCalls).toBe(1)
  })

  it('retries startup without a fixed attempt ceiling and dispose wakes retry sleep', async () => {
    vi.useFakeTimers()
    const realtime = new FakeRealtime()
    realtime.startFailures = 2
    const session = new FakeSession('eventual', realtime.operations)
    realtime.sessions.push(session)
    const supervisor = new IdentityRealtimeSupervisor(realtime)

    supervisor.start()
    await vi.advanceTimersByTimeAsync(1_000)
    await vi.advanceTimersByTimeAsync(2_000)
    expect(realtime.operations.filter(value => value === 'sync:session_start')).toHaveLength(3)
    expect(realtime.operations).toContain('start:eventual')
    await supervisor.dispose()

    const failing = new FakeRealtime()
    failing.startFailures = 100
    const stopped = new IdentityRealtimeSupervisor(failing)
    stopped.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(stopped.diagnostics()).toMatchObject({
      activeSessionCount: 0,
      retryCount: 1,
      lifecyclePhase: 'backoff',
      lastFailureCode: 'start_failed',
    })
    await stopped.dispose()
    expect(stopped.diagnostics()).toMatchObject({
      activeSessionCount: 0,
      lifecyclePhase: 'stopped',
    })

    const syncFailure = new FakeRealtime()
    syncFailure.syncNow = () => Promise.reject(Object.assign(
      new Error('private sync detail'),
      { realtimeFailureCode: 'sync.retry.service_unavailable' },
    ))
    const syncStopped = new IdentityRealtimeSupervisor(syncFailure)
    syncStopped.start()
    await vi.advanceTimersByTimeAsync(0)
    expect(syncStopped.diagnostics()).toMatchObject({
      activeSessionCount: 0,
      retryCount: 1,
      lifecyclePhase: 'backoff',
      lastFailureCode: 'sync.retry.service_unavailable',
    })
    await syncStopped.dispose()
  })
})
