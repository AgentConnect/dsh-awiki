import type { Logger } from '@deepseek-ai/cordis'
import type {
  AwikiSdkListenerRealtimeEvent,
  AwikiSdkListenerRealtimeSession,
  AwikiSdkRealtimeFailureCode,
  AwikiSdkListenerSyncCause,
  AwikiSdkListenerSyncReason,
  AwikiSdkRealtimeClient,
} from './provider-api.ts'

const RETRY_BASE_DELAY_MS = 1_000
const RETRY_MAX_DELAY_MS = 30_000
const SYNC_FAILURE_CODES = new Set<AwikiSdkRealtimeFailureCode>([
  'sync.retry.transport_unavailable',
  'sync.retry.service_unavailable',
  'sync.retry.local_state_unavailable',
  'sync.retry.local_state.actor_closed',
  'sync.retry.local_state.database_busy',
  'sync.retry.local_state.constraint_failed',
  'sync.retry.local_state.schema_unavailable',
  'sync.retry.local_state.storage_unavailable',
  'sync.retry.local_state.codec_unavailable',
  'sync.retry.local_state.other',
  'sync.retryable_failure',
  'sync.recovery_required',
  'sync.auth_revoked',
  'sync.blocked',
  'sync.unexpected_status',
])

export interface AwikiRealtimeDiagnostics {
  readonly connected: boolean
  readonly activeSessionCount: 0 | 1
  readonly startCount: number
  readonly stopCount: number
  readonly maxActiveSessionCount: 0 | 1
  readonly generation: number
  readonly retryCount: number
  readonly lifecyclePhase:
    | 'idle'
    | 'initial_sync'
    | 'starting'
    | 'connected'
    | 'reconnect_sync'
    | 'stopping'
    | 'backoff'
    | 'stopped'
  readonly lastFailureCode?:
    | AwikiSdkRealtimeFailureCode
    | 'sync_failed'
    | 'start_failed'
    | 'session_failed'
    | 'stop_failed'
  readonly lastConnectedAtMs?: number
  readonly lastCommittedSyncCause?: AwikiSdkListenerSyncCause | 'session_start'
  readonly lastSyncPagesFetched?: number
  readonly lastSyncMessagesHydrated?: number
  readonly lastSyncOlderHistoryExcluded?: boolean
}

export interface AwikiRealtimeSupervisorConfig {
  readonly onSynchronized?: (
    cause: AwikiSdkListenerSyncCause | 'session_start',
  ) => Promise<void>
}

function syncReason(cause: AwikiSdkListenerSyncCause | 'session_start'): AwikiSdkListenerSyncReason {
  if (cause === 'session_start') return 'session_start'
  return cause === 'reconnected' ? 'websocket_reconnect' : 'websocket_hint'
}

function syncFailureCode(error: unknown): AwikiSdkRealtimeFailureCode | undefined {
  try {
    if (typeof error !== 'object' || error === null) return undefined
    const value = (error as { readonly realtimeFailureCode?: unknown }).realtimeFailureCode
    if (typeof value !== 'string') return undefined
    return SYNC_FAILURE_CODES.has(value as AwikiSdkRealtimeFailureCode)
      ? value as AwikiSdkRealtimeFailureCode
      : undefined
  } catch {
    return undefined
  }
}

/** Own the deployment identity's only WSS without knowing Workspace or Agent policy. */
export class IdentityRealtimeSupervisor {
  private lifecycle: Promise<void> | undefined
  private generation = 0
  private activeSession: AwikiSdkListenerRealtimeSession | undefined
  private readonly stoppedSessions = new WeakSet<AwikiSdkListenerRealtimeSession>()
  private stopped = false
  private connected = false
  private startCount = 0
  private stopCount = 0
  private maxActiveSessionCount: 0 | 1 = 0
  private retryCount = 0
  private lifecyclePhase: AwikiRealtimeDiagnostics['lifecyclePhase'] = 'idle'
  private lastFailureCode: AwikiRealtimeDiagnostics['lastFailureCode']
  private lastConnectedAtMs: number | undefined
  private lastCommittedSyncCause: AwikiSdkListenerSyncCause | 'session_start' | undefined
  private lastSyncPagesFetched: number | undefined
  private lastSyncMessagesHydrated: number | undefined
  private lastSyncOlderHistoryExcluded: boolean | undefined
  private retryTimer: ReturnType<typeof setTimeout> | undefined
  private resolveRetry: (() => void) | undefined

