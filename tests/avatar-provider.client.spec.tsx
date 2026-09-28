// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { Profiler } from 'react'
import { AwikiAvatar, AwikiAvatarProvider } from '../src/client/AwikiAvatar.tsx'
import type { AwikiDid, AwikiDisplayProfile } from '../src/types.ts'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

it('does not rerender unrelated avatars when another profile batch arrives', async () => {
  const batches: Array<() => void> = []
  const profiles = vi.fn((dids: readonly AwikiDid[]) => new Promise<readonly AwikiDisplayProfile[]>(resolve => {
    batches.push(() => { resolve(dids.map(did => ({ did, cacheHit: true, avatarUri: null }))) })
  }))
  const rendered = vi.fn()
  render(<AwikiAvatarProvider owner="owner" profile={null} avatarDisplayProfiles={profiles} avatarGroup={async () => null}>
    <Profiler id="first" onRender={rendered}><AwikiAvatar name="first" did={'did:benchmark:0' as AwikiDid} /></Profiler>
    {Array.from({ length: 104 }, (_, i) => <AwikiAvatar key={i} name={`${i}`} did={`did:benchmark:${i + 1}` as AwikiDid} />)}
  </AwikiAvatarProvider>)
  await waitFor(() => expect(batches).toHaveLength(1))
  await act(async () => { batches[0]!() })
  await waitFor(() => expect(batches).toHaveLength(2))
  const count = rendered.mock.calls.length
  await act(async () => { batches[1]!() })
  expect(rendered).toHaveBeenCalledTimes(count)
})

it('drains all visible peers in batches of at most 100 without a new scroll event', async () => {
  const profiles = vi.fn(async () => [])
  render(<AwikiAvatarProvider owner="owner" profile={null} avatarDisplayProfiles={profiles} avatarGroup={async () => null}>
    {Array.from({ length: 205 }, (_, index) => <AwikiAvatar key={index} name={`${index}`} did={`did:wba:example.com:user:${index}` as AwikiDid} />)}
  </AwikiAvatarProvider>)
  await waitFor(() => expect(profiles).toHaveBeenCalledTimes(3))
  expect(profiles.mock.calls.map(call => (call as unknown as [string[]])[0].length)).toEqual([100, 100, 5])
})

it('does not dispatch a queued old-owner batch through the new owner', async () => {
  const oldProfiles = vi.fn(async () => [])
  const newProfiles = vi.fn(async () => [])
  const group = async () => null
  const tree = (owner: string, profiles: typeof oldProfiles) => <AwikiAvatarProvider owner={owner} profile={null} avatarDisplayProfiles={profiles} avatarGroup={group}>
    <AwikiAvatar name={owner} did={`did:wba:example.com:user:${owner}` as AwikiDid} />
  </AwikiAvatarProvider>
  const view = render(tree('old', oldProfiles))
  view.rerender(tree('new', newProfiles))
  await waitFor(() => expect(newProfiles).toHaveBeenCalledTimes(1))
  expect(oldProfiles).not.toHaveBeenCalled()
  expect(newProfiles).toHaveBeenCalledWith(['did:wba:example.com:user:new'])
})
