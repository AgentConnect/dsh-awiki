/** Browser-only AWiki mention editing helpers. All ranges use Unicode code points. */
import type { AwikiDid, AwikiGroupMemberRecord, AwikiMention } from '@awiki/dsh-plugin/types';
export interface AwikiMentionDraft {
    readonly id: string;
    readonly start: number;
    readonly end: number;
    readonly surface: string;
    readonly did: AwikiDid;
    readonly displayName?: string;
}
export interface AwikiMentionQuery {
    readonly start: number;
    readonly end: number;
    readonly query: string;
}
export interface AwikiMentionCandidate {
    readonly member: AwikiGroupMemberRecord & {
        readonly did: AwikiDid;
    };
    readonly label: string;
}
export interface AwikiMentionSegment {
    readonly text: string;
    readonly mention: boolean;
    readonly id?: string;
}
/** Convert a DOM textarea UTF-16 offset into the code-point unit used by ANP-P9. */
export declare function utf16IndexToCodePointIndex(value: string, utf16Index: number): number;
/** Convert a code-point range offset back into a DOM textarea UTF-16 offset. */
export declare function codePointIndexToUtf16Index(value: string, codePointIndex: number): number;
/** Find an unfinished @query ending at the current caret. */
export declare function activeMentionQuery(value: string, caret: number): AwikiMentionQuery | null;
export declare function shortenedDid(did: AwikiDid): string;
export declare function mentionMemberLabel(member: AwikiGroupMemberRecord & {
    readonly did: AwikiDid;
}): string;
/** Keep only active human peers that have a stable DID and are not the current identity. */
export declare function mentionCandidates(members: readonly AwikiGroupMemberRecord[], currentDid: AwikiDid, query: string): AwikiMentionCandidate[];
/** Insert a selected candidate at the current query and return the next caret position. */
export declare function insertMention(value: string, query: AwikiMentionQuery, candidate: AwikiMentionCandidate, id: string): {
    readonly text: string;
    readonly caret: number;
    readonly mention: AwikiMentionDraft;
};
/** Shift unaffected ranges after one edit and drop any mention touched by the edit. */
export declare function transformMentionDrafts(previousText: string, nextText: string, drafts: readonly AwikiMentionDraft[]): AwikiMentionDraft[];
/** Produce validated protocol mentions; stale or overlapping browser drafts are ignored. */
export declare function protocolMentions(value: string, drafts: readonly AwikiMentionDraft[]): AwikiMention[];
/** Split valid mention ranges for visual highlighting; malformed metadata becomes plain text. */
export declare function mentionSegments(value: string, mentions: readonly AwikiMention[] | undefined): AwikiMentionSegment[];
//# sourceMappingURL=mentions.d.ts.map