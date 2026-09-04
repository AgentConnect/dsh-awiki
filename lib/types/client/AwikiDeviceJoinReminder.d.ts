/** Proactive ready-admin reminder for newly pending device join requests. */
import type { AwikiDevicesProps } from './AwikiDevices.tsx';
export interface AwikiDeviceJoinReminderProps extends Omit<AwikiDevicesProps, 'active'> {
    readonly active: boolean;
    readonly identityKey: string | null;
    /** Override only for deterministic component tests. */
    readonly pollIntervalMs?: number;
}
/**
 * Poll for join requests while an admin identity is active, without exposing
 * pending device management to member devices or repeatedly prompting for the
 * same request during one identity session.
 */
export declare function AwikiDeviceJoinReminder(props: AwikiDeviceJoinReminderProps): import("react").JSX.Element;
//# sourceMappingURL=AwikiDeviceJoinReminder.d.ts.map