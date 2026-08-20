/** One explicit create, recover, resume, or replace flow for AWiki identity access. */
import type { AwikiIdentityAccessInspection, AwikiIdentityAccessInspectionRequest, AwikiIdentity, AwikiRecoveryProgress, AwikiRegistrationOtpRequest, AwikiRegistrationOtpResult, AwikiRegistrationRequest, AwikiSession } from '@awiki/dsh-plugin/types';
import type { AwikiActionResult } from './controller.ts';
import { type AwikiRecoveryActions } from './AwikiRecoveryForm.tsx';
export interface AwikiIdentityAccessActions extends AwikiRecoveryActions {
    inspectIdentityAccess: (request: AwikiIdentityAccessInspectionRequest) => Promise<AwikiActionResult<AwikiIdentityAccessInspection>>;
    sendRegistrationOtp: (request: AwikiRegistrationOtpRequest) => Promise<AwikiActionResult<AwikiRegistrationOtpResult>>;
    registerIdentity: (request: AwikiRegistrationRequest) => Promise<AwikiActionResult<AwikiIdentity>>;
    login: () => Promise<AwikiActionResult<AwikiSession>>;
    clearLocalIdentity: () => Promise<AwikiActionResult>;
}
export interface AwikiIdentityAccessProps extends AwikiIdentityAccessActions {
    readonly sessionStatus: 'unregistered' | 'signed-out';
    readonly recoveryOperationId: string | null;
    readonly recoveryProgress: AwikiRecoveryProgress | null;
    readonly pending: boolean;
    readonly autoFocusHandle?: boolean;
}
/** Keep phone and OTP values mounted only for the duration of this explicit user flow. */
export declare function AwikiIdentityAccess(props: AwikiIdentityAccessProps): import("react").JSX.Element;
//# sourceMappingURL=AwikiIdentityAccess.d.ts.map