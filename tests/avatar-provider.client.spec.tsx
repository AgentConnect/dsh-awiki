// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { AwikiAvatar, AwikiAvatarProvider } from '../src/client/AwikiAvatar.tsx'
import type { AwikiDid } from '../src/types.ts'

afterEach(() => { cleanup(); vi.restoreAllMocks() })

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