  public constructor(
    private readonly realtime: AwikiSdkRealtimeClient,
    private readonly config: AwikiRealtimeSupervisorConfig = {},
    private readonly logger: Logger = ({
      debug() {}, info() {}, warn() {}, error() {}, name: 'awiki-realtime',
    } as unknown as Logger),
  ) {}

  /** Start in the background; identity activation must never await connectivity. */
  public start(): void {
    if (this.lifecycle !== undefined || this.stopped) return
    const generation = ++this.generation
    this.lifecycle = this.run(generation).catch((error: unknown) => {
      if (!this.stopped) {
        this.logger.warn(
          'AWiki realtime supervisor stopped unexpectedly: %s',
          error instanceof Error ? error.message : 'unknown failure',
        )
      }
    })
  }

  public diagnostics(): AwikiRealtimeDiagnostics {
    return {
      connected: this.connected,
      activeSessionCount: this.activeSession === undefined ? 0 : 1,
      startCount: this.startCount,
      stopCount: this.stopCount,
      maxActiveSessionCount: this.maxActiveSessionCount,
      generation: this.generation,
      retryCount: this.retryCount,
      lifecyclePhase: this.lifecyclePhase,
      ...(this.lastFailureCode === undefined ? {} : { lastFailureCode: this.lastFailureCode }),
      ...(this.lastConnectedAtMs === undefined ? {} : { lastConnectedAtMs: this.lastConnectedAtMs }),
      ...(this.lastCommittedSyncCause === undefined
        ? {}
        : { lastCommittedSyncCause: this.lastCommittedSyncCause }),
      ...(this.lastSyncPagesFetched === undefined ? {} : { lastSyncPagesFetched: this.lastSyncPagesFetched }),
      ...(this.lastSyncMessagesHydrated === undefined
        ? {}
        : { lastSyncMessagesHydrated: this.lastSyncMessagesHydrated }),
      ...(this.lastSyncOlderHistoryExcluded === undefined
        ? {}
        : { lastSyncOlderHistoryExcluded: this.lastSyncOlderHistoryExcluded }),
    }
  }

  /** Fence late events, wake retry sleep, stop the exact session, and join the lifecycle. */
  public async dispose(): Promise<void> {
    if (this.stopped) return
    this.stopped = true
    this.generation += 1
    this.connected = false
    this.lifecyclePhase = 'stopping'
    this.wakeRetry()
    const session = this.activeSession
    if (session !== undefined) await this.stopSession(session).catch(() => undefined)
    await this.lifecycle
    this.lifecyclePhase = 'stopped'
  }

  private current(generation: number): boolean {
    return !this.stopped && this.generation === generation
  }

