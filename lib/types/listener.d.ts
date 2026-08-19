import type { Context, Logger } from '@deepseek-ai/cordis';
import { type SessionEvent } from '@deepseek-ai/dsh-session';
import type { AwikiSdkListenerClient, AwikiSdkListenerSyncReason } from './provider-api.ts';
import { AwikiListenerStateStore } from './listener-state.ts';
/** One opened DSH session returned by a replaceable runtime adapter. */
export interface AwikiListenerAgentSession {
    readonly sessionId: string;
    prompt(text: string): Promise<string>;
}
/** Agent boundary kept small so listener behavior can be tested without a model. */
export interface AwikiListenerAgentRuntime {
    open(sessionId?: string): Promise<AwikiListenerAgentSession>;
    reset(sessionId?: string): Promise<void>;
    dispose(): Promise<void>;
}
/** Fully validated listener choices owned by the Host configuration. */
export interface AwikiListenerConfig {
    readonly allowedPeers: readonly string[];
    readonly workspacePath: string;
    readonly stateRoot: string;
}
/** One observable terminal result for the exact listener lifecycle. */
export type AwikiListenerTermination = {
    readonly kind: 'stopped';
} | {
    readonly kind: 'failed';
    readonly error: unknown;
};
/** Fold only the turn that claimed one exact submitted message. */
export declare function finalAssistantText(events: readonly SessionEvent[], messageId: string): string | undefined;
/** Production adapter around the registered Workspace and official Agent lifecycle. */
export declare class DshAwikiListenerAgentRuntime implements AwikiListenerAgentRuntime {
    private readonly ctx;
    private readonly workspacePath;
    private readonly handles;
    private workspace;
    constructor(ctx: Context, workspacePath: string);
    open(existingSessionId?: string): Promise<AwikiListenerAgentSession>;
    reset(sessionId?: string): Promise<void>;
    dispose(): Promise<void>;
    private resolveWorkspace;
    private currentSelection;
    private prompt;
}
/** Reconcile authorized Direct text from Core history whenever realtime schedules synchronization. */
export declare class AwikiAgentListener {
    private readonly awiki;
    private readonly agents;
    private readonly config;
    private readonly allowedPeers;
    private readonly store;
    private readonly logger;
    private readonly stateReady;
    private state;
    private stateMutation;
    private syncMutation;
    private readonly scheduledMessageIds;
    private readonly conversationQueues;
    private lifecycle;
    private started;
    private resolveStarted;
    private rejectStarted;
    private lifecycleGeneration;
    private streamGeneration;
    private activeRealtime;
    private stopped;
    private readonly termination;
    private resolveTermination;
    private terminationSettled;
    constructor(awiki: AwikiSdkListenerClient, agents: AwikiListenerAgentRuntime, config: AwikiListenerConfig, logger?: Logger, store?: AwikiListenerStateStore);
    /** Start canonical startup sync followed by the single Core-owned realtime stream. */
    start(): Promise<void>;
    /** Resolve once with either orderly shutdown or the exact terminal lifecycle failure. */
    whenTerminated(): Promise<AwikiListenerTermination>;
    /** Deterministic canonical sync plus committed-history reconciliation for tests and recovery. */
    synchronizeOnce(reason: AwikiSdkListenerSyncReason): Promise<void>;
    /** Wait until every message currently queued for a test or orderly shutdown settles. */
    whenIdle(): Promise<void>;
    /** Stop realtime first, fence late events, drain messages, then release listener-owned Agents. */
    dispose(): Promise<void>;
    private finishTermination;
    private currentLifecycle;
    private run;
    private openRealtime;
    private synchronize;
    private enqueueSync;
    private reconcileCommittedHistory;
    private listConversations;
    private unseenMessages;
    private enqueue;
    private process;
    private reply;
    private commit;
    private updateRoute;
}
//# sourceMappingURL=listener.d.ts.map