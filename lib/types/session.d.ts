/** Persist only the local session lock; identity and SecretVault data remain SDK-owned. */
export declare class AwikiSessionStore {
    private readonly hostDirectory;
    private readonly markerPath;
    constructor(stateRoot: string);
    /** Return whether this installation was explicitly signed out. */
    isSignedOut(): Promise<boolean>;
    /** Lock this installation without modifying the persisted identity. */
    signOut(): Promise<void>;
    /** Unlock this installation while retaining every SDK-owned file. */
    signIn(): Promise<void>;
    private hasPrivateHostDirectory;
}
//# sourceMappingURL=session.d.ts.map