  private async run(generation: number): Promise<void> {
    let cause: AwikiSdkListenerSyncCause | 'session_start' = 'session_start'
    let failures = 0
    while (this.current(generation)) {
      let session: AwikiSdkListenerRealtimeSession | undefined
      try {
        this.lifecyclePhase = cause === 'session_start' ? 'initial_sync' : 'reconnect_sync'
        await this.synchronize(cause, generation)
        if (!this.current(generation)) return
        this.lifecyclePhase = 'starting'
        session = await this.realtime.startRealtime()
        if (!this.current(generation)) {
          await this.stopSession(session).catch(() => undefined)
          return
        }
        this.activeSession = session
        this.maxActiveSessionCount = 1
        this.startCount += 1
        this.connected = (await session.getStatus().catch(() => ({ connected: false }))).connected
        this.lifecyclePhase = 'connected'
        if (this.connected) this.lastConnectedAtMs = Date.now()
        this.lastFailureCode = undefined
        failures = 0
        this.retryCount = 0
        while (this.current(generation) && this.activeSession === session) {
          const event = await session.nextEvent()
          if (!this.current(generation) || this.activeSession !== session) return
          if (event === null) {
            await this.stopSession(session)
            cause = 'reconnected'
            break
          }
          this.observeConnection(event)
          if (event.kind !== 'sync_required') continue
          await this.synchronize(event.cause, generation)
        }
      } catch (error) {
        const failedPhase = this.lifecyclePhase
        const safeSyncFailureCode = syncFailureCode(error)
        this.connected = false
        if (session !== undefined) {
          try {
            await this.stopSession(session)
          } catch {
            this.lastFailureCode = 'stop_failed'
          }
        }
        if (!this.current(generation)) return
        failures += 1
        this.retryCount = failures
        if (this.lastFailureCode !== 'stop_failed') {
          this.lastFailureCode = failedPhase === 'initial_sync' || failedPhase === 'reconnect_sync'
            ? safeSyncFailureCode ?? 'sync_failed'
            : failedPhase === 'starting'
              ? 'start_failed'
              : 'session_failed'
        }
        this.lifecyclePhase = 'backoff'
        this.logger.warn(
          'AWiki realtime lifecycle failed; retrying: %s',
          error instanceof Error ? error.message : 'unknown failure',
        )
        await this.waitForRetry(failures, generation)
        cause = cause === 'session_start' ? 'session_start' : 'reconnected'
      }
    }
  }

  private async synchronize(
    cause: AwikiSdkListenerSyncCause | 'session_start',
    generation: number,
  ): Promise<void> {
    const result = await this.realtime.syncNow(syncReason(cause))
    if (!this.current(generation)) return
    this.lastCommittedSyncCause = cause
    this.lastSyncPagesFetched = result.pagesFetched
    this.lastSyncMessagesHydrated = result.messagesHydrated
    this.lastSyncOlderHistoryExcluded = result.olderHistoryExcluded
    try {
      await this.config.onSynchronized?.(cause)
    } catch (error) {
      this.logger.warn(
        'AWiki realtime post-sync consumer failed: %s',
        error instanceof Error ? error.message : 'unknown failure',
      )
    }
  }

  private observeConnection(event: AwikiSdkListenerRealtimeEvent): void {
    if (event.kind !== 'connection_state_changed') return
    this.connected = event.state === 'connected'
    if (this.connected) {
      this.lifecyclePhase = 'connected'
      this.lastConnectedAtMs = Date.now()
      this.lastFailureCode = undefined
    }
  }

  private async stopSession(session: AwikiSdkListenerRealtimeSession): Promise<void> {
    if (this.stoppedSessions.has(session)) return
    this.stoppedSessions.add(session)
    if (this.activeSession === session) this.activeSession = undefined
    this.connected = false
    this.lifecyclePhase = 'stopping'
    this.stopCount += 1
    await session.stop()
  }

  private waitForRetry(failures: number, generation: number): Promise<void> {
    if (!this.current(generation)) return Promise.resolve()
    const delay = Math.min(RETRY_BASE_DELAY_MS * 2 ** Math.min(failures - 1, 10), RETRY_MAX_DELAY_MS)
    return new Promise(resolve => {
      const finish = () => {
        if (this.retryTimer === timer) this.retryTimer = undefined
        if (this.resolveRetry === finish) this.resolveRetry = undefined
        resolve()
      }
      const timer = setTimeout(finish, delay)
      this.retryTimer = timer
      this.resolveRetry = finish
    })
  }

  private wakeRetry(): void {
    const timer = this.retryTimer
    if (timer !== undefined) clearTimeout(timer)
    this.resolveRetry?.()
  }
}
