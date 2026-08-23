import type { Context, Logger } from '@deepseek-ai/cordis';
import { type SessionEvent } from '@deepseek-ai/dsh-session';
import type { AwikiSdkAgentInboxClient } from './provider-api.ts';
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
export interface AwikiAgentConsumerConfig extends AwikiListenerConfig {
    readonly identityScope: string;
}
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
/** Consume authorized Direct text only after the identity supervisor commits synchronization. */
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
    private stopped;
    constructor(awiki: AwikiSdkAgentInboxClient, agents: AwikiListenerAgentRuntime, config: AwikiAgentConsumerConfig, logger?: Logger, store?: AwikiListenerStateStore);
    /** Reconcile only committed history; this consumer cannot start WSS or advance sync. */
    reconcileOnce(): Promise<void>;
    /** Wait until every message currently queued for a test or orderly shutdown settles. */
    whenIdle(): Promise<void>;
    /** Fence late work, drain committed messages, then release listener-owned Agents. */
    dispose(): Promise<void>;
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