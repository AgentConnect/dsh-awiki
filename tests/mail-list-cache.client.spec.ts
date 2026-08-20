// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import type { AwikiDid } from '@awiki/dsh-plugin/types'
import {
  MAIL_LIST_CACHE_MAX_AGE_MS,
  readMailFolderCache,
  readMailListCache,
  writeMailFolderCache,
  writeMailListCache,
} from '../src/client/mail-list-cache.ts'
import { identity, mailSummary, sentMailSummary } from './helpers.client.ts'

afterEach(() => {
  window.localStorage.clear()
})

describe('browser mail-list cache', () => {
  it('keeps inbox and sent summaries isolated by AWiki owner and folder', () => {
    writeMailListCache(window.localStorage, identity.did, 'inbox', {
      items: [mailSummary],
      nextOffset: 20,
      hasMore: true,
    }, 10_000)
    writeMailListCache(window.localStorage, identity.did, 'sent', {
      items: [sentMailSummary],
      hasMore: false,
    }, 10_000)

    expect(readMailListCache(window.localStorage, identity.did, 'inbox', 10_001)).toEqual({
      items: [mailSummary],
      nextOffset: 20,
      hasMore: true,
    })
    expect(readMailListCache(window.localStorage, identity.did, 'sent', 10_001)).toEqual({
      items: [sentMailSummary],
      hasMore: false,
    })
    expect(readMailListCache(window.localStorage, 'did:wba:other' as AwikiDid, 'inbox', 10_001)).toBeUndefined()
  })

  it('discards corrupt and expired entries instead of rendering untrusted cache data', () => {
    writeMailListCache(window.localStorage, identity.did, 'inbox', {
      items: [mailSummary],
      hasMore: false,
    }, 20_000)
    const corruptKey = window.localStorage.key(0)
    expect(corruptKey).not.toBeNull()
    window.localStorage.setItem(corruptKey!, '{"version":1,"items":"not-an-array"}')
    expect(readMailListCache(window.localStorage, identity.did, 'inbox', 20_001)).toBeUndefined()
    expect(window.localStorage.getItem(corruptKey!)).toBeNull()

    writeMailListCache(window.localStorage, identity.did, 'sent', {
      items: [sentMailSummary],
      hasMore: false,
    }, 30_000)
    expect(readMailListCache(
      window.localStorage,
      identity.did,
      'sent',
      30_000 + MAIL_LIST_CACHE_MAX_AGE_MS + 1,
    )).toBeUndefined()
    expect(window.localStorage.length).toBe(0)
  })

  it('skips caching when the AWiki owner is invalid', () => {
    const invalidOwner = ' ' as AwikiDid
    writeMailListCache(window.localStorage, invalidOwner, 'inbox', {
      items: [mailSummary],
      hasMore: false,
    })
    expect(window.localStorage.length).toBe(0)
    expect(readMailListCache(window.localStorage, invalidOwner, 'inbox')).toBeUndefined()
  })

  it('remembers the last selected folder per AWiki owner', () => {
    expect(readMailFolderCache(window.localStorage, identity.did)).toBe('inbox')
    writeMailFolderCache(window.localStorage, identity.did, 'sent')
    expect(readMailFolderCache(window.localStorage, identity.did)).toBe('sent')
    expect(readMailFolderCache(window.localStorage, 'did:wba:other' as AwikiDid)).toBe('inbox')
  })
})
