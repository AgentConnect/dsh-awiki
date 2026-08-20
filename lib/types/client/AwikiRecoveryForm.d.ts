import type { AwikiRecoveryOtpRequest, AwikiRecoveryOtpResult, AwikiRecoveryPrepareRequest, AwikiRecoveryProgress } from '@awiki/dsh-plugin/types';
import type { AwikiActionResult } from './controller.ts';
export interface AwikiRecoveryActions {
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
/** Status-first Handle recovery. Secret inputs remain inside the mounted form only. */
export declare function AwikiRecoveryForm(props: AwikiRecoveryActions & {
    readonly operationId: string | null;
    readonly progress: AwikiRecoveryProgress | null;
    readonly pending: boolean;
    readonly onExit?: () => void;
    readonly onExitLabel?: string;
    readonly initialFactorContext?: AwikiRecoveryFactorContext;
}): import("react").JSX.Element;
//# sourceMappingURL=AwikiRecoveryForm.d.ts.map