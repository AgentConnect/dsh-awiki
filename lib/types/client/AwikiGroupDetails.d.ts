import type { AwikiGroupMemberRecord, AwikiGroupSnapshot, AwikiIdentity } from '@awiki/dsh-plugin/types';
import type { AwikiOverlayProps } from './slots.ts';
/** UI permission hint. Core/server remains the final membership authority. */
export declare function canRemoveGroupMember(actorRole: string | undefined, member: AwikiGroupMemberRecord, identity: AwikiIdentity): boolean;
type GroupActions = Pick<AwikiOverlayProps, 'refreshSelectedGroup' | 'loadMoreGroupMembers' | 'addSelectedGroupMember' | 'removeSelectedGroupMember' | 'leaveSelectedGroup'>;
/** Authoritative group snapshot and role-aware member management panel. */
export declare function AwikiGroupDetails(props: GroupActions & {
    readonly group: AwikiGroupSnapshot | null;
    readonly members: readonly AwikiGroupMemberRecord[];
    readonly hasMore: boolean;
    readonly identity: AwikiIdentity;
    readonly pending: boolean;
    readonly onClose: () => void;
}): import("react").JSX.Element;
export {};
//# sourceMappingURL=AwikiGroupDetails.d.ts.map