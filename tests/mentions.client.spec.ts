import { describe, expect, it } from 'vitest'
import type { AwikiDid, AwikiGroupMemberRecord } from '@awiki/dsh-plugin/types'
import {
  activeMentionQuery,
  codePointIndexToUtf16Index,
  insertMention,
  mentionCandidates,
  mentionSegments,
  protocolMentions,
  transformMentionDrafts,
  utf16IndexToCodePointIndex,
} from '../src/client/mentions.ts'

const alice = 'did:wba:alice' as AwikiDid
const bob = 'did:wba:bob' as AwikiDid
const members: readonly AwikiGroupMemberRecord[] = [
  { did: alice, handle: 'alice' as never, status: 'active', subjectType: 'human' },
  { did: bob, handle: 'bob' as never, displayName: 'Bob Zhang', status: 'active', subjectType: 'human' },
  { did: 'did:wba:agent' as AwikiDid, handle: 'helper' as never, status: 'active', subjectType: 'agent' },
  { did: 'did:wba:left' as AwikiDid, handle: 'left' as never, status: 'removed', subjectType: 'human' },
  { handle: 'legacy' as never, status: 'active', subjectType: 'human' },
]

describe('AWiki mention editing', () => {
  it('converts textarea UTF-16 positions to protocol code-point positions around emoji', () => {
    expect(utf16IndexToCodePointIndex('hi 😀 @bo', 6)).toBe(5)
    expect(codePointIndexToUtf16Index('hi 😀 @bo', 5)).toBe(6)
    expect(activeMentionQuery('hi 😀 @bo', 8)).toEqual({ start: 5, end: 8, query: 'bo' })
  })

  it('filters active human peers and prefers display name labels', () => {
    expect(mentionCandidates(members, alice, 'zh')).toEqual([{ member: members[1], label: 'Bob Zhang' }])
    expect(mentionCandidates(members, alice, '')).toHaveLength(1)
  })

  it('inserts and shifts a mention using code-point offsets', () => {
    const query = activeMentionQuery('😀 hello @bo!', 11)!
    const candidate = mentionCandidates(members, alice, 'bo')[0]!
    const inserted = insertMention('😀 hello @bo!', query, candidate, 'mention-1')
    expect(inserted.text).toBe('😀 hello @Bob Zhang !')
    expect(inserted.mention).toMatchObject({ start: 8, end: 18, surface: '@Bob Zhang', did: bob })
    const shifted = transformMentionDrafts(inserted.text, `开头 ${inserted.text}`, [inserted.mention])
    expect(shifted[0]).toMatchObject({ start: 11, end: 21 })
  })

  it('drops a mention when any part of its visible surface is edited', () => {
    const draft = { id: 'm', start: 3, end: 7, surface: '@Bob', did: bob }
    expect(transformMentionDrafts('hi @Bob there', 'hi @Bxb there', [draft])).toEqual([])
    expect(protocolMentions('hi @Bxb there', [draft])).toEqual([])
  })

  it('highlights valid ranges and falls back to ordinary text for malformed metadata', () => {
    expect(mentionSegments('😀 @Bob hi', [{ id: 'm', start: 2, end: 6, did: bob }])).toEqual([
      { text: '😀 ', mention: false },
      { text: '@Bob', mention: true, id: 'm' },
      { text: ' hi', mention: false },
    ])
    expect(mentionSegments('plain text', [{ id: 'bad', start: 0, end: 50, did: bob }]))
      .toEqual([{ text: 'plain text', mention: false }])
  })
})
