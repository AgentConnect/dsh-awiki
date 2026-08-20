import type { AwikiIdentity, AwikiProfile } from '@awiki/dsh-plugin/types';
import type { AwikiOverlayProps } from './slots.ts';
/** Compact public profile with an explicit, bounded editor for all supported fields. */
export declare function AwikiProfileCard(props: Pick<AwikiOverlayProps, 'updateProfile'> & {
    readonly identity: AwikiIdentity;
    readonly profile: AwikiProfile | null;
    readonly pending: boolean;
}): import("react").JSX.Element;
//# sourceMappingURL=AwikiProfileCard.d.ts.map