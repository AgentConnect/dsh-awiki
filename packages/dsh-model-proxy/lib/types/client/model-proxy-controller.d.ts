/** Reactive loopback client owned by Model Proxy for browser-safe account operations. */
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client';
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots';
import { type AwikiModelProxyRechargeOrder, type AwikiModelProxyStatus, type AwikiModelProxyUsage } from '@awiki/dsh-plugin/model-proxy-contract';
import type { AwikiController } from '@awiki/dsh-plugin/client';
export interface AwikiModelProxyView {
    readonly capability: 'unknown' | 'checking' | 'available' | 'unavailable';
    readonly status: 'idle' | 'identity-required' | 'loading' | 'ready' | 'unavailable';
    readonly account: AwikiModelProxyStatus | null;
    readonly usage: readonly AwikiModelProxyUsage[];
    readonly usageLoading: boolean;
    readonly pending: 'enable' | 'disable' | 'recharge' | 'close-recharge' | null;
    readonly error: string | null;
}
export declare class AwikiModelProxyController implements HostObservable<AwikiModelProxyView> {
    private readonly connection;
    private readonly identity;
    private readonly rechargeEnabled;
    private view;
    private readonly listeners;
    private readonly abort;
    private sessionAbort;
    private readonly unsubscribeSession;
    private sessionActive;
    private capabilityProbe;
    private disposed;
    private generation;
    constructor(connection: ConnectionHandle, identity: AwikiController, rechargeEnabled?: boolean);
    getSnapshot: () => AwikiModelProxyView;
    subscribe: (listener: () => void) => (() => void);
    probe(): Promise<void>;
    private probeOnce;
    load(): Promise<void>;
    loadUsage(): Promise<void>;
    setEnabled(enabled: boolean): Promise<void>;
    createRecharge(amountCents: number): Promise<AwikiModelProxyRechargeOrder>;
    rechargeStatus(outTradeNo: string): Promise<AwikiModelProxyRechargeOrder>;
    closeRecharge(outTradeNo: string): Promise<'closed' | 'paid'>;
    dispose(): void;
    private call;
    private publish;
    private active;
    private syncSession;
}
//# sourceMappingURL=model-proxy-controller.d.ts.map