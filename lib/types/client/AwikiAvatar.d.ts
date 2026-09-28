import { type ReactNode } from 'react';
import type { AwikiDid, AwikiProfile } from '../types.ts';
import type { AwikiOverlayProps } from './slots.ts';
type Sources = Pick<AwikiOverlayProps, 'avatarDisplayProfiles' | 'avatarGroup'>;
export declare function AwikiAvatarProvider(props: Sources & {
    owner: string;
    profile: AwikiProfile | null;
    children: ReactNode;
}): import("react").JSX.Element;
export declare function AwikiAvatar(props: {
    name: string;
    did?: AwikiDid;
    groupDid?: AwikiDid;
    uri?: string | null | undefined;
    thumbnail?: string | null | undefined;
    size?: number;
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=AwikiAvatar.d.ts.map