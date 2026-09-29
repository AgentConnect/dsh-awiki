// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AwikiAvatarProvider } from '../src/client/AwikiAvatar.tsx'
import { AwikiAvatarPreview } from '../src/client/AwikiAvatarPreview.tsx'
import { avatarCache } from '../src/client/avatar-cache.ts'
import type { AwikiDid, AwikiDisplayProfile } from '../src/types.ts'

afterEach(() => { cleanup(); vi.restoreAllMocks() })
const did = 'did:wba:example.com:user:bob' as AwikiDid
it('opens the main image, retries failure, observes clear and fences an owner switch', async () => {
  const load = vi.spyOn(avatarCache, 'load').mockResolvedValue(undefined)
  const tree = (owner: string, uri: string | null) => <AwikiAvatarProvider owner={owner}
    profile={{ did, displayName: 'Bob', bio: '', tags: [], avatarUri: uri }}
    avatarDisplayProfiles={async () => []} avatarGroup={async () => null}>
    <AwikiAvatarPreview did={did} name="Bob" uri="https://example.com/stale.jpg" />
  </AwikiAvatarProvider>
  const view = render(tree('alice', 'https://example.com/main.jpg'))
  fireEvent.click(screen.getByRole('button', { name: '查看Bob的头像' }))
  await screen.findByRole('alert')
  load.mockResolvedValue('blob:fixture')
  fireEvent.click(screen.getByRole('button', { name: '重试' }))
  await screen.findByRole('img', { name: '头像大图' })
  expect(load).toHaveBeenCalledWith('alice', 'https://example.com/main.jpg', 512, true)
  view.rerender(tree('alice', null))
  await screen.findByText('尚未设置头像')
  expect(screen.queryByRole('img', { name: '头像大图' })).toBeNull()
  expect(screen.queryByRole('button', { name: '查看Bob的头像' })).toBeNull()
  view.rerender(tree('other', null))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
})

it('does not resurrect a stale card URI when the peer projection explicitly clears it', async () => {
  vi.spyOn(avatarCache, 'load').mockResolvedValue(undefined)
  const profiles = vi.fn(async (): Promise<readonly AwikiDisplayProfile[]> => [{ did, cacheHit: true, avatarUri: null }])
  render(<AwikiAvatarProvider owner="alice" profile={null} avatarDisplayProfiles={profiles} avatarGroup={async () => null}>
    <AwikiAvatarPreview did={did} name="Bob" uri="https://example.com/stale.jpg" />
  </AwikiAvatarProvider>)
  await waitFor(() => expect(profiles).toHaveBeenCalledTimes(1))
  await waitFor(() => expect(screen.queryByRole('button', { name: '查看Bob的头像' })).toBeNull())
})
