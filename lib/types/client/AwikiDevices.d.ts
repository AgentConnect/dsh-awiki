/** Foreground-only ready-admin device management. SAS remains component-local. */
import { type ReactNode } from 'react';
import type { AwikiAdminJoinProgress, AwikiDeviceManagementSnapshot } from '@awiki/dsh-plugin/types';
import type { AwikiActionResult } from './controller.ts';
export interface AwikiDevicesProps {
    readonly active: boolean;
    readonly pending: boolean;
    readonly modeTabs: ReactNode;
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
}
export declare function AwikiDevices(props: AwikiDevicesProps): import("react").JSX.Element;
//# sourceMappingURL=AwikiDevices.d.ts.map