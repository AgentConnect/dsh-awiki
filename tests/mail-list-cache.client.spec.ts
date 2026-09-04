// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import type { AwikiDid } from '@awiki/dsh-plugin/types'
import {
  clearMailBrowserCache,
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

  it('selectively clears every AWiki Mail projection while preserving unrelated origin storage', () => {
    const other = 'did:wba:other' as AwikiDid
    writeMailListCache(window.localStorage, identity.did, 'inbox', {
      items: [mailSummary], nextOffset: 20, hasMore: true,
    })
    writeMailListCache(window.localStorage, identity.did, 'sent', {
      items: [sentMailSummary], hasMore: false,
    })
    writeMailFolderCache(window.localStorage, identity.did, 'sent')
    writeMailListCache(window.localStorage, other, 'sent', {
      items: [{
        ...sentMailSummary,
        id: 'server-message-private' as typeof sentMailSummary.id,
        from: ['private-sender@example.com'],
        to: ['private-recipient@example.com'],
        subject: 'private subject',
        hasAttachments: true,
        attachmentCount: 2,
      }],
      hasMore: false,
    })
    writeMailFolderCache(window.localStorage, other, 'sent')
    window.localStorage.setItem('unrelated:application-state', 'keep-me')
    expect(JSON.stringify(Object.values({ ...window.localStorage }))).toContain('private-recipient@example.com')

    clearMailBrowserCache(window.localStorage)

    expect(readMailListCache(window.localStorage, identity.did, 'inbox')).toBeUndefined()
    expect(readMailListCache(window.localStorage, identity.did, 'sent')).toBeUndefined()
    expect(readMailListCache(window.localStorage, other, 'sent')).toBeUndefined()
    expect(readMailFolderCache(window.localStorage, identity.did)).toBe('inbox')
    expect(readMailFolderCache(window.localStorage, other)).toBe('inbox')
    expect(window.localStorage.getItem('unrelated:application-state')).toBe('keep-me')
    expect(window.localStorage.length).toBe(1)
  })
})
