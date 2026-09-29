// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { renderOverlay } from './helpers.overlay.tsx'
import { identity } from './helpers.client.ts'

beforeEach(() => { vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline fixture'))) })
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
it('loads avatar capability, clears the current profile and keeps text editing independent', async () => {
  const app = renderOverlay({ profile: { did: identity.did, displayName: 'Alice', bio: '', tags: [], avatarUri: 'https://example.com/a.jpg', avatarThumbnailUri: 'https://example.com/t.jpg', profileVersion: '8', avatarUploadEnabled: true } })
  fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
  await screen.findByText('Alice')
  fireEvent.click(screen.getByRole('button', { name: '设置头像' }))
  await screen.findByRole('button', { name: '恢复默认头像' })
  await waitFor(() => expect(screen.getByRole('button', { name: '恢复默认头像' }).hasAttribute('disabled')).toBe(false))
  fireEvent.click(screen.getByRole('button', { name: '恢复默认头像' }))
  expect(app.fake.calls.some(call => call.method === 'clearAvatar')).toBe(false)
  fireEvent.click(screen.getByRole('button', { name: '确认恢复默认头像', exact: true }))
  await waitFor(() => expect(app.controller.getSnapshot().profile?.avatarUri).toBeNull())
  const calls = app.fake.calls.filter(call => call.method === 'clearAvatar')
  expect(calls).toHaveLength(1)
  expect(calls[0]?.request).toEqual({ requestId: expect.any(String), expectedProfileVersion: '8' })
  expect(app.fake.calls.some(call => call.method === 'updateProfile')).toBe(false)
  app.controller.dispose()
})
it('an older service keeps its fallback avatar and disables upload actions', async () => {
  const app = renderOverlay()
  fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
  await screen.findByText('Alice')
  fireEvent.click(screen.getByRole('button', { name: '设置头像' }))
  await screen.findByText('当前账号或服务暂不支持修改头像。')
  expect(screen.getByRole('button', { name: '选择照片' }).hasAttribute('disabled')).toBe(true)
  expect(app.fake.calls.some(call => call.method === 'setAvatar')).toBe(false)
  app.controller.dispose()
})
