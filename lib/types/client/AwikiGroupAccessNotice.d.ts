import type { AwikiGroupAccessView } from './controller.ts';
/** Group-scoped access state with bounded recovery and navigation actions. */
export declare function AwikiGroupAccessNotice(props: {
    readonly access: AwikiGroupAccessView;
    readonly pending: boolean;
    readonly onRetry: () => void;
    readonly onRejoin: () => void;
    readonly onBack?: () => void;
    readonly compact?: boolean;
}): import("react").JSX.Element | null;
//# sourceMappingURL=AwikiGroupAccessNotice.d.ts.map