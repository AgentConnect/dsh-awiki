import type { AwikiDeviceJoinProgress, AwikiIdentity, AwikiIdentityAccessResult, AwikiIdentityAccessState, AwikiRecoveryProgress, AwikiRegistrationOtpRequest, AwikiRegistrationOtpResult, AwikiRegistrationRequest, AwikiSession } from '@awiki/dsh-plugin/types';
import type { AwikiActionResult } from './controller.ts';
import { type AwikiRecoveryActions } from './AwikiRecoveryForm.tsx';
export interface AwikiIdentityAccessActions extends AwikiRecoveryActions {
    sendRegistrationOtp: (request: AwikiRegistrationOtpRequest) => Promise<AwikiActionResult<AwikiRegistrationOtpResult>>;
    registerIdentity: (request: AwikiRegistrationRequest) => Promise<AwikiActionResult<AwikiIdentityAccessResult>>;
    beginDeviceJoin: () => Promise<AwikiActionResult<AwikiDeviceJoinProgress>>;
    getDeviceJoinStatus: () => Promise<AwikiActionResult<AwikiDeviceJoinProgress | null>>;
    cancelDeviceJoin: () => Promise<AwikiActionResult>;
    retireDeviceIdentityForRejoin: () => Promise<AwikiActionResult>;
    login: () => Promise<AwikiActionResult<AwikiSession>>;
    clearLocalIdentity: () => Promise<AwikiActionResult>;
}
export interface AwikiIdentityAccessProps extends AwikiIdentityAccessActions {
    readonly access?: AwikiIdentityAccessState | null;
    readonly accessLoading?: boolean;
    readonly accessError?: string | null;
    refreshIdentityAccess?: () => Promise<AwikiActionResult>;
    selectRecovery?: (operationId: string) => Promise<AwikiActionResult>;
    leaveRecovery?: () => void;
    readonly sessionStatus: 'unregistered' | 'signed-out' | 'recovery-required' | 'device-rejoin-required';
    readonly identity?: AwikiIdentity | null;
    readonly recoveryOperationId: string | null;
    readonly recoveryProgress: AwikiRecoveryProgress | null;
    readonly pending: boolean;
    readonly autoFocusHandle?: boolean;
    readonly handleRecoveryPhoneEnabled: boolean;
}
/** Keep phone and OTP values in private browser memory for the duration of this explicit user flow. */
export declare function AwikiIdentityAccess(props: AwikiIdentityAccessProps): import("react").JSX.Element;
//# sourceMappingURL=AwikiIdentityAccess.d.ts.map