import type { Logger } from '@deepseek-ai/cordis';
import type { AwikiSdkListenerSyncCause, AwikiSdkRealtimeClient } from './provider-api.ts';
export interface AwikiRealtimeDiagnostics {
    readonly connected: boolean;
    readonly activeSessionCount: 0 | 1;
    readonly startCount: number;
    readonly stopCount: number;
    readonly lastCommittedSyncCause?: AwikiSdkListenerSyncCause | 'session_start';
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
    private lastCommittedSyncCause;
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