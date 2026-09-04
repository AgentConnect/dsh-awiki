/** Foreground-only ready-admin device management. SAS remains component-local. */
import type { AwikiAdminJoinProgress, AwikiDeviceJoinPhase, AwikiDeviceManagementSnapshot, AwikiRootTransferPreparation, AwikiRootTransferReceipt } from '@awiki/dsh-plugin/types';
import type { AwikiActionResult } from './controller.ts';
export interface AwikiDevicesProps {
    readonly active: boolean;
    readonly pending: boolean;
    refreshDeviceManagement: () => Promise<AwikiActionResult<AwikiDeviceManagementSnapshot>>;
    startDeviceJoinVerification: (request: {
        readonly requestRef: string;
    }) => Promise<AwikiActionResult<AwikiAdminJoinProgress>>;
    approveDeviceJoin: (request: {
        readonly requestRef: string;
        readonly enteredSas: string;
        readonly confirmation: string;
    }) => Promise<AwikiActionResult<AwikiAdminJoinProgress>>;
    rejectDeviceJoin: (request: {
        readonly requestRef: string;
        readonly reason: 'user_rejected';
    }) => Promise<AwikiActionResult<AwikiAdminJoinProgress>>;
    revokeDevice: (request: {
        readonly deviceRef: string;
        readonly confirmation: string;
    }) => Promise<AwikiActionResult<AwikiDeviceManagementSnapshot>>;
    prepareRootTransfer: (request: {
        readonly deviceRef: string;
    }) => Promise<AwikiActionResult<AwikiRootTransferPreparation>>;
    confirmRootTransfer: (request: {
        readonly transferRef: string;
    }) => Promise<AwikiActionResult<AwikiRootTransferReceipt>>;
}
export declare const TERMINAL_DEVICE_JOIN_STATES: ReadonlySet<AwikiDeviceJoinPhase>;
export declare function AwikiDevices(props: AwikiDevicesProps): import("react").JSX.Element;
//# sourceMappingURL=AwikiDevices.d.ts.map