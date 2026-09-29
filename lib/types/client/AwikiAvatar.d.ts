import { type ReactNode } from 'react';
import type { AwikiDid, AwikiDisplayProfile, AwikiGroupSnapshot, AwikiProfile } from '../types.ts';
import type { AwikiOverlayProps } from './slots.ts';
type Sources = Pick<AwikiOverlayProps, 'avatarDisplayProfiles' | 'avatarGroup'>;
interface Projection {
    owner: string;
    self: AwikiProfile | null;
    profiles: ReadonlyMap<string, AwikiDisplayProfile>;
    groups: ReadonlyMap<string, AwikiGroupSnapshot>;
    demand: (did: AwikiDid, force?: boolean) => void;
    demandGroup: (did: AwikiDid) => void;
    subscribe: (key: string, listener: () => void) => () => void;
}
export declare function AwikiAvatarProvider(props: Sources & {
    owner: string;
    profile: AwikiProfile | null;
    children: ReactNode;
}): import("react").JSX.Element;
/** Shared source selection for badges and profile-image previews. */
export declare function useAvatarReference(props: {
    did?: AwikiDid | undefined;
    uri?: string | null | undefined;
    thumbnail?: string | null | undefined;
}): {
    context: Projection | undefined;
    profile: AwikiProfile | AwikiDisplayProfile | null | undefined;
    main: string | null | undefined;
    thumbnail: string | null | undefined;
};
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