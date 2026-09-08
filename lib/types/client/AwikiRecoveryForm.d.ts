import type { AwikiRecoveryOtpRequest, AwikiRecoveryOtpResult, AwikiRecoveryPrepareRequest, AwikiRecoveryProgress } from '@awiki/dsh-plugin/types';
import type { AwikiActionResult } from './controller.ts';
export interface AwikiRecoveryActions {
    continueRecoveryForHandle?: (handle: string) => Promise<AwikiActionResult<boolean>>;
    enterRecoveredSession?: () => Promise<AwikiActionResult<AwikiRecoveryProgress>>;
    sendRecoveryOtp: (request: AwikiRecoveryOtpRequest) => Promise<AwikiActionResult<AwikiRecoveryOtpResult>>;
    prepareRecovery: (request: Omit<AwikiRecoveryPrepareRequest, 'operationId'>) => Promise<AwikiActionResult<AwikiRecoveryProgress>>;
    activateRecovery: () => Promise<AwikiActionResult<AwikiRecoveryProgress>>;
    refreshRecoveryStatus: () => Promise<AwikiActionResult<AwikiRecoveryProgress>>;
    resumeRecovery: () => Promise<AwikiActionResult<AwikiRecoveryProgress>>;
    discardRecovery: () => Promise<AwikiActionResult>;
}
export interface AwikiRecoveryFactorContext {
    readonly fullHandle: string;
    readonly phone: string;
}
/** Status-first Handle recovery. Secret inputs stay in browser memory only. */
export declare function AwikiRecoveryForm(props: AwikiRecoveryActions & {
    readonly statusError?: string | null;
    readonly requestError?: string | null;
    readonly operationId: string | null;
    readonly progress: AwikiRecoveryProgress | null;
    readonly pending: boolean;
    readonly onExit?: () => void;
    readonly onExitLabel?: string;
    readonly initialFactorContext?: AwikiRecoveryFactorContext;
    readonly fixedHandle?: string;
    readonly requestTitle?: string;
    readonly requestDescription?: string;
}): import("react").JSX.Element;
//# sourceMappingURL=AwikiRecoveryForm.d.ts.map