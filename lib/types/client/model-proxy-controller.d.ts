/** Reactive loopback client for browser-safe AWiki-hosted DeepSeek account operations. */
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client';
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots';
import { type AwikiModelProxyRechargeOrder, type AwikiModelProxyStatus, type AwikiModelProxyUsage } from '../model-proxy-contract.ts';
import type { AwikiController } from './controller.ts';
export interface AwikiModelProxyView {
    readonly status: 'idle' | 'identity-required' | 'loading' | 'ready' | 'unavailable';
    readonly account: AwikiModelProxyStatus | null;
    readonly usage: readonly AwikiModelProxyUsage[];
    readonly usageLoading: boolean;
    readonly pending: 'enable' | 'disable' | 'recharge' | null;
    readonly error: string | null;
}
export declare class AwikiModelProxyController implements HostObservable<AwikiModelProxyView> {
    private readonly connection;
    private readonly identity;
    private view;
    private readonly listeners;
    private readonly abort;
    private sessionAbort;
    private readonly unsubscribeSession;
    private sessionActive;
    private disposed;
    private generation;
    constructor(connection: ConnectionHandle, identity: AwikiController);
    getSnapshot: () => AwikiModelProxyView;
    subscribe: (listener: () => void) => (() => void);
    load(): Promise<void>;
    loadUsage(): Promise<void>;
    setEnabled(enabled: boolean): Promise<void>;
    createRecharge(amountCents: number): Promise<AwikiModelProxyRechargeOrder>;
    rechargeStatus(outTradeNo: string): Promise<AwikiModelProxyRechargeOrder>;
    dispose(): void;
    private call;
    private publish;
    private active;
    private syncSession;
}
//# sourceMappingURL=model-proxy-controller.d.ts.map