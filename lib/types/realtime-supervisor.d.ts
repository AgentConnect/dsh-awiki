import type { Logger } from '@deepseek-ai/cordis';
import type { AwikiSdkRealtimeFailureCode, AwikiSdkListenerSyncCause, AwikiSdkRealtimeClient } from './provider-api.ts';
export interface AwikiRealtimeDiagnostics {
    readonly connected: boolean;
    readonly activeSessionCount: 0 | 1;
    readonly startCount: number;
    readonly stopCount: number;
    readonly maxActiveSessionCount: 0 | 1;
    readonly generation: number;
    readonly retryCount: number;
    readonly lifecyclePhase: 'idle' | 'initial_sync' | 'starting' | 'connected' | 'reconnect_sync' | 'stopping' | 'backoff' | 'stopped';
    readonly lastFailureCode?: AwikiSdkRealtimeFailureCode | 'sync_failed' | 'start_failed' | 'session_failed' | 'stop_failed';
    readonly lastConnectedAtMs?: number;
    readonly lastCommittedSyncCause?: AwikiSdkListenerSyncCause | 'session_start';
    readonly lastSyncPagesFetched?: number;
    readonly lastSyncMessagesHydrated?: number;
    readonly lastSyncOlderHistoryExcluded?: boolean;
}
export interface AwikiRealtimeSupervisorConfig {
    readonly onSynchronized?: (cause: AwikiSdkListenerSyncCause | 'session_start') => Promise<void>;
}
/** Own the deployment identity's only WSS without knowing Workspace or Agent policy. */
export declare class IdentityRealtimeSupervisor {
    private readonly realtime;
    private readonly config;
    private readonly logger;
    private lifecycle;
    private generation;
    private activeSession;
    private readonly stoppedSessions;
    private stopped;
    private connected;
    private startCount;
    private stopCount;
    private maxActiveSessionCount;
    private retryCount;
    private lifecyclePhase;
    private lastFailureCode;
    private lastConnectedAtMs;
    private lastCommittedSyncCause;
    private lastSyncPagesFetched;
    private lastSyncMessagesHydrated;
    private lastSyncOlderHistoryExcluded;
    private retryTimer;
    private resolveRetry;
    constructor(realtime: AwikiSdkRealtimeClient, config?: AwikiRealtimeSupervisorConfig, logger?: Logger);
    /** Start in the background; identity activation must never await connectivity. */
    start(): void;
    diagnostics(): AwikiRealtimeDiagnostics;
    /** Fence late events, wake retry sleep, stop the exact session, and join the lifecycle. */
    dispose(): Promise<void>;
    private current;
    private run;
    private synchronize;
    private observeConnection;
    private stopSession;
    private waitForRetry;
    private wakeRetry;
}
//# sourceMappingURL=realtime-supervisor.d.ts.map