/** Reactive browser mirror for AWiki's loopback-only settings channel. */
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client';
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client';
import type { AwikiSettings } from '../settings.ts';
/** Plugin-owned SettingsScope implementation independent of the core settings allowlist. */
export declare class AwikiSettingsController implements SettingsScope<AwikiSettings> {
    private readonly connection;
    private snapshot;
    private readonly listeners;
    private readonly abort;
    private readonly disposeHostDescription;
    private writeTail;
    private requestVersion;
    private disposed;
    constructor(connection: ConnectionHandle);
    getSnapshot(): SettingsScopeSnapshot<AwikiSettings>;
    subscribe(listener: () => void): () => void;
    /** Load or reload the Host view; transport failures become a disabled UI state. */
    load(): Promise<void>;
    set(field: string, value: unknown): Promise<void>;
    unset(field: string): Promise<void>;
    /** Stop reconnect reads and cancel outstanding transport calls. */
    dispose(): void;
    private enqueue;
    private write;
    private publish;
}
//# sourceMappingURL=settings-controller.d.ts.map