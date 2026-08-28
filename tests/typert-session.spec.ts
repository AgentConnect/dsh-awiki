import { describe, expect, it } from 'vitest'
import { TYPERT as hostTypert } from '../lib/typert.host.js'
import remoteTypert from '../lib/typert.remote-client.js'

interface Descriptor {
  readonly method: string
  readonly parameters: readonly { readonly codec: { readonly schema: { safeParse(value: unknown): { success: boolean } } } }[]
  readonly result: { readonly schema: { safeParse(value: unknown): { success: boolean } } }
}

function descriptors(value: unknown, field: 'descriptors' | 'invocations'): readonly Descriptor[] {
  return (value as Record<string, readonly Descriptor[]>)[field] ?? []
}

describe('generated AWiki Typert contract', () => {
  it.each([
    ['Host', descriptors(hostTypert, 'invocations')],
    ['Remote', descriptors(remoteTypert, 'descriptors')],
  ])('%s validates logout, signed-out, and active-session payloads', (_name, values) => {
    const byMethod = new Map(values.map(value => [value.method, value]))
    const logout = byMethod.get('logout')
    expect(logout?.parameters[0]?.codec.schema.safeParse({ confirmation: 'logout-awiki-session' }).success).toBe(true)

    for (const method of ['getSession', 'login', 'logout']) {
      const schema = byMethod.get(method)?.result.schema
      expect(schema?.safeParse({ ok: true, value: { status: 'signed-out' } }).success).toBe(true)
      expect(schema?.safeParse({ ok: true, value: { status: 'unregistered' } }).success).toBe(true)
      expect(schema?.safeParse({
        ok: true,
        value: {
          status: 'active',
          identity: { handle: 'alice', did: 'did:wba:alice', registeredAt: 1 },
        },
      }).success).toBe(true)
      expect(schema?.safeParse({ ok: true, value: { status: 'active' } }).success).toBe(false)
      expect(schema?.safeParse({
        ok: false,
        error: { code: 'signed-out', message: 'This installation is signed out of AWiki.' },
      }).success).toBe(true)
    }
  })

  it.each([
    ['Host', descriptors(hostTypert, 'invocations')],
    ['Remote', descriptors(remoteTypert, 'descriptors')],
  ])('%s validates create-group requests and partial-member results', (_name, values) => {
    const createGroup = values.find(value => value.method === 'createGroup')
    const input = createGroup?.parameters[0]?.codec.schema
    expect(input?.safeParse({ name: 'Release Crew', members: ['bob.awiki.info'] }).success).toBe(true)
    expect(input?.safeParse({ name: 'Release Crew' }).success).toBe(false)
    expect(input?.safeParse({ name: 'Release Crew', members: [42] }).success).toBe(false)

    const output = createGroup?.result.schema
    expect(output?.safeParse({
      ok: true,
      value: {
        conversation: {
          kind: 'group',
          id: 'group:did:wba:release-crew',
          groupDid: 'did:wba:release-crew',
          title: 'Release Crew',
          unreadCount: 0,
        },
        addedMembers: [{ did: 'did:wba:bob', handle: 'bob.awiki.info' }],
        failedMembers: [{
          member: 'missing.awiki.info',
          error: { code: 'not-found', message: 'The requested AWiki resource was not found.' },
        }],
      },
    }).success).toBe(true)
    expect(output?.safeParse({ ok: true, value: { addedMembers: [], failedMembers: [] } }).success).toBe(false)
  })

  it.each([
    ['Host', descriptors(hostTypert, 'invocations')],
    ['Remote', descriptors(remoteTypert, 'descriptors')],
  ])('%s validates the complete mail Remote boundary', (_name, values) => {
    const byMethod = new Map(values.map(value => [value.method, value]))

    expect(byMethod.get('getMailAccount')?.result.schema.safeParse({
      ok: true,
      value: { mailboxAddress: 'alice@awiki.ai', status: 'active' },
    }).success).toBe(true)

    const listMailInbox = byMethod.get('listMailInbox')
    expect(listMailInbox?.parameters[0]?.codec.schema.safeParse({ unreadOnly: true, limit: 20, offset: 0 }).success).toBe(true)
    expect(listMailInbox?.parameters[0]?.codec.schema.safeParse({ limit: '20' }).success).toBe(false)
    expect(listMailInbox?.result.schema.safeParse({
      ok: true,
      value: {
        items: [{
          id: 'mail-1',
          from: ['bob@awiki.ai'],
          to: ['alice@awiki.ai'],
          cc: [],
          subject: 'Release notes',
          subjectTruncated: false,
          previewTruncated: false,
          unread: true,
          hasAttachments: false,
        }],
        hasMore: false,
      },
    }).success).toBe(true)

    const readMail = byMethod.get('readMail')
    expect(readMail?.parameters[0]?.codec.schema.safeParse({ messageId: 'mail-1' }).success).toBe(true)
    expect(readMail?.result.schema.safeParse({
      ok: true,
      value: {
        summary: {
          id: 'mail-1',
          from: ['bob@awiki.ai'],
          to: ['alice@awiki.ai'],
          cc: [],
          subject: 'Release notes',
          subjectTruncated: false,
          previewTruncated: false,
          unread: true,
          hasAttachments: true,
        },
        bodyText: 'Ready to ship.',
        bodyTruncated: false,
        hasHtmlBody: false,
        attachments: [{ index: 0, fileName: 'notes.txt', contentType: 'text/plain', sizeBytes: '14' }],
      },
    }).success).toBe(true)

    const markMailRead = byMethod.get('markMailRead')
    expect(markMailRead?.parameters[0]?.codec.schema.safeParse({ messageIds: ['mail-1'] }).success).toBe(true)
    expect(markMailRead?.parameters[0]?.codec.schema.safeParse({ messageIds: [] }).success).toBe(true)
    expect(markMailRead?.result.schema.safeParse({ ok: true, value: { updated: 1 } }).success).toBe(true)

    const sendMail = byMethod.get('sendMail')
    expect(sendMail?.parameters[0]?.codec.schema.safeParse({
      to: ['bob@awiki.ai'],
      cc: ['release@awiki.ai'],
      subject: 'Ready',
      bodyText: 'Ship it.',
      attachments: [{
        fileName: 'notes.txt',
        contentType: 'text/plain',
        sizeBytes: 4,
        bytesBase64: 'dGVzdA==',
      }],
    }).success).toBe(true)
    expect(sendMail?.parameters[0]?.codec.schema.safeParse({
      to: 'bob@awiki.ai',
      subject: 'Ready',
      bodyText: 'Ship it.',
    }).success).toBe(false)
    expect(sendMail?.result.schema.safeParse({
      ok: true,
      value: { accepted: true, messageId: 'mail-2', warnings: [] },
    }).success).toBe(true)

    const downloadMailAttachment = byMethod.get('downloadMailAttachment')
    expect(downloadMailAttachment?.parameters[0]?.codec.schema.safeParse({
      localMessageId: 'mail-1', attachmentIndex: 0,
    }).success).toBe(true)
    expect(downloadMailAttachment?.parameters[0]?.codec.schema.safeParse({
      localMessageId: 'mail-1', attachmentIndex: '0',
    }).success).toBe(false)
    expect(downloadMailAttachment?.result.schema.safeParse({
      ok: true,
      value: {
        fileName: 'notes.txt',
        contentType: 'text/plain',
        sizeBytes: 4,
        sha256: '0'.repeat(64),
        bytesBase64: 'dGVzdA==',
      },
    }).success).toBe(true)
  })
})
