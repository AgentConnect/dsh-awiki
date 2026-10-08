// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AwikiAvatarProvider } from '../src/client/AwikiAvatar.tsx'
import { AwikiAvatarPreview } from '../src/client/AwikiAvatarPreview.tsx'
import { AwikiAvatarEditor } from '../src/client/AwikiAvatarEditor.tsx'
import { avatarCache } from '../src/client/avatar-cache.ts'
import type { AwikiDid, AwikiDisplayProfile, AwikiProfile } from '../src/types.ts'

afterEach(() => { cleanup(); vi.restoreAllMocks() })
const did = 'did:wba:example.com:user:bob' as AwikiDid

it('Escape dismisses only the avatar preview and releases its listener afterwards', async () => {
  vi.spyOn(avatarCache, 'load').mockResolvedValue('blob:fixture')
  const drawerEscape = vi.fn()
  document.addEventListener('keydown', drawerEscape)
  try {
    render(<AwikiAvatarProvider owner="alice" profile={null}
      avatarDisplayProfiles={async () => []} avatarGroup={async () => null}>
      <AwikiAvatarPreview did={did} name="Bob" uri="https://example.com/main.jpg" />
    </AwikiAvatarProvider>)
    fireEvent.click(screen.getByRole('button', { name: '查看Bob的头像' }))
    await screen.findByRole('img', { name: '头像大图' })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(drawerEscape).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(drawerEscape).toHaveBeenCalledTimes(1)
  } finally { document.removeEventListener('keydown', drawerEscape) }
})

it('a busy avatar editor consumes Escape without dismissing its drawer or dropping work', async () => {
  const profile: AwikiProfile = { did, displayName: 'Bob', bio: '', tags: [] }
  let finish!: (value: { ok: true; value: AwikiProfile }) => void
  const onClose = vi.fn()
  const drawerEscape = vi.fn()
  document.addEventListener('keydown', drawerEscape)
  try {
    render(<AwikiAvatarEditor owner="alice" profile={null} onClose={onClose}
      refreshAvatarProfile={() => new Promise(resolve => { finish = resolve })}
      setAvatar={async () => ({ ok: true, value: profile })} clearAvatar={async () => ({ ok: true, value: profile })} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    expect(drawerEscape).not.toHaveBeenCalled()
    finish({ ok: true, value: profile })
    await waitFor(() => expect(document.querySelector('[aria-busy="false"]')).not.toBeNull())
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(drawerEscape).not.toHaveBeenCalled()
  } finally { document.removeEventListener('keydown', drawerEscape) }
})
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
  expect(load).toHaveBeenCalledWith('alice', 'https://example.com/main.jpg', 512, true, false)
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

it.each([true, false])('plays only publicly typed agent details; reduced motion=%s', async reduced => {
  vi.stubGlobal('matchMedia', () => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  const load = vi.spyOn(avatarCache, 'load').mockResolvedValue('blob:fixture')
  try {
    render(<AwikiAvatarProvider owner="alice" profile={null}
      avatarDisplayProfiles={async () => [{ did, subjectType: 'agent', avatarUri: 'https://example.com/a.gif', avatarThumbnailUri: 'https://example.com/a.png', cacheHit: true }]}
      avatarGroup={async () => null}>
      <AwikiAvatarPreview did={did} name="Agent" uri="https://example.com/a.gif" />
    </AwikiAvatarProvider>)
    await waitFor(() => expect(load).toHaveBeenCalledWith('alice', 'https://example.com/a.png', 128))
    fireEvent.click(screen.getByRole('button', { name: '查看Agent的头像' }))
    await screen.findByRole('img', { name: '头像大图' })
    await waitFor(() => expect(load).toHaveBeenCalledWith('alice', `https://example.com/a.${reduced ? 'png' : 'gif'}`, 512, true, !reduced))
  } finally { vi.unstubAllGlobals() }
})


it('drops the moving image immediately when reduced motion changes without a poster URL', async () => {
  let changed!: () => void
  const media = { matches: false, addEventListener: (_event: string, callback: () => void) => { changed = callback }, removeEventListener: vi.fn() }
  vi.stubGlobal('matchMedia', () => media)
  const still: Array<(value: string | undefined) => void> = []
  vi.spyOn(avatarCache, 'load').mockImplementation(async (_owner, _uri, edge, _force, animate) => {
    if (edge !== 512) return 'blob:thumbnail'
    if (animate) return 'blob:moving'
    return new Promise(resolve => { still.push(resolve) })
  })
  try {
    render(<AwikiAvatarProvider owner="alice" profile={null}
      avatarDisplayProfiles={async () => [{ did, subjectType: 'agent', avatarUri: 'https://example.com/a.gif', cacheHit: true }]}
      avatarGroup={async () => null}>
      <AwikiAvatarPreview did={did} name="Agent" uri="https://example.com/a.gif" />
    </AwikiAvatarProvider>)
    await waitFor(() => expect(document.querySelector('[data-subject-type="agent"]')).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: '查看Agent的头像' }))
    await waitFor(() => expect(screen.getByRole('img', { name: '头像大图' }).getAttribute('src')).toBe('blob:moving'))
    act(() => { media.matches = true; changed() })
    expect(screen.queryByRole('img', { name: '头像大图' })).toBeNull()
    await act(async () => { still.forEach(resolve => { resolve(undefined) }) })
    await screen.findByRole('alert')
    expect(screen.queryByRole('img', { name: '头像大图' })).toBeNull()
  } finally { vi.unstubAllGlobals() }
})


it('coalesces reconnect events while the preview refresh is pending', async () => {
  let finish!: (value: string | undefined) => void
  const load = vi.spyOn(avatarCache, 'load').mockImplementation(async (_owner, _uri, edge) => {
    if (edge !== 512) return 'blob:thumbnail'
    return new Promise(resolve => { finish = resolve })
  })
  render(<AwikiAvatarProvider owner="alice" profile={null} avatarDisplayProfiles={async () => []} avatarGroup={async () => null}>
    <AwikiAvatarPreview did={did} name="Bob" uri="https://example.com/a.png" />
  </AwikiAvatarProvider>)
  fireEvent.click(screen.getByRole('button', { name: '查看Bob的头像' }))
  await waitFor(() => expect(finish).toBeTypeOf('function'))
  fireEvent(window, new Event('online')); fireEvent(window, new Event('online'))
  expect(load.mock.calls.filter(call => call[2] === 512)).toHaveLength(1)
  await act(async () => { finish('blob:large') })
  await screen.findByRole('img', { name: '头像大图' })
})
