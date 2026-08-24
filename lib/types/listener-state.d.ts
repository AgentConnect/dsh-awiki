/** Durable routing state for one authorized AWiki direct conversation. */
export interface AwikiListenerConversationState {
    readonly peerDid: string;
    readonly sessionId?: string;
    readonly lastProcessedMessageId?: string;
}
/** Host-private listener state. Message content and Agent output are never stored here. */
export interface AwikiListenerState {
    readonly version: 2;
    readonly identityScopeHash: string;
    readonly conversations: Record<string, AwikiListenerConversationState>;
}
/** Atomic, owner-only persistence for conversation-to-DSH-session routes. */
export declare class AwikiListenerStateStore {
    private readonly hostDirectory;
    private readonly statePath;
    readonly identityScopeHash: string;
    constructor(stateRoot: string, identityScope: string);
    /** Load the current identity scope or reset unscoped v1 state on first use. */
    load(): Promise<AwikiListenerState>;
    /** Replace the state atomically without ever writing message or Agent text. */
    save(state: AwikiListenerState): Promise<void>;
    private hasPrivateHostDirectory;
}
//# sourceMappingURL=listener-state.d.ts.map