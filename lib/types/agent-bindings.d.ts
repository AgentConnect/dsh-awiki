import type { AwikiAgentBindingScope, AwikiAgentIdentityBinding, AwikiBindingId, AwikiIdentity, AwikiIdentityId } from './types.ts';
type BindingStatus = AwikiAgentIdentityBinding['status'];
export interface BindingRecord {
    readonly bindingId: AwikiBindingId;
    readonly displayName: string;
    readonly status: BindingStatus;
    readonly createdAt: number;
    readonly source: 'provisioned' | 'adopted';
    readonly identityId?: AwikiIdentityId;
}
export interface BindingRoute {
    readonly scope: AwikiAgentBindingScope;
    readonly key: string;
}
export interface BindingCreation {
    readonly binding: BindingRecord;
    readonly created: boolean;
}
export interface BindingReconciliation {
    readonly bindings: readonly AwikiAgentIdentityBinding[];
    readonly unboundIdentities: readonly AwikiIdentity[];
}
/** Host-private, non-secret DSH Agent-to-identity binding persistence. */
export declare class AwikiAgentBindingStore {
    private readonly hostDirectory;
    private readonly path;
    private readonly tempPath;
    private mutation;
    constructor(stateRoot: string);
    private privateDirectory;
    private state;
    private persist;
    private mutate;
    /** Resolve the effective binding using session override before preset route. */
    resolve(sessionId: string, presetId?: string): Promise<BindingRecord | undefined>;
    /** Create one pending binding and route, or return the route's existing binding. */
    create(displayName: string, route: BindingRoute): Promise<BindingCreation>;
    /** Commit the exact Core identity selected by one provisioning operation. */
    markReady(bindingId: AwikiBindingId, identityId: AwikiIdentityId): Promise<void>;
    markFailed(bindingId: AwikiBindingId): Promise<void>;
    /** Attach an existing binding to one explicit route. */
    attach(bindingId: AwikiBindingId, route: BindingRoute, replace: boolean): Promise<void>;
    /** Create a binding for one locally present orphan identity and attach it. */
    adopt(identityId: AwikiIdentityId, displayName: string, route: BindingRoute, replace: boolean): Promise<BindingRecord>;
    /** Join binding records to current Core identities without deleting DSH routes. */
    reconcile(identities: readonly AwikiIdentity[]): Promise<BindingReconciliation>;
    /** Delete Host-owned binding state; SDK-owned identity removal is separate. */
    clear(): Promise<boolean>;
}
export {};
//# sourceMappingURL=agent-bindings.d.ts.map