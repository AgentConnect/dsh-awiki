/** On-demand AWiki mailbox UI. Mail content is always rendered as untrusted text. */
import { type ReactNode } from 'react';
import type { AwikiOverlayProps } from './slots.ts';
interface AwikiMailProps extends Pick<AwikiOverlayProps, 'getMailAccount' | 'listMailInbox' | 'readMail' | 'markMailRead' | 'sendMail'> {
    readonly active: boolean;
    readonly identityCard: ReactNode;
    readonly modeTabs: ReactNode;
    readonly refreshRevision: number;
    readonly onUnreadCountChange: (count: number) => void;
}
/** Render a persistent mail workspace; loading starts only after the user selects Mail. */
export declare function AwikiMail(props: AwikiMailProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=AwikiMail.d.ts.map