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
})
