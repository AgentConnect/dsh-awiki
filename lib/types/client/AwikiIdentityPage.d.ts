import type { ReactNode } from 'react';
export interface AwikiIdentityPageProps {
    readonly children: ReactNode;
    readonly onBack?: () => void;
    readonly backLabel?: string;
    readonly backDisabled?: boolean;
    readonly live?: 'off' | 'polite' | 'assertive';
}
/** Shared navigation and overflow boundary for every identity access step. */
export declare function AwikiIdentityPage(props: AwikiIdentityPageProps): import("react").JSX.Element;
//# sourceMappingURL=AwikiIdentityPage.d.ts.map