/** AWiki trigger, identity registration, and direct/group messaging drawer. */
import type { AwikiOverlayProps } from './slots.ts';
export declare const AWIKI_LAUNCHER_POSITION_KEY = "dsh-awiki-launcher-position-v1";
export interface AwikiLauncherPosition {
    readonly left: number;
    readonly top: number;
}
export type AwikiDrawerDirection = 'upper-left' | 'upper-right' | 'lower-left' | 'lower-right';
export interface AwikiDrawerPlacement extends AwikiLauncherPosition {
    readonly direction: AwikiDrawerDirection;
}
/** Keep the floating launcher fully reachable inside the current viewport. */
export declare function clampAwikiLauncherPosition(position: AwikiLauncherPosition, width: number, height: number): AwikiLauncherPosition;
/** Place the chat panel in the launcher corner quadrant with the least viewport overflow. */
export declare function resolveAwikiDrawerPlacement(launcher: AwikiLauncherPosition, panelWidth: number, panelHeight: number, viewportWidth: number, viewportHeight: number, preferredDirection?: AwikiDrawerDirection): AwikiDrawerPlacement;
/** Render the identity registration form and its OTP challenge transition. */
export declare function AwikiRegistrationForm(props: Pick<AwikiOverlayProps, 'sendRegistrationOtp' | 'registerIdentity'> & {
    pending: boolean;
    autoFocusHandle?: boolean;
}): import("react").JSX.Element;
/**
 * Render the frame-wide AWiki trigger and right-side drawer.
 * @param props - slot-derived runtime, store, and injected AWiki operations.
 * @returns the persistent trigger and the conditionally mounted drawer.
 */
export declare function AwikiOverlay(props: AwikiOverlayProps): import("react").JSX.Element;
//# sourceMappingURL=AwikiOverlay.d.ts.map