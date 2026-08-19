/** Browser-side projection of whether any Harness model provider can serve requests. */
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client';
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots';
export interface ModelAvailabilityView {
    readonly status: 'idle' | 'loading' | 'ready' | 'unavailable';
    readonly usable: boolean;
    readonly error: string | null;
}
/**
 * Join the public provider, settings, and credential APIs into one onboarding fact.
 * Active routes without a credential reference authenticate through their provider's own path.
 */
export declare class ModelAvailabilityController implements HostObservable<ModelAvailabilityView> {
    private readonly connection;
    private view;
    private readonly listeners;
    private generation;
    private disposed;
    constructor(connection: ConnectionHandle);
    getSnapshot: () => ModelAvailabilityView;
    subscribe: (listener: () => void) => (() => void);
    load(): Promise<void>;
    refreshIfLoaded(): void;
    dispose(): void;
    private publish;
}
//# sourceMappingURL=model-availability-controller.d.ts.map