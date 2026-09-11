/** On-demand AWiki mailbox UI. Mail content is always rendered as untrusted text. */
import { type ReactNode } from 'react';
import type { AwikiDid } from '@awiki/dsh-plugin/types';
import type { AwikiOverlayProps } from './slots.ts';
interface AwikiMailProps extends Pick<AwikiOverlayProps, 'getConfig' | 'getMailAccount' | 'listMailInbox' | 'readMail' | 'markMailRead' | 'sendMail' | 'downloadMailAttachment'> {
    readonly active: boolean;
    readonly cacheOwner: AwikiDid;
    readonly identityCard: ReactNode;
    readonly modeTabs: ReactNode;
    readonly onUnreadCountChange: (count: number) => void;
}
/** Render a persistent mail workspace; loading starts only after the user selects Mail. */
export declare function AwikiMail(props: AwikiMailProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=AwikiMail.d.ts.map