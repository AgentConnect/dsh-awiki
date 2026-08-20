/** Browser-only AWiki mention editing helpers. All ranges use Unicode code points. */

import type { AwikiDid, AwikiGroupMemberRecord, AwikiMention } from '@awiki/dsh-plugin/types'

export interface AwikiMentionDraft {
  readonly id: string
  readonly start: number
  readonly end: number
  readonly surface: string
  readonly did: AwikiDid
  readonly displayName?: string
}

export interface AwikiMentionQuery {
  readonly start: number
  readonly end: number
  readonly query: string
}

export interface AwikiMentionCandidate {
  readonly member: AwikiGroupMemberRecord & { readonly did: AwikiDid }
  readonly label: string
}

export interface AwikiMentionSegment {
  readonly text: string
  readonly mention: boolean
  readonly id?: string
}

const HUMAN_SUBJECT_TYPES = new Set(['human', 'person', 'user'])

function codePoints(value: string): string[] {
  return Array.from(value)
}

function normalized(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase() ?? ''
}

/** Convert a DOM textarea UTF-16 offset into the code-point unit used by ANP-P9. */
export function utf16IndexToCodePointIndex(value: string, utf16Index: number): number {
  const clamped = Math.min(Math.max(utf16Index, 0), value.length)
  return codePoints(value.slice(0, clamped)).length
}

/** Convert a code-point range offset back into a DOM textarea UTF-16 offset. */
export function codePointIndexToUtf16Index(value: string, codePointIndex: number): number {
  return codePoints(value).slice(0, Math.max(0, codePointIndex)).join('').length
}

/** Find an unfinished @query ending at the current caret. */
export function activeMentionQuery(value: string, caret: number): AwikiMentionQuery | null {
  const chars = codePoints(value)
  const end = Math.min(Math.max(caret, 0), chars.length)
  let start = end - 1
  while (start >= 0 && !/\s/u.test(chars[start]!)) {
    if (chars[start] === '@') break
    start -= 1
  }
  if (start < 0 || chars[start] !== '@') return null
  if (start > 0 && /[\p{L}\p{N}_@]/u.test(chars[start - 1]!)) return null
  const query = chars.slice(start + 1, end).join('')
  if (/\s/u.test(query)) return null
  return { start, end, query }
}

export function shortenedDid(did: AwikiDid): string {
  const value = String(did)
  return value.length <= 24 ? value : `${value.slice(0, 12)}...${value.slice(-8)}`
}

export function mentionMemberLabel(member: AwikiGroupMemberRecord & { readonly did: AwikiDid }): string {
  const displayName = member.displayName?.trim()
  if (displayName !== undefined && displayName !== '') return displayName
  const handle = member.handle?.trim()
  return handle === undefined || handle === '' ? shortenedDid(member.did) : handle
}

/** Keep only active human peers that have a stable DID and are not the current identity. */
export function mentionCandidates(
  members: readonly AwikiGroupMemberRecord[],
  currentDid: AwikiDid,
  query: string,
): AwikiMentionCandidate[] {
  const needle = normalized(query)
  return members.flatMap((member): AwikiMentionCandidate[] => {
    if (member.did === undefined || member.did === currentDid) return []
    if (normalized(member.status) !== 'active') return []
    if (!HUMAN_SUBJECT_TYPES.has(normalized(member.subjectType))) return []
    const stableMember = member as AwikiGroupMemberRecord & { readonly did: AwikiDid }
    const label = mentionMemberLabel(stableMember)
    const aliases = [label, member.displayName, member.handle, String(member.did)].map(normalized)
    return needle === '' || aliases.some(alias => alias.includes(needle))
      ? [{ member: stableMember, label }]
      : []
  })
}

