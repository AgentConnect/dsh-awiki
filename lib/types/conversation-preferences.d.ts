import type { AwikiConversationPreferenceMutation, AwikiConversationPreferences, AwikiDid } from './types.ts';
/** Validate one browser mutation before entering private Host persistence. */
export declare function normalizeConversationPreferenceMutation(value: unknown): AwikiConversationPreferenceMutation | undefined;
/** Atomic identity-scoped product preferences, independent of Core membership and history. */
export declare class AwikiConversationPreferenceStore {
    private readonly hostDirectory;
    private readonly directory;
    private mutation;
    constructor(stateRoot: string);
    get(ownerDid: AwikiDid): Promise<AwikiConversationPreferences>;
    update(ownerDid: AwikiDid, request: AwikiConversationPreferenceMutation): Promise<AwikiConversationPreferences>;
    clear(): Promise<void>;
    private load;
    private write;
    private ensureDirectory;
    private hasDirectory;
    private path;
    private key;
}
//# sourceMappingURL=conversation-preferences.d.ts.map