/** Insert a selected candidate at the current query and return the next caret position. */
export function insertMention(
  value: string,
  query: AwikiMentionQuery,
  candidate: AwikiMentionCandidate,
  id: string,
): { readonly text: string; readonly caret: number; readonly mention: AwikiMentionDraft } {
  const chars = codePoints(value)
  const surface = `@${candidate.label}`
  const replacement = codePoints(`${surface} `)
  const text = [...chars.slice(0, query.start), ...replacement, ...chars.slice(query.end)].join('')
  const end = query.start + codePoints(surface).length
  return {
    text,
    caret: end + 1,
    mention: {
      id,
      start: query.start,
      end,
      surface,
      did: candidate.member.did,
      displayName: candidate.label,
    },
  }
}

function validateDraft(value: string, draft: AwikiMentionDraft): boolean {
  const chars = codePoints(value)
  return draft.start >= 0
    && draft.end > draft.start
    && draft.end <= chars.length
    && chars.slice(draft.start, draft.end).join('') === draft.surface
}

/** Shift unaffected ranges after one edit and drop any mention touched by the edit. */
export function transformMentionDrafts(
  previousText: string,
  nextText: string,
  drafts: readonly AwikiMentionDraft[],
): AwikiMentionDraft[] {
  const previous = codePoints(previousText)
  const next = codePoints(nextText)
  let prefix = 0
  while (prefix < previous.length && prefix < next.length && previous[prefix] === next[prefix]) prefix += 1
  let suffix = 0
  while (
    suffix < previous.length - prefix
    && suffix < next.length - prefix
    && previous[previous.length - 1 - suffix] === next[next.length - 1 - suffix]
  ) suffix += 1
  const previousEditEnd = previous.length - suffix
  const delta = next.length - previous.length
  return drafts.flatMap((draft): AwikiMentionDraft[] => {
    const transformed = draft.end <= prefix
      ? draft
      : draft.start >= previousEditEnd
        ? { ...draft, start: draft.start + delta, end: draft.end + delta }
        : null
    return transformed !== null && validateDraft(nextText, transformed) ? [transformed] : []
  })
}

/** Produce validated protocol mentions; stale or overlapping browser drafts are ignored. */
export function protocolMentions(value: string, drafts: readonly AwikiMentionDraft[]): AwikiMention[] {
  let previousEnd = -1
  return [...drafts]
    .sort((left, right) => left.start - right.start || left.end - right.end)
    .flatMap((draft): AwikiMention[] => {
      if (!validateDraft(value, draft) || draft.start < previousEnd) return []
      previousEnd = draft.end
      return [{
        id: draft.id,
        start: draft.start,
        end: draft.end,
        did: draft.did,
        ...draft.displayName === undefined ? {} : { displayName: draft.displayName },
      }]
    })
}

/** Split valid mention ranges for visual highlighting; malformed metadata becomes plain text. */
export function mentionSegments(value: string, mentions: readonly AwikiMention[] | undefined): AwikiMentionSegment[] {
  const chars = codePoints(value)
  const ordered = [...(mentions ?? [])].sort((left, right) => left.start - right.start || left.end - right.end)
  const valid: AwikiMention[] = []
  let previousEnd = 0
  for (const mention of ordered) {
    if (!Number.isInteger(mention.start) || !Number.isInteger(mention.end)) return [{ text: value, mention: false }]
    if (mention.start < previousEnd || mention.end <= mention.start || mention.end > chars.length) return [{ text: value, mention: false }]
    const surface = chars.slice(mention.start, mention.end).join('')
    if (!surface.startsWith('@')) return [{ text: value, mention: false }]
    valid.push(mention)
    previousEnd = mention.end
  }
  if (valid.length === 0) return [{ text: value, mention: false }]
  const result: AwikiMentionSegment[] = []
  let cursor = 0
  for (const mention of valid) {
    if (mention.start > cursor) result.push({ text: chars.slice(cursor, mention.start).join(''), mention: false })
    result.push({ text: chars.slice(mention.start, mention.end).join(''), mention: true, id: mention.id })
    cursor = mention.end
  }
  if (cursor < chars.length) result.push({ text: chars.slice(cursor).join(''), mention: false })
  return result
}
