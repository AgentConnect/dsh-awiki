// @vitest-environment jsdom
import { createHash } from 'node:crypto'
import { useSyncExternalStore } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { AwikiDid, AwikiMessage, AwikiRecoveryProgress } from '@awiki/dsh-plugin/types'
import { AwikiController } from '../src/client/controller.ts'
import { AWIKI_ME_APP_ICON_DATA_URL } from '../src/client/assets.ts'
import {
  AWIKI_DRAWER_FRAME_KEY,
  AWIKI_LAUNCHER_POSITION_KEY,
  AwikiOverlay,
  clampAwikiDrawerFrame,
  clampAwikiLauncherPosition,
  resizeAwikiDrawerFrame,
  resolveAwikiDrawerPlacement,
} from '../src/client/AwikiOverlay.tsx'
import { createAwikiOverlayStore } from '../src/client/store.ts'
import type { AwikiOverlayProps } from '../src/client/slots.ts'
import { attachmentMessage, carried, direct, fakeRemote, group, groupMembers, groupSnapshot, identity, mailAccount, mailMessage, mailSummary, message, sentMailMessage, sentMailSummary, success, summary } from './helpers.client.ts'
import { saveDownloadedAttachment } from '../src/client/file.ts'
import { readMailListCache, writeMailListCache } from '../src/client/mail-list-cache.ts'

vi.mock('../src/client/file.ts', async importOriginal => ({
  ...await importOriginal<typeof import('../src/client/file.ts')>(),
  saveDownloadedAttachment: vi.fn(),
}))

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  window.localStorage.clear()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** Render the pure component with real observable/controller/store products. */
function renderOverlay(options: Parameters<typeof fakeRemote>[0] & { registered?: boolean } = {}) {
  const { registered, ...remoteOptions } = options
  const identityOption = registered === false
    ? { identity: null }
    : remoteOptions.identity === undefined ? {} : { identity: remoteOptions.identity }
  const fake = fakeRemote({ ...remoteOptions, ...identityOption })
  const controller = new AwikiController(fake.remote)
  const instance = createAwikiOverlayStore().create()
  const useStore: AwikiOverlayProps['useStore'] = selector =>
    useSyncExternalStore(
      (listener: () => void) => instance.subscribe(listener),
      () => selector(instance.getSnapshot()),
    )
  const useAwiki: AwikiOverlayProps['useAwiki'] = selector =>
    useSyncExternalStore(
      (listener: () => void) => controller.subscribe(listener),
      () => selector(controller.getSnapshot()),
    )
  const props: AwikiOverlayProps = {
    useStore,
    actions: instance.actions,
    useAwiki,
    open: () => controller.open(),
    close: () => { controller.close() },
    inspectIdentityAccess: request => controller.inspectIdentityAccess(request),
    sendRegistrationOtp: request => controller.sendRegistrationOtp(request),
    registerIdentity: request => controller.registerIdentity(request),
    beginDeviceJoin: () => controller.beginDeviceJoin(),
    getDeviceJoinStatus: () => controller.getDeviceJoinStatus(),
    cancelDeviceJoin: () => controller.cancelDeviceJoin(),
    refreshDeviceManagement: () => controller.refreshDeviceManagement(),
    startDeviceJoinVerification: request => controller.startDeviceJoinVerification(request),
    approveDeviceJoin: request => controller.approveDeviceJoin(request),
    rejectDeviceJoin: request => controller.rejectDeviceJoin(request),
    revokeDevice: request => controller.revokeDevice(request),
    prepareRootTransfer: request => controller.prepareRootTransfer(request),
    confirmRootTransfer: request => controller.confirmRootTransfer(request),
    updateDisplayName: displayName => controller.updateDisplayName(displayName),
    updateProfile: request => controller.updateProfile(request),
    sendRecoveryOtp: request => controller.sendRecoveryOtp(request),
    prepareRecovery: request => controller.prepareRecovery(request),
    activateRecovery: () => controller.activateRecovery(),
    refreshRecoveryStatus: () => controller.refreshRecoveryStatus(),
    resumeRecovery: () => controller.resumeRecovery(),
    discardRecovery: () => controller.discardRecovery(),
    loadMoreConversations: () => controller.loadMoreConversations(),
    hideConversation: conversationId => controller.hideConversation(conversationId),
    restoreConversation: conversationId => controller.restoreConversation(conversationId),
    startDirectChat: handle => controller.startDirectChat(handle),
    createGroup: (name, members) => controller.createGroup(name, members),
    joinGroup: groupDid => controller.joinGroup(groupDid),
    refreshSelectedGroup: () => controller.refreshSelectedGroup(),
    loadMoreGroupMembers: () => controller.loadMoreGroupMembers(),
    addSelectedGroupMember: member => controller.addSelectedGroupMember(member),
    removeSelectedGroupMember: member => controller.removeSelectedGroupMember(member),
    leaveSelectedGroup: () => controller.leaveSelectedGroup(),
    selectConversation: id => controller.selectConversation(id),
    markSelectedConversationRead: () => controller.markSelectedConversationRead(),
    loadOlderHistory: () => controller.loadOlderHistory(),
    summarizeConversation: () => controller.summarizeConversation(),
    setSummaryCollapsed: (conversationId, collapsed) => { controller.setSummaryCollapsed(conversationId, collapsed) },
    sendText: (text, clientMessageId, mentions) => controller.sendText(text, clientMessageId, mentions),
    sendAttachment: file => controller.sendAttachment(file),
    downloadAttachment: (messageId, attachmentId) => controller.downloadAttachment(messageId, attachmentId),
    logout: () => controller.logout({ confirmation: 'logout-awiki-session' }),
    login: () => controller.login(),
    clearLocalIdentity: async () => {
      const result = await controller.clearLocalData({ confirmation: 'clear-awiki-local-data' })
      return result.ok ? { ok: true, value: undefined } : result
    },
    getMailAccount: () => controller.getMailAccount(),
    listMailInbox: request => controller.listMailInbox(request),
    readMail: request => controller.readMail(request),
    markMailRead: request => controller.markMailRead(request),
    sendMail: request => controller.sendMail(request),
    useSessions: (() => undefined) as never,
    useWorkspaces: (() => undefined) as never,
  }
  render(<AwikiOverlay {...props} />)
  return { fake, controller, instance }
}

function deferred<Value>() {
  let resolve!: (value: Value) => void
  const promise = new Promise<Value>((settle) => { resolve = settle })
  return { promise, resolve }
}

describe('AwikiOverlay', () => {
  it('defaults the launcher to the lower-left DSH sidebar area', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1280)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(840)
    renderOverlay()

    const launcher = screen.getByRole('button', { name: '打开 AWiki' })
    expect(launcher.style.left).toBe('176px')
    expect(launcher.style.top).toBe('640px')
  })

  it('keeps a 48px floating launcher draggable, reachable, and session-scoped', async () => {
    const viewportWidth = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(320)
    const viewportHeight = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(240)
    window.sessionStorage.setItem(AWIKI_LAUNCHER_POSITION_KEY, JSON.stringify({ left: 40, top: 50 }))
    renderOverlay()
    const launcher = screen.getByRole('button', { name: '打开 AWiki' })

    expect(launcher.style.left).toBe('40px')
    expect(launcher.style.top).toBe('50px')
    const iconSource = launcher.querySelector('img')?.getAttribute('src')
    expect(iconSource).toBe(AWIKI_ME_APP_ICON_DATA_URL)
    expect(launcher.querySelector('svg')).toBeNull()
    expect(createHash('sha256').update(Buffer.from(iconSource!.split(',')[1]!, 'base64')).digest('hex'))
      .toBe('289224256ee8144d80ee863e83c208fab732aba2ca44117af157eff3d9b53f5d')
    fireEvent.pointerDown(launcher, { button: 0, pointerId: 7, clientX: 50, clientY: 60 })
    fireEvent.pointerMove(launcher, { pointerId: 7, clientX: 500, clientY: 500 })
    fireEvent.pointerUp(launcher, { pointerId: 7, clientX: 500, clientY: 500 })
    expect(launcher.style.left).toBe('264px')
    expect(launcher.style.top).toBe('184px')
    expect(JSON.parse(window.sessionStorage.getItem(AWIKI_LAUNCHER_POSITION_KEY)!)).toEqual({ left: 264, top: 184 })

    fireEvent.click(launcher)
    expect(screen.queryByRole('dialog', { name: 'AWiki' })).toBeNull()
    fireEvent.click(launcher)
    const drawer = await screen.findByRole('dialog', { name: 'AWiki' })
    expect(drawer.dataset.placement).toBe('upper-left')
    expect(drawer.style.left).toBe('8px')
    expect(drawer.style.top).toBe('8px')

    viewportWidth.mockReturnValue(200)
    viewportHeight.mockReturnValue(180)
    fireEvent(window, new Event('resize'))
    expect(launcher.style.left).toBe('144px')
    expect(launcher.style.top).toBe('124px')
  })

  it('clamps launcher coordinates against undersized viewports', () => {
    expect(clampAwikiLauncherPosition({ left: -100, top: 900 }, 40, 30)).toEqual({ left: 8, top: 8 })
  })

  it('shows the aggregated unread badge while closed and caps its visible label', async () => {
    renderOverlay({
      conversations: [
        { ...direct, unreadCount: 2 },
        { ...group, unreadCount: 102 },
      ],
    })

    const launcher = await screen.findByRole('button', { name: '打开 AWiki，104 条未读消息' })
    expect(launcher.textContent).toBe('99+')
    expect(screen.queryByRole('dialog', { name: 'AWiki' })).toBeNull()
  })

  it('shows each conversation unread count on its avatar and caps the visible label', async () => {
    renderOverlay({
      conversations: [
        { ...direct, unreadCount: 2 },
        { ...group, unreadCount: 102 },
      ],
    })

    fireEvent.click(await screen.findByRole('button', { name: '打开 AWiki，104 条未读消息' }))
    const directRow = await screen.findByRole('button', { name: 'Bob，2 条未读消息' })
    const groupRow = screen.getByRole('button', { name: 'Harness Team，102 条未读消息' })
    expect(directRow.textContent).toContain('2')
    expect(groupRow.textContent).toContain('99+')
  })

  it('places the chat panel in each available corner quadrant of the launcher', () => {
    const placement = (left: number, top: number) => resolveAwikiDrawerPlacement(
      { left, top }, 400, 300, 1000, 800,
    )
    expect(placement(900, 700)).toEqual({ direction: 'upper-left', left: 492, top: 392 })
    expect(placement(20, 700)).toEqual({ direction: 'upper-right', left: 76, top: 392 })
    expect(placement(900, 20)).toEqual({ direction: 'lower-left', left: 492, top: 76 })
    expect(placement(20, 20)).toEqual({ direction: 'lower-right', left: 76, top: 76 })
  })

  it('resizes every drawer edge and corner while keeping opposite boundaries fixed', () => {
    const frame = { left: 400, top: 300, width: 600, height: 500 }
    const resized = (direction: Parameters<typeof resizeAwikiDrawerFrame>[1]) => (
      resizeAwikiDrawerFrame(frame, direction, direction.includes('w') ? -100 : 100, direction.includes('n') ? -100 : 100, 1600, 1200)
    )

    expect(resized('n')).toEqual({ left: 400, top: 200, width: 600, height: 600 })
    expect(resized('ne')).toEqual({ left: 400, top: 200, width: 700, height: 600 })
    expect(resized('e')).toEqual({ left: 400, top: 300, width: 700, height: 500 })
    expect(resized('se')).toEqual({ left: 400, top: 300, width: 700, height: 600 })
    expect(resized('s')).toEqual({ left: 400, top: 300, width: 600, height: 600 })
    expect(resized('sw')).toEqual({ left: 300, top: 300, width: 700, height: 600 })
    expect(resized('w')).toEqual({ left: 300, top: 300, width: 700, height: 500 })
    expect(resized('nw')).toEqual({ left: 300, top: 200, width: 700, height: 600 })

    expect(clampAwikiDrawerFrame({ left: -40, top: -20, width: 2000, height: 20 }, 1000, 800))
      .toEqual({ left: 8, top: 8, width: 984, height: 360 })
  })

  it('drags a drawer corner to resize and restores the frame in the same tab session', async () => {
    const viewportWidth = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1600)
    const viewportHeight = vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(1200)
    window.sessionStorage.setItem(AWIKI_LAUNCHER_POSITION_KEY, JSON.stringify({ left: 1400, top: 1050 }))
    renderOverlay()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    let drawer = await screen.findByRole('dialog', { name: 'AWiki' })
    expect(drawer.style.cssText).toContain('width: 720px')
    expect(drawer.style.cssText).toContain('height: 720px')

    const southeast = drawer.querySelector<HTMLElement>('[data-resize-handle="se"]')!
    fireEvent.pointerDown(southeast, { button: 0, pointerId: 19, clientX: 1392, clientY: 1042 })
    fireEvent.pointerMove(window, { pointerId: 19, clientX: 1492, clientY: 1142 })
    expect(drawer.dataset.resizing).toBe('se')
    expect(drawer.style.cssText).toContain('width: 820px')
    expect(drawer.style.cssText).toContain('height: 820px')
    expect(drawer.style.left).toBe('672px')
    expect(drawer.style.top).toBe('322px')
    fireEvent.pointerUp(window, { pointerId: 19, clientX: 1492, clientY: 1142 })

    expect(drawer.dataset.resizing).toBeUndefined()
    expect(JSON.parse(window.sessionStorage.getItem(AWIKI_DRAWER_FRAME_KEY)!))
      .toEqual({ left: 672, top: 322, width: 820, height: 820 })

    cleanup()
    renderOverlay()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    drawer = await screen.findByRole('dialog', { name: 'AWiki' })
    expect(drawer.style.cssText).toContain('width: 820px')
    expect(drawer.style.cssText).toContain('height: 820px')
    expect(drawer.style.left).toBe('672px')
    expect(drawer.style.top).toBe('322px')

    vi.useFakeTimers()
    const header = screen.getByRole('banner')
    fireEvent.pointerDown(header, { button: 0, pointerId: 20, clientX: 800, clientY: 400 })
    await vi.advanceTimersByTimeAsync(300)
    fireEvent.pointerMove(header, { pointerId: 20, clientX: 700, clientY: 350 })
    expect(drawer.style.left).toBe('572px')
    expect(drawer.style.top).toBe('272px')
    expect(drawer.style.cssText).toContain('width: 820px')
    expect(drawer.style.cssText).toContain('height: 820px')
    fireEvent.pointerUp(header, { pointerId: 20, clientX: 700, clientY: 350 })

    viewportWidth.mockReturnValue(700)
    viewportHeight.mockReturnValue(600)
    fireEvent(window, new Event('resize'))
    expect(drawer.style.left).toBe('8px')
    expect(drawer.style.top).toBe('8px')
    expect(drawer.style.cssText).toContain('width: 684px')
    expect(drawer.style.cssText).toContain('height: 584px')
    expect(JSON.parse(window.sessionStorage.getItem(AWIKI_DRAWER_FRAME_KEY)!))
      .toEqual({ left: 8, top: 8, width: 684, height: 584 })
  })

  it('long-presses the panel header to drag the panel and launcher together', async () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1600)
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(1200)
    window.sessionStorage.setItem(AWIKI_LAUNCHER_POSITION_KEY, JSON.stringify({ left: 1400, top: 1050 }))
    renderOverlay()
    const launcher = screen.getByRole('button', { name: '打开 AWiki' })
    fireEvent.click(launcher)
    const drawer = await screen.findByRole('dialog', { name: 'AWiki' })
    const header = screen.getByRole('banner')
    vi.useFakeTimers()
    expect(drawer.dataset.placement).toBe('upper-left')
    expect(drawer.style.left).toBe('672px')
    expect(drawer.style.top).toBe('322px')

    fireEvent.pointerDown(header, { button: 0, pointerId: 8, clientX: 800, clientY: 400 })
    await vi.advanceTimersByTimeAsync(300)
    fireEvent.pointerMove(header, { pointerId: 8, clientX: 500, clientY: 200 })

    expect(launcher.style.left).toBe('1100px')
    expect(launcher.style.top).toBe('850px')
    expect(drawer.dataset.placement).toBe('upper-left')
    expect(drawer.style.left).toBe('372px')
    expect(drawer.style.top).toBe('122px')
    expect(header.dataset.dragging).toBe('true')

    fireEvent.pointerUp(header, { pointerId: 8, clientX: 500, clientY: 200 })
    expect(JSON.parse(window.sessionStorage.getItem(AWIKI_LAUNCHER_POSITION_KEY)!))
      .toEqual({ left: 1100, top: 850 })
    expect(header.dataset.dragging).toBeUndefined()

    const refresh = screen.getByRole('button', { name: '刷新 AWiki' })
    fireEvent.pointerDown(refresh, { button: 0, pointerId: 9, clientX: 500, clientY: 200 })
    await vi.advanceTimersByTimeAsync(300)
    fireEvent.pointerMove(refresh, { pointerId: 9, clientX: 300, clientY: 100 })
    fireEvent.pointerUp(refresh, { pointerId: 9, clientX: 300, clientY: 100 })
    expect(launcher.style.left).toBe('1100px')
    expect(launcher.style.top).toBe('850px')
  })

  it('starts a direct chat from the header menu after the user enters a Handle', async () => {
    const b = renderOverlay()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByText('Alice')
    const compose = screen.getByRole('button', { name: '发起会话' })
    expect(screen.getByRole('complementary', { name: '会话' }).contains(compose)).toBe(true)
    expect(screen.getByRole('banner').contains(compose)).toBe(false)
    fireEvent.click(compose)
    fireEvent.click(screen.getByRole('menuitem', { name: '发起私聊' }))
    const handle = await screen.findByLabelText('Handle')
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '打开会话' }).disabled).toBe(true)
    fireEvent.change(handle, { target: { value: 'carol' } })
    fireEvent.click(screen.getByRole('button', { name: '打开会话' }))
    await waitFor(() => {
      expect(b.controller.getSnapshot().selectedConversationId).toBe('c-carol')
    })
    expect(screen.getAllByText('Carol').length).toBeGreaterThan(0)
    expect(screen.queryByRole('dialog', { name: '发起私聊' })).toBeNull()
  })

  it('creates a group from the header menu and opens the new conversation', async () => {
    const b = renderOverlay({ history: [] })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByText('Alice')
    fireEvent.click(screen.getByRole('button', { name: '发起会话' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '发起群聊' }))
    const create = screen.getByRole<HTMLButtonElement>('button', { name: '创建群聊' })
    expect(create.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('群聊名称'), { target: { value: 'Release Crew' } })
    fireEvent.change(screen.getByLabelText('群成员'), {
      target: { value: ' @bob \ncarol.awiki.info，bob' },
    })
    fireEvent.click(create)

    await waitFor(() => {
      expect(b.controller.getSnapshot().selectedConversationId).toBe('group:did:wba:release-crew')
    })
    expect(b.fake.calls.find(call => call.method === 'createGroup')?.request).toEqual({
      name: 'Release Crew',
      members: ['bob', 'carol.awiki.info'],
    })
    expect(screen.getAllByText('Release Crew').length).toBeGreaterThan(0)
    expect(screen.queryByRole('dialog', { name: '发起群聊' })).toBeNull()
  })

  it('creates a group without optional initial members', async () => {
    const b = renderOverlay({ history: [] })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByText('Alice')
    fireEvent.click(screen.getByRole('button', { name: '发起会话' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '发起群聊' }))

    expect(screen.getByText('首批群成员（可选）')).toBeTruthy()
    expect(screen.getByLabelText('群成员').getAttribute('placeholder')).toBe('例如 alice.tenant.example\nbob.tenant.example')
    fireEvent.change(screen.getByLabelText('群聊名称'), { target: { value: 'Empty Team' } })
    fireEvent.click(screen.getByRole('button', { name: '创建群聊' }))

    await waitFor(() => {
      expect(b.controller.getSnapshot().selectedConversationId).toBe('group:did:wba:release-crew')
    })
    expect(b.fake.calls.find(call => call.method === 'createGroup')?.request).toEqual({
      name: 'Empty Team',
      members: [],
    })
    expect(screen.queryByRole('dialog', { name: '发起群聊' })).toBeNull()
  })

  it('cancels the Handle dialog without closing the AWiki drawer', async () => {
    renderOverlay()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByText('Alice')
    fireEvent.click(screen.getByRole('button', { name: '发起会话' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '发起私聊' }))
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(screen.queryByRole('dialog', { name: '发起私聊' })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'AWiki' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '发起会话' }))
    expect(screen.getByRole('menuitem', { name: '发起私聊' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menuitem', { name: '发起私聊' })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'AWiki' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '发起会话' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '发起私聊' }))
    fireEvent.change(screen.getByLabelText('Handle'), { target: { value: 'alice' } })
    fireEvent.click(screen.getByRole('button', { name: '打开会话' }))
    expect(await screen.findByText('不能向自己发起私聊')).toBeTruthy()
    expect(screen.getByRole('dialog', { name: '发起私聊' })).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Handle'), { target: { value: 'missing-user' } })
    fireEvent.click(screen.getByRole('button', { name: '打开会话' }))
    expect(await screen.findByText('该 Handle 不存在')).toBeTruthy()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: '发起私聊' })).toBeNull()
    expect(screen.getByRole('dialog', { name: 'AWiki' })).toBeTruthy()
  })

  it('hides the compose action until an identity is registered', async () => {
    renderOverlay({ registered: false })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByText('进入 AWiki')
    expect(screen.queryByRole('button', { name: '发起会话' })).toBeNull()
  })

  it('opens the drawer, shows identity, and renders direct/group navigation', async () => {
    renderOverlay()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    expect(await screen.findByRole('dialog', { name: 'AWiki' })).toBeTruthy()
    expect(await screen.findByText('Alice')).toBeTruthy()
    expect(screen.getByText('在线')).toBeTruthy()
    expect(screen.queryByText('可发送消息')).toBeNull()
    expect(screen.getByText('alice')).toBeTruthy()
    expect(screen.queryByText('did:wba:alice')).toBeNull()
    fireEvent.mouseEnter(screen.getByText('Alice'))
    expect(screen.getByRole('tooltip').textContent).toBe('did:wba:alice')
    expect(screen.getByRole('button', { name: /Bob/ }).textContent).toContain('你好')
  })

  it('removes a recent row locally, explains the boundary, and restores it from the hidden list', async () => {
    const b = renderOverlay({ conversations: [direct, group] })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    const bob = await screen.findByRole('button', { name: /Bob/u })
    const bobRow = bob.parentElement
    expect(bobRow).not.toBeNull()

    fireEvent.click(within(bobRow!).getByRole('button', { name: '更多会话操作' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '从会话列表移除' }))
    const confirmation = await screen.findByRole('dialog', { name: '从会话列表移除' })
    expect(confirmation.textContent).toContain('只会从本机最近会话中移除')
    expect(confirmation.textContent).toContain('不会清除已有消息')
    expect(confirmation.textContent).toContain('收到新消息后可能重新出现')

    fireEvent.click(within(confirmation).getByRole('button', { name: '确认移除' }))
    await waitFor(() => { expect(screen.queryByRole('button', { name: /Bob/u })).toBeNull() })
    expect(b.fake.calls.filter(call => call.method === 'leaveGroup')).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: '查看已隐藏会话，1 个' }))
    const hidden = await screen.findByRole('dialog', { name: '已隐藏会话' })
    expect(within(hidden).getByText('Bob')).toBeTruthy()
    fireEvent.click(within(hidden).getByRole('button', { name: '恢复' }))
    expect(await screen.findByRole('button', { name: /Bob/u })).toBeTruthy()
    await waitFor(() => { expect(screen.queryByRole('dialog', { name: '已隐藏会话' })).toBeNull() })
  })

  it('keeps historical messages readable while current membership remains unavailable', async () => {
    const localMessage: AwikiMessage = {
      ...message,
      id: 'blocked-group-local-message' as never,
      conversationId: group.id,
      conversationKind: 'group',
      content: { kind: 'text', text: '本机仍可查看的群消息' },
    }
    const b = renderOverlay({
      conversations: [group],
      localHistory: [localMessage],
    })
    const privateFailure = {
      ok: false as const,
      error: { code: 'group-membership-required' as const, message: 'private previous DID and service diagnostic' },
    }
    b.fake.remote.getGroup = (request) => {
      b.fake.calls.push({ method: 'getGroup', request })
      return carried(privateFailure)
    }
    b.fake.remote.getHistory = (request) => {
      b.fake.calls.push({ method: 'getHistory', request })
      return carried(privateFailure)
    }

    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Harness Team/u }))
    expect(await screen.findByText('当前身份暂时无法访问此群聊')).toBeTruthy()
    expect(screen.getByText('本机仍可查看的群消息')).toBeTruthy()
    expect(screen.getAllByText('Harness Team').length).toBeGreaterThanOrEqual(1)
    expect(document.body.textContent).not.toMatch(/private previous DID|service diagnostic/u)

    const composer = screen.getByPlaceholderText('当前群聊暂不可发送消息') as HTMLTextAreaElement
    expect(composer.disabled).toBe(true)
    expect((screen.getByRole('button', { name: '发送消息' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('button', { name: '从列表移除' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '打开群聊详情' }))
    const details = await screen.findByRole('complementary', { name: '群聊详情' })
    expect(within(details).getByText('Harness Team')).toBeTruthy()
    expect(within(details).getByText(group.groupDid)).toBeTruthy()
    expect(within(details).queryByText('正在读取群聊信息…')).toBeNull()
    fireEvent.click(within(details).getByRole('button', { name: '关闭群聊详情' }))

    fireEvent.click(screen.getByRole('button', { name: '尝试重新加入' }))
    await waitFor(() => {
      expect(b.fake.calls).toContainEqual({ method: 'joinGroup', request: { groupDid: group.groupDid } })
    })
    expect(await screen.findByText('当前身份暂时无法访问此群聊')).toBeTruthy()

    const accessBack = screen.getAllByRole('button', { name: '返回会话列表' })
      .find(button => button.textContent === '返回会话列表')
    expect(accessBack).toBeTruthy()
    fireEvent.click(accessBack!)
    await waitFor(() => { expect(b.controller.getSnapshot().selectedConversationId).toBeNull() })
    fireEvent.click(screen.getByRole('button', { name: /Harness Team/u }))
    expect(await screen.findByText('当前身份暂时无法访问此群聊')).toBeTruthy()

    b.fake.remote.getGroup = request => {
      b.fake.calls.push({ method: 'getGroup', request })
      return carried(success({ ...groupSnapshot, groupDid: request.groupDid }))
    }
    b.fake.remote.listGroupMembers = request => {
      b.fake.calls.push({ method: 'listGroupMembers', request })
      return carried(success({ items: groupMembers, hasMore: false, pageGroup: request.groupDid, warnings: [] }))
    }
    const callOffset = b.fake.calls.length
    fireEvent.click(screen.getByRole('button', { name: '重新检查' }))
    await waitFor(() => {
      expect(b.controller.getSnapshot().groupAccess?.status).toBe('available')
    })
    expect(b.fake.calls.slice(callOffset).map(call => call.method)).toEqual([
      'getGroup',
      'listGroupMembers',
    ])
    expect(screen.queryByText('当前身份暂时无法访问此群聊')).toBeNull()
    expect((screen.getByPlaceholderText('输入消息') as HTMLTextAreaElement).disabled).toBe(false)
    expect(screen.getByText('本机仍可查看的群消息')).toBeTruthy()
  })

  it('loads mail only after the user opens Mail and never marks a message read on open', async () => {
    const b = renderOverlay()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByText('Alice')
    expect(b.fake.calls.filter(call => call.method.startsWith('getMail') || call.method.startsWith('listMail'))).toHaveLength(0)

    fireEvent.click(screen.getByRole('tab', { name: /^邮件/u }))
    expect(await screen.findByText('Release status')).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'getMailAccount')).toHaveLength(1)
    expect(b.fake.calls.filter(call => call.method === 'listMailInbox')).toEqual([{
      method: 'listMailInbox',
      request: { folder: 'inbox', unreadOnly: false, limit: 20, offset: 0 },
    }])

    fireEvent.click(screen.getByRole('button', { name: /未读邮件：Release status/u }))
    expect(await screen.findByText(/Please confirm the checklist/u)).toBeTruthy()
    expect(screen.getByText('邮件内容来自外部，仅按纯文本显示。')).toBeTruthy()
    expect(screen.getByText('release.txt')).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'readMail')).toEqual([{
      method: 'readMail', request: { messageId: 'mail-1' },
    }])
    expect(b.fake.calls.filter(call => call.method === 'markMailRead')).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: '标为已读' }))
    const notice = await screen.findByText('已标为已读。')
    expect(notice.getAttribute('role')).toBe('status')
    expect(notice.getAttribute('aria-live')).toBe('polite')
    expect(notice.parentElement?.dataset.pane).toBe('detail')
    expect(screen.getByRole('region', { name: '邮件详情' }).contains(notice)).toBe(false)
    expect(b.fake.calls.filter(call => call.method === 'markMailRead')).toEqual([{
      method: 'markMailRead', request: { messageIds: ['mail-1'] },
    }])
    expect(screen.queryByRole('button', { name: '标为已读' })).toBeNull()
    expect(readMailListCache(window.localStorage, identity.did, 'inbox')?.items[0]?.unread).toBe(false)
    fireEvent.animationEnd(notice)
    expect(screen.queryByText('已标为已读。')).toBeNull()
  })

  it('manages devices only from the foreground Devices tab with explicit SAS and confirmation', async () => {
    const b = renderOverlay()
    b.fake.remote.refreshDeviceManagement = () => carried(success({
      canManage: true,
      rootTransferSupported: true,
      role: 'admin' as const,
      readiness: 'admin_ready' as const,
      devices: [
        { deviceRef: 'device-current', status: 'active' as const, role: 'admin' as const, managementReady: true, isCurrent: true },
        { deviceRef: 'device-phone', status: 'active' as const, role: 'member' as const, managementReady: false, isCurrent: false },
      ],
      requests: [{
        requestRef: 'request-phone', candidateKeyFingerprint: 'sha256:fixture',
        issuedAt: '2026-08-23T11:00:00Z', expiresAt: '2026-08-23T12:00:00Z', state: 'pending' as const,
        claimedByCurrentDevice: false, canStartVerification: true,
      }],
    }))
    b.fake.remote.startDeviceJoinVerification = request => carried(success({
      requestRef: request.requestRef, phase: 'sas-ready' as const,
      expiresAt: '2026-08-23T12:00:00Z', sas: '123456',
    }))
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('tab', { name: '设备' }))
    expect(await screen.findByText('sha256:fixture')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '开始验证' }))
    expect(await screen.findByText('123456')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('手机安全码'), { target: { value: '123456' } })
    fireEvent.change(screen.getByLabelText('批准确认词'), { target: { value: 'APPROVE' } })
    fireEvent.click(screen.getByRole('button', { name: '批准为 member' }))
    await waitFor(() => {
      expect(b.fake.calls.find(call => call.method === 'approveDeviceJoin')?.request).toEqual({
        requestRef: 'request-phone', enteredSas: '123456', confirmation: 'APPROVE',
      })
    })
    fireEvent.click(screen.getByRole('button', { name: '授予管理权' }))
    expect(await screen.findByText(/系统将验证本机用户身份/u)).toBeTruthy()
    expect(b.fake.calls.find(call => call.method === 'prepareRootTransfer')?.request).toEqual({
      deviceRef: 'device-phone',
    })
    fireEvent.click(screen.getByRole('button', { name: '使用系统认证并发送' }))
    await waitFor(() => {
      expect(b.fake.calls.find(call => call.method === 'confirmRootTransfer')?.request).toEqual({
        transferRef: 'root-transfer-opaque',
      })
    })
    expect(await screen.findByText(/管理能力已发送/u)).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: '会话' }))
    expect(screen.queryByText('123456')).toBeNull()
  })

  it('keeps member management closed and sends reject and revoke only from explicit device actions', async () => {
    const member = renderOverlay()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('tab', { name: '设备' }))
    expect(await screen.findByText('当前设备不是可用的管理设备，不能批准或撤销其他设备。')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '开始验证' })).toBeNull()
    expect(screen.queryByRole('button', { name: '拒绝' })).toBeNull()
    expect(screen.queryByRole('button', { name: '撤销' })).toBeNull()
    expect(member.fake.calls.filter(call => ['rejectDeviceJoin', 'revokeDevice'].includes(call.method))).toEqual([])
    cleanup()

    const admin = renderOverlay()
    admin.fake.remote.refreshDeviceManagement = () => carried(success({
      canManage: true,
      rootTransferSupported: true,
      role: 'admin' as const,
      readiness: 'admin_ready' as const,
      devices: [
        { deviceRef: 'device-current', status: 'active' as const, role: 'admin' as const, managementReady: true, isCurrent: true },
        { deviceRef: 'device-member', status: 'active' as const, role: 'member' as const, managementReady: false, isCurrent: false },
      ],
      requests: [{
        requestRef: 'request-member', candidateKeyFingerprint: 'sha256:reject-fixture',
        issuedAt: '2026-08-23T11:00:00Z', expiresAt: '2026-08-23T12:00:00Z', state: 'pending' as const,
        claimedByCurrentDevice: false, canStartVerification: true,
      }],
    }))
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('tab', { name: '设备' }))
    fireEvent.click(await screen.findByRole('button', { name: '拒绝' }))
    await waitFor(() => {
      expect(admin.fake.calls.find(call => call.method === 'rejectDeviceJoin')?.request).toEqual({
        requestRef: 'request-member', reason: 'user_rejected',
      })
    })
    fireEvent.click(screen.getByRole('button', { name: '撤销' }))
    fireEvent.change(screen.getByLabelText('撤销确认词'), { target: { value: 'REVOKE' } })
    fireEvent.click(screen.getByRole('button', { name: '确认撤销' }))
    await waitFor(() => {
      expect(admin.fake.calls.find(call => call.method === 'revokeDevice')?.request).toEqual({
        deviceRef: 'device-member', confirmation: 'REVOKE',
      })
    })
  })

  it('shows Root Transfer as unavailable when the Host lacks trusted local authentication', async () => {
    const b = renderOverlay()
    b.fake.remote.refreshDeviceManagement = () => carried(success({
      canManage: true,
      rootTransferSupported: false,
      role: 'admin' as const,
      readiness: 'admin_ready' as const,
      devices: [
        { deviceRef: 'device-member', status: 'active' as const, role: 'member' as const, managementReady: false, isCurrent: false },
      ],
      requests: [],
    }))
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('tab', { name: '设备' }))
    expect(await screen.findByText(/当前 Host 不支持 Root Transfer/u)).toBeTruthy()
    expect(screen.queryByRole('button', { name: '授予管理权' })).toBeNull()
  })

  it('uses the active inbox address when an incoming message omits its recipient list', async () => {
    const summaryWithoutRecipient = { ...mailSummary, to: [] }
    renderOverlay({
      mailInbox: { items: [summaryWithoutRecipient], hasMore: false },
      mailMessage: {
        ...mailMessage,
        summary: summaryWithoutRecipient,
      },
    })

    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByText('Alice')
    fireEvent.click(screen.getByRole('tab', { name: /^邮件/u }))
    fireEvent.click(await screen.findByRole('button', { name: /未读邮件：Release status/u }))
    await screen.findByText(/Please confirm the checklist/u)

    const recipientRow = screen.getByText('收件人').parentElement
    expect(recipientRow).not.toBeNull()
    expect(within(recipientRow!).getByText('alice@awiki.example')).toBeTruthy()
    expect(within(recipientRow!).queryByText('未提供')).toBeNull()
  })

  it('renders a cached inbox when the live refresh fails', async () => {
    const cachedInbox = {
      ...mailSummary,
      id: 'mail-cached-inbox' as typeof mailSummary.id,
      subject: 'Cached inbox while offline',
    }
    writeMailListCache(window.localStorage, identity.did, 'inbox', {
      items: [cachedInbox],
      hasMore: false,
    })
    const b = renderOverlay()
    b.fake.remote.getMailAccount = () => {
      b.fake.calls.push({ method: 'getMailAccount' })
      return carried({
        ok: false,
        error: { code: 'network' as const, message: 'mail account unavailable' },
      })
    }
    b.fake.remote.listMailInbox = (request) => {
      b.fake.calls.push({ method: 'listMailInbox', request })
      return carried({
        ok: false,
        error: { code: 'network' as const, message: 'mail service unavailable' },
      })
    }

    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByText('Alice')
    fireEvent.click(screen.getByRole('tab', { name: /^邮件/u }))

    expect(await screen.findByText('Cached inbox while offline')).toBeTruthy()
    expect((await screen.findByRole('alert')).textContent).toContain('刷新失败，正在显示本地缓存。')
    expect(screen.queryByText('收件箱里还没有邮件。')).toBeNull()
  })

  it('shows cached sent history immediately and replaces it after revalidation', async () => {
    const cachedSent = {
      ...sentMailSummary,
      id: 'mail-cached-sent' as typeof sentMailSummary.id,
      subject: 'Cached sent history',
    }
    const refreshedSent = {
      ...sentMailSummary,
      id: 'mail-refreshed-sent' as typeof sentMailSummary.id,
      subject: 'Refreshed sent history',
    }
    writeMailListCache(window.localStorage, identity.did, 'sent', {
      items: [cachedSent],
      hasMore: false,
    })
    const b = renderOverlay()
    const listMailInbox = b.fake.remote.listMailInbox
    let releaseSentRefresh = () => {}
    b.fake.remote.listMailInbox = (request) => {
      if (request?.folder !== 'sent') return listMailInbox(request)
      b.fake.calls.push({ method: 'listMailInbox', request })
      return new Promise(resolve => {
        releaseSentRefresh = () => {
          resolve(carried(success({ items: [refreshedSent], hasMore: false })))
        }
      })
    }

    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByText('Alice')
    fireEvent.click(screen.getByRole('tab', { name: /^邮件/u }))
    await screen.findByText('Release status')
    fireEvent.click(within(screen.getByRole('complementary', { name: '邮箱导航' })).getByRole('button', { name: '发件箱' }))

    expect(await screen.findByText('Cached sent history')).toBeTruthy()
    expect((screen.getByRole('button', { name: '刷新发件箱' }) as HTMLButtonElement).disabled).toBe(true)
    releaseSentRefresh()
    expect(await screen.findByText('Refreshed sent history')).toBeTruthy()
    expect(screen.queryByText('Cached sent history')).toBeNull()
    expect(readMailListCache(window.localStorage, identity.did, 'sent')?.items).toEqual([refreshedSent])
  })

  it('restores the last folder cache after the drawer remounts before Mail Account resolves', async () => {
    const b = renderOverlay({
      mailInboxes: { sent: { items: [sentMailSummary], hasMore: false } },
    })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByText('Alice')
    fireEvent.click(screen.getByRole('tab', { name: /^邮件/u }))
    await screen.findByText('Release status')
    fireEvent.click(within(screen.getByRole('complementary', { name: '邮箱导航' })).getByRole('button', { name: '发件箱' }))
    await screen.findByText('Release approval')

    fireEvent.click(screen.getByRole('button', { name: '收起 AWiki' }))
    let releaseAccount = () => {}
    let releaseSentList = () => {}
    b.fake.remote.getMailAccount = () => {
      b.fake.calls.push({ method: 'getMailAccount' })
      return new Promise(resolve => {
        releaseAccount = () => { resolve(carried(success(mailAccount))) }
      })
    }
    b.fake.remote.listMailInbox = (request) => {
      b.fake.calls.push({ method: 'listMailInbox', request })
      return new Promise(resolve => {
        releaseSentList = () => { resolve(carried(success({ items: [sentMailSummary], hasMore: false }))) }
      })
    }

    fireEvent.click(screen.getByRole('button', { name: /^打开 AWiki/u }))
    expect(screen.getByRole('tab', { name: '会话' }).getAttribute('aria-selected')).toBe('true')
    fireEvent.click(screen.getByRole('tab', { name: /^邮件/u }))

    const restoredSentList = screen.getByRole('region', { name: '发件箱' })
    expect(within(restoredSentList).getByText('Release approval')).toBeTruthy()
    expect((within(restoredSentList).getByRole('button', { name: '刷新发件箱' }) as HTMLButtonElement).disabled).toBe(true)
    releaseAccount()
    releaseSentList()
    await waitFor(() => {
      expect((within(restoredSentList).getByRole('button', { name: '刷新发件箱' }) as HTMLButtonElement).disabled).toBe(false)
    })
  })

  it('loads the sent folder on demand and presents recipients as sent-mail history', async () => {
    const b = renderOverlay({
      mailInboxes: { sent: { items: [sentMailSummary], hasMore: false } },
      mailMessages: { 'mail-sent-1': sentMailMessage },
    })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByText('Alice')
    fireEvent.click(screen.getByRole('tab', { name: /^邮件/u }))
    await screen.findByText('Release status')

    const navigation = screen.getByRole('complementary', { name: '邮箱导航' })
    fireEvent.click(within(navigation).getByRole('button', { name: '发件箱' }))
    const sentList = await screen.findByRole('region', { name: '发件箱' })
    expect(within(sentList).getByText('Release approval')).toBeTruthy()
    expect(within(sentList).queryByRole('button', { name: '返回邮箱导航' })).toBeNull()
    expect(b.fake.calls.filter(call => call.method === 'listMailInbox')).toEqual([
      { method: 'listMailInbox', request: { folder: 'inbox', unreadOnly: false, limit: 20, offset: 0 } },
      { method: 'listMailInbox', request: { folder: 'sent', unreadOnly: false, limit: 20, offset: 0 } },
    ])

    fireEvent.click(within(sentList).getByRole('button', { name: /已发送邮件：Release approval，发给 bob@example.com/u }))
    expect(await screen.findByText('Please approve the release.')).toBeTruthy()
    expect(screen.getByText('已发送邮件仅按纯文本显示。')).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'readMail')).toEqual([
      { method: 'readMail', request: { messageId: 'mail-sent-1' } },
    ])
    expect(screen.queryByRole('button', { name: '标为已读' })).toBeNull()
  })

  it('ignores a stale inbox page when the user switches to sent history', async () => {
    const b = renderOverlay({
      mailInboxes: {
        inbox: { items: [mailSummary], nextOffset: 20, hasMore: true },
        sent: { items: [sentMailSummary], hasMore: false },
      },
    })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByText('Alice')
    fireEvent.click(screen.getByRole('tab', { name: /^邮件/u }))
    await screen.findByText('Release status')

    let releasePage = () => {}
    let pageResolved = false
    b.fake.remote.listMailInbox = (request) => {
      b.fake.calls.push({ method: 'listMailInbox', request })
      if (request?.folder === 'inbox' && request.offset === 20) {
        return new Promise(resolve => {
          releasePage = () => {
            resolve(carried(success({
              items: [{ ...mailSummary, id: 'mail-2' as typeof mailSummary.id, subject: 'Late inbox page' }],
              hasMore: false,
            })))
          }
        }).then(value => {
          pageResolved = true
          return value
        })
      }
      return carried(success({ items: request?.folder === 'sent' ? [sentMailSummary] : [mailSummary], hasMore: false }))
    }

    fireEvent.click(screen.getByRole('button', { name: '加载更多邮件' }))
    fireEvent.click(within(screen.getByRole('complementary', { name: '邮箱导航' })).getByRole('button', { name: '发件箱' }))
    const sentList = await screen.findByRole('region', { name: '发件箱' })
    expect(within(sentList).getByText('Release approval')).toBeTruthy()
    releasePage()
    await waitFor(() => {
      expect(pageResolved).toBe(true)
    })
    expect(within(sentList).queryByText('Late inbox page')).toBeNull()
  })

  it('validates, confirms, and sends one plain-text mail exactly once', async () => {
    const b = renderOverlay()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByText('Alice')
    fireEvent.click(screen.getByRole('tab', { name: /^邮件/u }))
    await screen.findByText('Release status')
    expect(screen.queryByRole('button', { name: '刷新邮箱' })).toBeNull()
    expect(screen.getByRole('button', { name: '刷新收件箱' })).toBeTruthy()
    const header = screen.getByTitle('长按拖动 AWiki')
    const mailNavigation = screen.getByRole('complementary', { name: '邮箱导航' })
    const composeMail = within(mailNavigation).getByRole('button', { name: '写邮件' })
    const sentFolder = within(mailNavigation).getByRole('button', { name: '发件箱' })
    expect(within(header).queryByRole('button', { name: '写邮件' })).toBeNull()
    expect(composeMail.parentElement).toBe(sentFolder.parentElement)
    expect(composeMail.textContent).toBe('')
    fireEvent.click(composeMail)
    expect((screen.getByLabelText('收件人') as HTMLTextAreaElement).rows).toBe(1)

    fireEvent.click(screen.getByRole('button', { name: '发送' }))
    expect(await screen.findByText('请至少填写一位收件人。')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('收件人'), { target: { value: 'bob@example.com' } })
    fireEvent.change(screen.getByLabelText('抄送'), { target: { value: 'carol@example.com' } })
    fireEvent.change(screen.getByLabelText('主题'), { target: { value: 'Release approval' } })
    fireEvent.change(screen.getByLabelText('正文'), { target: { value: 'Please approve the release.' } })
    fireEvent.click(screen.getByRole('button', { name: '发送' }))

    expect(screen.getByRole('dialog', { name: '确认发送邮件' })).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'sendMail')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: '确认发送' }))
    expect(await screen.findByText('邮件已发送。')).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'sendMail')).toEqual([{
      method: 'sendMail',
      request: {
        to: ['bob@example.com'],
        cc: ['carol@example.com'],
        subject: 'Release approval',
        bodyText: 'Please approve the release.',
      },
    }])
    await waitFor(() => {
      expect(b.fake.calls.filter(call => call.method === 'listMailInbox').at(-1)).toEqual({
        method: 'listMailInbox',
        request: { folder: 'sent', unreadOnly: false, limit: 20, offset: 0 },
      })
    })
    expect(screen.getByRole('region', { name: '发件箱' })).toBeTruthy()
  })

  it('preserves a mail draft and never retries when delivery is unknown', async () => {
    const b = renderOverlay()
    let sendCalls = 0
    b.fake.remote.sendMail = () => {
      sendCalls += 1
      return carried({
        ok: false,
        error: {
          code: 'delivery-unknown',
          message: 'Mail delivery could not be confirmed. Inspect the mailbox before retrying.',
        },
      })
    }
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByText('Alice')
    fireEvent.click(screen.getByRole('tab', { name: /^邮件/u }))
    await screen.findByText('Release status')
    fireEvent.click(within(screen.getByRole('complementary', { name: '邮箱导航' })).getByRole('button', { name: '写邮件' }))
    fireEvent.change(screen.getByLabelText('收件人'), { target: { value: 'bob@example.com' } })
    fireEvent.change(screen.getByLabelText('主题'), { target: { value: 'Ambiguous delivery' } })
    fireEvent.change(screen.getByLabelText('正文'), { target: { value: 'Send once only.' } })
    fireEvent.click(screen.getByRole('button', { name: '发送' }))
    fireEvent.click(screen.getByRole('button', { name: '确认发送' }))

    expect(await screen.findByText('发送结果未知，请先检查已发送邮件再决定是否重试。')).toBeTruthy()
    expect(sendCalls).toBe(1)
    expect((screen.getByLabelText('正文') as HTMLTextAreaElement).value).toBe('Send once only.')
  })

  it('opens logout from the top-left icon and resumes the same preserved identity', async () => {
    const b = renderOverlay()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByText('Alice')

    fireEvent.click(screen.getByRole('button', { name: 'AWiki 账户菜单' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: '退出登录' }))
    expect(screen.getByRole('dialog', { name: '退出登录' })).toBeTruthy()
    expect(screen.getByText(/身份和本地数据都会保留/)).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'logout')).toHaveLength(0)

    fireEvent.click(screen.getByText('取消', { selector: 'button' }))
    expect(screen.queryByRole('dialog', { name: '退出登录' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'AWiki 账户菜单' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: '退出登录' }))
    fireEvent.click(screen.getByRole('button', { name: '确认退出' }))
    expect(await screen.findByText('已退出 AWiki')).toBeTruthy()
    expect(screen.queryByText('进入 AWiki')).toBeNull()
    expect(b.fake.calls.filter(call => call.method === 'logout')).toEqual([{
      method: 'logout',
      request: { confirmation: 'logout-awiki-session' },
    }])

    fireEvent.click(screen.getByRole('button', { name: '重新进入本机身份' }))
    expect(await screen.findByText('Alice')).toBeTruthy()
    expect(b.controller.getSnapshot()).toMatchObject({
      sessionStatus: 'active',
      identity: { did: identity.did, handle: identity.handle },
    })
    expect(b.fake.calls.filter(call => call.method === 'clearLocalData')).toHaveLength(0)
  })

  it('does not substitute the identity Handle when displayName is missing', async () => {
    const { displayName: _displayName, ...identityWithoutDisplayName } = identity
    void _displayName
    renderOverlay({ identity: identityWithoutDisplayName })

    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    expect(await screen.findByText('未设置昵称')).toBeTruthy()
    expect(screen.getByText('alice')).toBeTruthy()
    expect(screen.queryByText('did:wba:alice')).toBeNull()
  })

  it('edits the complete public profile while preserving the Handle and supports cancel', async () => {
    const b = renderOverlay()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: '编辑个人资料' }))
    expect(screen.getByRole('dialog', { name: '编辑个人资料' })).toBeTruthy()
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: '昵称' })
    expect(input.value).toBe('Alice')
    expect(screen.getAllByText('alice')).toHaveLength(2)

    fireEvent.change(input, { target: { value: '  新昵称  ' } })
    fireEvent.change(screen.getByRole('textbox', { name: '个人简介' }), { target: { value: '  发布协作  ' } })
    fireEvent.change(screen.getByRole('textbox', { name: '新标签' }), { target: { value: 'Harness' } })
    fireEvent.click(screen.getByRole('button', { name: '添加标签' }))
    fireEvent.click(screen.getByRole('button', { name: '保存资料' }))
    expect(await screen.findByText('新昵称')).toBeTruthy()
    expect(b.fake.calls.find(call => call.method === 'updateProfile')?.request).toEqual({ displayName: '新昵称', bio: '发布协作', tags: ['Harness'] })
    expect(screen.getByText('alice')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '编辑个人资料' }))
    fireEvent.change(screen.getByRole('textbox', { name: '昵称' }), { target: { value: '不保存' } })
    fireEvent.click(within(screen.getByRole('dialog', { name: '编辑个人资料' })).getByRole('button', { name: '取消' }))
    expect(screen.getByText('新昵称')).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'updateProfile')).toHaveLength(1)
  })

  it('validates the public profile before calling the Host', async () => {
    const b = renderOverlay()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: '编辑个人资料' }))
    fireEvent.change(screen.getByRole('textbox', { name: '昵称' }), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: '保存资料' }))
    expect(screen.getByRole('alert').textContent).toContain('昵称需要填写')
    expect(b.fake.calls.filter(call => call.method === 'updateProfile')).toHaveLength(0)
  })

  it('shows the latest message with a right-aligned age-sensitive timestamp', async () => {
    const now = new Date(2026, 7, 14, 20, 50).getTime()
    vi.spyOn(Date, 'now').mockReturnValue(now)
    renderOverlay({
      conversations: [
        { ...direct, lastMessageAt: new Date(2026, 7, 14, 20, 49).getTime(), lastMessagePreview: '最新私聊消息' },
        { ...group, lastMessageAt: new Date(2026, 7, 12, 20, 49).getTime(), lastMessagePreview: '较早群消息' },
      ],
    })

    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    const directRow = await screen.findByRole('button', { name: /Bob/ })
    const groupRow = screen.getByRole('button', { name: /Harness Team/ })
    expect(directRow.textContent).toContain('最新私聊消息')
    expect(directRow.textContent).not.toContain('私聊 ·')
    expect(directRow.querySelector('time')?.textContent).toBe('20:49')
    expect(groupRow.textContent).toContain('较早群消息')
    expect(groupRow.querySelector('time')?.textContent).toBe('8/12')
  })

  it('labels a direct chat with the peer displayName instead of the DID', async () => {
    const { senderHandle: _directSenderHandle, ...directMessageWithoutHandle } = message
    void _directSenderHandle
    renderOverlay({
      conversations: [{
        kind: 'direct',
        id: 'c-did' as never,
        peerDid: 'did:wba:awiki.info:user:sample-peer:e1_test' as never,
        title: 'did:wba:awiki.info:user:sample-peer:e1_test',
        displayName: '陈志',
      }],
      history: [{
        ...directMessageWithoutHandle,
        conversationId: 'c-did' as never,
        senderDid: 'did:wba:awiki.info:user:sample-peer:e1_test' as never,
        content: { kind: 'text', text: 'hihi' },
      }],
    })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    const row = await screen.findByRole('button', { name: /陈志/ })
    expect(row.textContent).toContain('暂无消息')
    expect(row.textContent).not.toContain('did:wba:awiki.info:user:sample-peer')
    fireEvent.click(row)
    expect(await screen.findByText('hihi')).toBeTruthy()
    expect(screen.getAllByText('陈志').length).toBeGreaterThan(1)
    expect(screen.queryByText(/did:wba:awiki.info:user:sample-peer/)).toBeNull()
  })

  it('collects Handle and phone before OTP, then completes registration', async () => {
    const b = renderOverlay({ registered: false })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByText('进入 AWiki')
    vi.useFakeTimers()
    fireEvent.change(screen.getByLabelText('Handle'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('手机号'), { target: { value: '13800000000' } })
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }))
    await vi.advanceTimersByTimeAsync(0)
    expect(screen.getByText(/注册验证码已发送/)).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'inspectIdentityAccess')).toHaveLength(0)
    expect(b.fake.calls.find(call => call.method === 'sendRegistrationOtp')?.request).toEqual({ handle: 'alice', phone: '13800000000' })
    expect(b.fake.calls.filter(call => call.method === 'sendRecoveryOtp')).toHaveLength(0)

    const retry = screen.getByRole<HTMLButtonElement>('button', { name: '60 秒后重新获取' })
    expect(retry.disabled).toBe(true)
    await vi.advanceTimersByTimeAsync(59_000)
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '1 秒后重新获取' }).disabled).toBe(true)
    await vi.advanceTimersByTimeAsync(1_000)
    fireEvent.click(screen.getByRole('button', { name: '重新获取注册验证码' }))
    await vi.advanceTimersByTimeAsync(0)
    expect(b.fake.calls.filter(call => call.method === 'sendRegistrationOtp')).toHaveLength(2)
    expect(screen.getByLabelText('注册验证码')).toBeTruthy()

    vi.useRealTimers()
    fireEvent.change(screen.getByLabelText('注册验证码'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: '继续' }))
    expect(await screen.findByText('Alice')).toBeTruthy()
  })

  it('does not inspect Handle existence before sending the unified registration OTP', async () => {
    const b = renderOverlay({ registered: false })
    b.fake.remote.inspectIdentityAccess = (request) => {
      b.fake.calls.push({ method: 'inspectIdentityAccess', request })
      return carried({ ok: false, error: { code: 'network', message: 'untrusted detail' } })
    }
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.change(await screen.findByLabelText('Handle'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('手机号'), { target: { value: '13800000000' } })
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }))

    expect(await screen.findByLabelText('注册验证码')).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'inspectIdentityAccess')).toHaveLength(0)
    expect(b.fake.calls.filter(call => call.method === 'sendRegistrationOtp')).toHaveLength(1)
    expect(b.fake.calls.filter(call => call.method === 'sendRecoveryOtp')).toHaveLength(0)
    expect(screen.getByLabelText('Handle')).toHaveProperty('value', 'alice')
    expect(screen.getByLabelText('手机号')).toHaveProperty('value', '13800000000')
  })

  it('requires explicit destructive confirmation before switching away from a preserved identity', async () => {
    const b = renderOverlay({ sessionStatus: 'signed-out' })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    expect(await screen.findByText('已退出 AWiki')).toBeTruthy()
    expect(screen.getByRole('button', { name: '重新进入本机身份' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '恢复本机原有身份' })).toBeNull()
    expect(screen.queryByRole('button', { name: '无法使用本机身份？' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '使用其他身份' }))
    expect(screen.getByRole('button', { name: '返回本机身份' })).toBeTruthy()
    expect(screen.getByText(/本机私钥、消息、附件索引和身份缓存将永久删除/)).toBeTruthy()
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '清除并使用其他身份' }).disabled).toBe(true)
    expect(b.fake.calls.filter(call => call.method === 'clearLocalData')).toHaveLength(0)

    fireEvent.click(screen.getByRole('checkbox', { name: '我已了解本地数据会被永久清除' }))
    fireEvent.click(screen.getByRole('button', { name: '清除并使用其他身份' }))
    expect(await screen.findByText('进入 AWiki')).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'clearLocalData')).toEqual([{
      method: 'clearLocalData', request: { confirmation: 'clear-awiki-local-data' },
    }])
  })

  it('turns a revoked active identity into a direct phone recovery flow without exposing the raw failure', async () => {
    const b = renderOverlay()
    b.fake.remote.listConversations = (request) => {
      b.fake.calls.push({ method: 'listConversations', request })
      return carried({
        ok: false,
        error: { code: 'identity-recovery-required', message: 'private revoked credential detail' },
      })
    }
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))

    expect(await screen.findByRole('heading', { name: '需要重新恢复身份' })).toBeTruthy()
    expect(screen.getByText(/另一台设备完成了更新恢复/)).toBeTruthy()
    expect(screen.getByText(identity.handle)).toBeTruthy()
    expect(screen.queryByLabelText('完整 Handle')).toBeNull()
    expect(screen.queryByText('在线')).toBeNull()
    expect(document.body.textContent).not.toMatch(/identity-recovery-required|private revoked credential detail/u)

    fireEvent.change(screen.getByLabelText('绑定手机号'), { target: { value: '13800000000' } })
    fireEvent.click(screen.getByRole('button', { name: '获取恢复验证码' }))
    expect(await screen.findByRole('heading', { name: '验证身份归属' })).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'sendRecoveryOtp')).toEqual([{
      method: 'sendRecoveryOtp',
      request: { fullHandle: identity.handle, phone: '13800000000' },
    }])
  })

  it('offers recovery for the preserved identity only after local re-entry fails', async () => {
    const b = renderOverlay({ sessionStatus: 'signed-out' })
    b.fake.remote.login = () => {
      b.fake.calls.push({ method: 'login' })
      return carried({ ok: false, error: { code: 'not-found', message: 'local identity unavailable' } })
    }
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByText('已退出 AWiki')

    expect(screen.queryByRole('button', { name: '恢复本机原有身份' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '重新进入本机身份' }))
    expect(await screen.findByRole('button', { name: '恢复本机原有身份' })).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'login')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: '恢复本机原有身份' }))
    expect(await screen.findByRole('heading', { name: '恢复已有身份' })).toBeTruthy()
    const back = screen.getByRole('button', { name: '返回本机身份' })
    expect(back.querySelector('svg')).toBeTruthy()
    fireEvent.click(back)
    expect(await screen.findByText('已退出 AWiki')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '恢复本机原有身份' })).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('discards a pending phone recovery before returning to the preserved identity', async () => {
    const b = renderOverlay({ sessionStatus: 'signed-out' })
    b.fake.remote.login = () => {
      b.fake.calls.push({ method: 'login' })
      return carried({ ok: false, error: { code: 'not-found', message: 'local identity unavailable' } })
    }
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: '重新进入本机身份' }))
    fireEvent.click(await screen.findByRole('button', { name: '恢复本机原有身份' }))
    fireEvent.change(screen.getByLabelText('完整 Handle'), { target: { value: 'alice.awiki.info' } })
    fireEvent.change(screen.getByLabelText('绑定手机号'), { target: { value: '13800000000' } })
    fireEvent.click(screen.getByRole('button', { name: '获取恢复验证码' }))

    expect(await screen.findByRole('heading', { name: '验证身份归属' })).toBeTruthy()
    expect(window.localStorage.getItem('awiki.handle-recovery.operation.v1')).toBe('recovery-1')
    fireEvent.click(screen.getByRole('button', { name: '取消恢复' }))

    expect(await screen.findByText('已退出 AWiki')).toBeTruthy()
    expect(window.localStorage.getItem('awiki.handle-recovery.operation.v1')).toBeNull()
    expect(b.fake.calls.filter(call => call.method === 'discardRecovery')).toEqual([{
      method: 'discardRecovery', request: { operationId: 'recovery-1' },
    }])
    expect(screen.queryByRole('button', { name: '恢复本机原有身份' })).toBeNull()
  })

  it('offers Device Join first and sends a fresh purpose-correct OTP only after explicit Recovery', async () => {
    const b = renderOverlay({
      registered: false,
      config: { pollIntervalMs: 1_000, attachmentMaxBytes: 1_024, handleRecoveryPhoneEnabled: true },
      registrationOutcome: {
        status: 'join-required', fullHandle: 'alice.awiki.info' as never,
        mode: 'ordinary', requiresUserPresence: false,
      },
    })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.change(await screen.findByLabelText('Handle'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('手机号'), { target: { value: '13800000000' } })
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }))
    fireEvent.change(await screen.findByLabelText('注册验证码'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: '继续' }))

    expect(await screen.findByRole('button', { name: '加入新设备（推荐）' })).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'sendRegistrationOtp')).toHaveLength(1)
    expect(b.fake.calls.filter(call => call.method === 'sendRecoveryOtp')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: '恢复 Handle（会替换 DID）' }))
    expect(await screen.findByRole('heading', { name: '验证身份归属' })).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'sendRecoveryOtp')).toEqual([{
      method: 'sendRecoveryOtp', request: { fullHandle: 'alice.awiki.info', phone: '13800000000' },
    }])

    fireEvent.change(screen.getByLabelText('恢复验证码'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: '验证恢复信息' }))
    expect(await screen.findByRole('heading', { name: '确认恢复已有身份' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '确认并恢复身份' }))
    expect(await screen.findByText('Alice', {}, { timeout: 2_000 })).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'prepareRecovery')).toHaveLength(1)
    expect(b.fake.calls.filter(call => call.method === 'activateRecovery')).toHaveLength(1)
    expect(b.fake.calls.filter(call => call.method === 'registerIdentity')).toHaveLength(1)
    expect(JSON.stringify(b.controller.getSnapshot())).not.toMatch(/13800000000|123456|continuation|joinSession/u)
    expect(JSON.stringify(window.localStorage)).not.toMatch(/13800000000|123456|continuation|joinSession/u)
  })

  it('loads history, sends text, and reads one selected attachment', async () => {
    const b = renderOverlay()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))
    expect(await screen.findByText('你好')).toBeTruthy()
    const composer = screen.getByPlaceholderText('输入消息').parentElement
    expect(composer?.contains(screen.getByRole('button', { name: '添加附件' }))).toBe(true)
    expect(composer?.contains(screen.getByRole('button', { name: '发送消息' }))).toBe(true)
    fireEvent.change(screen.getByPlaceholderText('输入消息'), { target: { value: '收到' } })
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))
    await waitFor(() => { expect(b.fake.calls.some(call => call.method === 'sendText')).toBe(true) })
    expect(await screen.findByText('收到')).toBeTruthy()

    const picker = screen.getByLabelText('选择一个附件')
    const clickPicker = vi.spyOn(picker, 'click')
    fireEvent.click(screen.getByRole('button', { name: '添加附件' }))
    expect(clickPicker).toHaveBeenCalledOnce()
    const file = new File(['abc'], 'a.txt', { type: 'text/plain' })
    fireEvent.change(picker, { target: { files: [file] } })
    expect(await screen.findByText('a.txt')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '发送附件' })).toBeNull()
    fireEvent.change(screen.getByPlaceholderText('输入消息'), { target: { value: '附件说明' } })
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))
    await waitFor(() => {
      expect(b.fake.calls.find(call => call.method === 'sendAttachment')?.request).toMatchObject({
        fileName: 'a.txt',
        caption: '附件说明',
      })
    })
    expect(screen.queryByRole('button', { name: '移除附件 a.txt' })).toBeNull()
    expect(screen.getByPlaceholderText('输入消息')).toHaveProperty('value', '')

    const untyped = new File(['abc'], 'unknown.bin')
    fireEvent.change(picker, { target: { files: [untyped] } })
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))
    await waitFor(() => {
      const request = b.fake.calls.filter(call => call.method === 'sendAttachment').at(-1)?.request
      expect(request).toMatchObject({
        mimeType: 'application/octet-stream',
      })
      expect(request).not.toHaveProperty('caption')
    })
  })

  it('sends with Enter, keeps Shift+Enter for a newline, and ignores IME composition', async () => {
    const b = renderOverlay()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))
    const composer = await screen.findByPlaceholderText<HTMLTextAreaElement>('输入消息')

    fireEvent.change(composer, { target: { value: 'Enter 发送' } })
    fireEvent.keyDown(composer, { key: 'Enter' })
    await waitFor(() => {
      expect(b.fake.calls.filter(call => call.method === 'sendText').at(-1)?.request).toMatchObject({ text: 'Enter 发送' })
    })
    expect(composer.value).toBe('')

    fireEvent.change(composer, { target: { value: '保留换行' } })
    fireEvent.keyDown(composer, { key: 'Enter', shiftKey: true })
    expect(b.fake.calls.filter(call => call.method === 'sendText')).toHaveLength(1)
    expect(composer.value).toBe('保留换行')

    fireEvent.keyDown(composer, { key: 'Enter', isComposing: true })
    expect(b.fake.calls.filter(call => call.method === 'sendText')).toHaveLength(1)
    expect(composer.value).toBe('保留换行')
  })

  it('renders an accessible optimistic bubble with a loading icon until text delivery settles', async () => {
    const b = renderOverlay()
    let settle!: () => void
    b.fake.remote.sendText = request => {
      b.fake.calls.push({ method: 'sendText', request })
      return new Promise(resolve => {
        settle = () => {
          resolve({
            ok: true,
            value: success({
              ...message,
              id: 'optimistic-text' as never,
              outgoing: true,
              content: { kind: 'text', text: request.text },
            }),
          })
        }
      })
    }

    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))
    const composer = await screen.findByPlaceholderText<HTMLTextAreaElement>('输入消息')
    fireEvent.change(composer, { target: { value: '先显示气泡' } })
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))

    const pending = await screen.findByRole('status', { name: '消息发送中' })
    expect(pending.textContent).toContain('先显示气泡')
    expect(pending.querySelector('svg')).toBeTruthy()
    expect(screen.queryByText('发送消息…')).toBeNull()
    expect(composer.value).toBe('')

    settle()
    await waitFor(() => { expect(screen.queryByRole('status', { name: '消息发送中' })).toBeNull() })
    expect(await screen.findByText('先显示气泡')).toBeTruthy()
  })

  it('reconciles a locally committed send by exact message id while the send request is still pending', async () => {
    const b = renderOverlay({ history: [], localHistory: [] })
    let committed: AwikiMessage | undefined
    let resolveHistory!: (value: Awaited<ReturnType<typeof b.fake.remote.getHistory>>) => void
    let resolveSend!: (value: Awaited<ReturnType<typeof b.fake.remote.sendText>>) => void
    const remoteHistory = new Promise<Awaited<ReturnType<typeof b.fake.remote.getHistory>>>(resolve => {
      resolveHistory = resolve
    })
    const pendingSend = new Promise<Awaited<ReturnType<typeof b.fake.remote.sendText>>>(resolve => {
      resolveSend = resolve
    })
    let localReads = 0
    b.fake.remote.getHistory = request => {
      b.fake.calls.push({ method: 'getHistory', request })
      return remoteHistory
    }
    b.fake.remote.getLocalHistory = request => {
      b.fake.calls.push({ method: 'getLocalHistory', request })
      localReads += 1
      return carried(success({ items: localReads === 1 || committed === undefined ? [] : [committed], hasMore: false }))
    }
    b.fake.remote.sendText = request => {
      b.fake.calls.push({ method: 'sendText', request })
      return pendingSend
    }

    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))
    const composer = await screen.findByPlaceholderText<HTMLTextAreaElement>('输入消息')
    fireEvent.change(composer, { target: { value: '只显示一次' } })
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))

    await screen.findByRole('status', { name: '消息发送中' })
    const request = b.fake.calls.find(call => call.method === 'sendText')?.request as { idempotencyKey: string }
    expect(request.idempotencyKey).toMatch(/^msg-/)
    committed = {
      ...message,
      id: request.idempotencyKey as never,
      outgoing: true,
      content: { kind: 'text', text: '只显示一次' },
    }
    resolveHistory({ ok: true, value: success({ items: [committed], hasMore: false }) })

    await waitFor(() => {
      expect(screen.getAllByText('只显示一次')).toHaveLength(1)
      expect(screen.queryByRole('status', { name: '消息发送中' })).toBeNull()
    })

    resolveSend({ ok: true, value: success(committed) })
    await waitFor(() => { expect(b.controller.getSnapshot().pending).toBeNull() })
    expect(screen.getAllByText('只显示一次')).toHaveLength(1)
  })

  it('restores a failed attachment draft after showing only its safe metadata in the optimistic bubble', async () => {
    const b = renderOverlay()
    let fail!: () => void
    b.fake.remote.sendAttachment = request => {
      b.fake.calls.push({ method: 'sendAttachment', request })
      return new Promise(resolve => {
        fail = () => { resolve({ ok: true, value: { ok: false, error: { code: 'network', message: '发送失败' } } }) }
      })
    }

    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))
    const composer = await screen.findByPlaceholderText<HTMLTextAreaElement>('输入消息')
    const picker = screen.getByLabelText('选择一个附件')
    fireEvent.change(picker, { target: { files: [new File(['abc'], 'pending.txt', { type: 'text/plain' })] } })
    fireEvent.change(composer, { target: { value: '附件说明' } })
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))

    const pending = await screen.findByRole('status', { name: '消息发送中' })
    expect(pending.textContent).toContain('pending.txt')
    expect(pending.textContent).toContain('3 字节')
    expect(pending.textContent).toContain('附件说明')
    expect(pending.textContent).not.toContain('YWJj')
    expect(screen.queryByText('发送附件…')).toBeNull()

    fail()
    expect(await screen.findByText('network：发送失败')).toBeTruthy()
    expect(await screen.findByText('pending.txt')).toBeTruthy()
    expect(composer.value).toBe('附件说明')
    expect(screen.queryByRole('status', { name: '消息发送中' })).toBeNull()
  })

  it('runs the full user-triggered summary flow, caches it, copies it, and scrolls to source', async () => {
    let resolveSummary!: (value: Awaited<ReturnType<ReturnType<typeof fakeRemote>['remote']['summarizeConversation']>>) => void
    const clipboard = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: clipboard } })
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })
    const b = renderOverlay({ conversations: [{ ...direct, unreadCount: 2 }], summary: {
      ...summary,
      range: { ...summary.range, kind: 'unread', messageCount: 1 },
    } })
    b.fake.remote.summarizeConversation = request => new Promise((resolve) => {
      b.fake.calls.push({ method: 'summarizeConversation', request })
      resolveSummary = resolve
    })

    fireEvent.click(screen.getByRole('button', { name: /打开 AWiki/ }))
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))
    await screen.findByText('你好')
    expect(b.fake.calls.filter(call => call.method === 'summarizeConversation')).toHaveLength(0)

    const trigger = screen.getByRole('button', { name: '生成 AI 总结' })
    expect(trigger.getAttribute('aria-controls')).toBeTruthy()
    fireEvent.click(trigger)
    expect(await screen.findByText('正在整理这段对话…')).toBeTruthy()
    expect(b.fake.calls.at(-1)?.request).toEqual({ conversationId: direct.id, unreadCountAtOpen: 2 })

    resolveSummary({ ok: true, value: success({
      ...summary,
      range: { ...summary.range, kind: 'unread', messageCount: 1 },
    }) })
    expect(await screen.findByRole('region', { name: 'AI 对话总结' })).toBeTruthy()
    expect(screen.getByText('重点')).toBeTruthy()
    expect(screen.getByText('结论')).toBeTruthy()
    expect(screen.getByText('待办')).toBeTruthy()
    expect(screen.getByText(/未读以来 · 1 条消息/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '复制' }))
    await waitFor(() => { expect(clipboard).toHaveBeenCalledOnce() })
    expect(clipboard.mock.calls[0]?.[0]).toContain('AI 对话总结\n范围：未读以来 · 1 条消息')
    expect(clipboard.mock.calls[0]?.[0]).toContain('Alice：整理后续材料')
    expect(await screen.findByRole('button', { name: '已复制' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '折叠 AI 对话总结' }))
    expect(screen.getByRole('button', { name: '展开 AI 对话总结' }).getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: '展开 AI 对话总结' }))
    fireEvent.click(screen.getByRole('button', { name: '查看原消息' }))
    await waitFor(() => { expect(scrollIntoView).toHaveBeenCalledOnce() })
    expect(screen.getByRole('button', { name: '展开 AI 对话总结' })).toBeTruthy()
    expect(document.activeElement?.getAttribute('data-message-id')).toBe(message.id)

    fireEvent.click(screen.getByRole('button', { name: '展开 AI 对话总结' }))
    b.fake.remote.summarizeConversation = request => {
      b.fake.calls.push({ method: 'summarizeConversation', request })
      return carried(success(summary))
    }
    fireEvent.click(screen.getByRole('button', { name: '重新生成 AI 总结' }))
    await waitFor(() => {
      expect(b.fake.calls.filter(call => call.method === 'summarizeConversation')).toHaveLength(2)
    })
  })

  it('marks a generated summary stale after a new message and renders a retryable error', async () => {
    const b = renderOverlay()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))
    fireEvent.click(screen.getByRole('button', { name: '生成 AI 总结' }))
    expect(await screen.findByText('确认了本次沟通重点')).toBeTruthy()

    b.fake.remote.sendText = request => carried(success({
      ...message,
      id: 'new-summary-message' as never,
      sentAt: summary.range.endedAt + 1,
      outgoing: true,
      content: { kind: 'text', text: request.text },
    }))
    fireEvent.change(screen.getByPlaceholderText('输入消息'), { target: { value: '新消息' } })
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))
    expect(await screen.findByText('有新消息，当前总结已过期')).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'summarizeConversation')).toHaveLength(1)

    b.fake.remote.summarizeConversation = () => carried({
      ok: false,
      error: { code: 'summary-timeout', message: 'private timeout detail' },
    })
    fireEvent.click(screen.getByRole('button', { name: '根据新消息重新生成 AI 总结' }))
    expect((await screen.findByRole('alert')).textContent).toContain('AI 总结超时，请稍后重新生成。')
    expect(screen.getByRole('button', { name: '重新生成 AI 总结' })).toBeTruthy()
  })

  it('scrolls a selected conversation to its newest rendered message', async () => {
    const scrollHeight = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(640)
    const b = renderOverlay({ history: [message] })
    const getLocalHistory = b.fake.remote.getLocalHistory
    let firstLocalRead = true
    let releaseLocalHistory!: () => void
    b.fake.remote.getLocalHistory = request => firstLocalRead
      ? new Promise((resolve) => {
          firstLocalRead = false
          releaseLocalHistory = () => { void getLocalHistory(request).then(resolve) }
        })
      : getLocalHistory(request)
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))

    const history = await screen.findByRole('log', { name: '消息记录' })
    const loading = screen.getByRole('status', { name: '正在读取本地消息' })
    expect(history.contains(loading)).toBe(true)
    expect(screen.queryByText('加载消息…')).toBeNull()
    expect(history.scrollTop).toBe(0)
    releaseLocalHistory()
    expect(await screen.findByText('你好')).toBeTruthy()
    await waitFor(() => { expect(history.scrollTop).toBe(640) })
    expect(screen.queryByRole('status', { name: '正在读取本地消息' })).toBeNull()
    expect(scrollHeight).toHaveBeenCalled()
  })

  it('keeps background refresh visually silent after local messages are visible', async () => {
    const b = renderOverlay({ localHistory: [message] })
    b.fake.remote.getHistory = request => {
      b.fake.calls.push({ method: 'getHistory', request })
      return new Promise(() => undefined)
    }
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))

    expect(await screen.findByText('你好')).toBeTruthy()
    expect(b.controller.getSnapshot().refreshing).toBe(true)
    expect(screen.queryByText('正在刷新')).toBeNull()
    b.controller.close()
  })

  it('offers a latest-message arrow while scrolled away even before new messages arrive', async () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(900)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300)
    renderOverlay({ history: [message] })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))
    const history = await screen.findByRole('log', { name: '消息记录' })
    await waitFor(() => { expect(history.scrollTop).toBe(900) })

    history.scrollTop = 180
    fireEvent.scroll(history)
    const latest = screen.getByRole('button', { name: '下滑到最新消息' })
    expect(latest.textContent).not.toContain('新消息')
    fireEvent.click(latest)
    expect(history.scrollTop).toBe(900)
    expect(screen.queryByRole('button', { name: '下滑到最新消息' })).toBeNull()
  })

  it('counts polled messages without forcing a scrolled-up reader down and clears the tag on click', async () => {
    vi.useFakeTimers()
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(900)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300)
    const b = renderOverlay({ config: { pollIntervalMs: 1000, attachmentMaxBytes: 1024 }, history: [message] })
    const second: AwikiMessage = {
      ...message,
      id: 'm2' as never,
      sentAt: 11,
      content: { kind: 'text', text: '第二条新消息' },
    }
    const third: AwikiMessage = {
      ...message,
      id: 'm3' as never,
      sentAt: 12,
      content: { kind: 'text', text: '第三条新消息' },
    }
    let historyCalls = 0
    b.fake.remote.getHistory = request => {
      b.fake.calls.push({ method: 'getHistory', request })
      historyCalls += 1
      return carried(success({
        items: historyCalls === 1 ? [message] : [message, second, third],
        hasMore: false,
      }))
    }

    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await vi.advanceTimersByTimeAsync(0)
    fireEvent.click(screen.getByRole('button', { name: /Bob/ }))
    await vi.advanceTimersByTimeAsync(0)
    const history = screen.getByRole('log', { name: '消息记录' })
    expect(history.scrollTop).toBe(900)
    history.scrollTop = 150
    fireEvent.scroll(history)

    await vi.advanceTimersByTimeAsync(1000)
    expect(screen.getByText('第二条新消息')).toBeTruthy()
    expect(screen.getByText('第三条新消息')).toBeTruthy()
    expect(history.scrollTop).toBe(150)
    const latest = screen.getByRole('button', { name: '有 2 条新消息，下滑到最新消息' })
    expect(latest.textContent).toContain('新消息（2）')
    fireEvent.click(latest)
    expect(history.scrollTop).toBe(900)
    expect(screen.queryByRole('button', { name: /新消息/ })).toBeNull()
  })

  it('keeps new messages unread while scrolled up and marks them read only after reaching the bottom', async () => {
    vi.useFakeTimers()
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(900)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300)
    const b = renderOverlay({ config: { pollIntervalMs: 1000, attachmentMaxBytes: 1024 }, history: [message] })
    const incoming: AwikiMessage = {
      ...message,
      id: 'm-unread-at-bottom' as never,
      sentAt: 12,
      content: { kind: 'text', text: '到达底部后才已读' },
    }
    let listCalls = 0
    b.fake.remote.listConversations = (request) => {
      b.fake.calls.push({ method: 'listConversations', request })
      listCalls += 1
      return carried(success({
        items: [{ ...direct, unreadCount: listCalls === 1 ? 0 : 1, lastMessageAt: listCalls === 1 ? 10 : 12 }],
        hasMore: false,
      }))
    }
    let historyCalls = 0
    b.fake.remote.getHistory = (request) => {
      b.fake.calls.push({ method: 'getHistory', request })
      historyCalls += 1
      return carried(success({
        items: historyCalls === 1 ? [message] : [message, incoming],
        hasMore: false,
      }))
    }

    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await vi.advanceTimersByTimeAsync(0)
    fireEvent.click(screen.getByRole('button', { name: /Bob/ }))
    await vi.advanceTimersByTimeAsync(0)
    const history = screen.getByRole('log', { name: '消息记录' })
    history.scrollTop = 150
    fireEvent.scroll(history)

    await vi.advanceTimersByTimeAsync(1000)
    expect(screen.getByText('到达底部后才已读')).toBeTruthy()
    expect(history.scrollTop).toBe(150)
    expect(screen.getByRole('button', { name: 'Bob，1 条未读消息' })).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'markConversationRead')).toHaveLength(0)

    history.scrollTop = 600
    fireEvent.scroll(history)
    await vi.advanceTimersByTimeAsync(0)
    expect(b.fake.calls.filter(call => call.method === 'markConversationRead')).toHaveLength(1)
    expect(b.controller.getSnapshot().conversations[0]?.unreadCount).toBe(0)
    expect(screen.queryByRole('button', { name: 'Bob，1 条未读消息' })).toBeNull()
  })

  it('waits for the roster latest message to render before marking a bottom-pinned conversation read', async () => {
    vi.useFakeTimers()
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(900)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300)
    const b = renderOverlay({ config: { pollIntervalMs: 1000, attachmentMaxBytes: 1024 }, history: [message] })
    const incoming: AwikiMessage = {
      ...message,
      id: 'm-render-before-read' as never,
      sentAt: 12,
      content: { kind: 'text', text: '先渲染再已读' },
    }
    let listCalls = 0
    b.fake.remote.listConversations = (request) => {
      b.fake.calls.push({ method: 'listConversations', request })
      listCalls += 1
      return carried(success({
        items: [{ ...direct, unreadCount: listCalls === 1 ? 0 : 1, lastMessageAt: listCalls === 1 ? 10 : 12 }],
        hasMore: false,
      }))
    }
    let historyCalls = 0
    b.fake.remote.getHistory = (request) => {
      b.fake.calls.push({ method: 'getHistory', request })
      historyCalls += 1
      return carried(success({ items: historyCalls === 1 ? [message] : [message, incoming], hasMore: false }))
    }

    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await vi.advanceTimersByTimeAsync(0)
    fireEvent.click(screen.getByRole('button', { name: /Bob/ }))
    await vi.advanceTimersByTimeAsync(0)
    expect(b.fake.calls.filter(call => call.method === 'markConversationRead')).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(1000)
    expect(screen.getByText('先渲染再已读')).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'markConversationRead')).toHaveLength(1)
    expect(b.controller.getSnapshot().conversations[0]?.unreadCount).toBe(0)
  })

  it('does not count an older history page as newly arrived messages', async () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(900)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300)
    const older: AwikiMessage = {
      ...message,
      id: 'm-older' as never,
      sentAt: 9,
      content: { kind: 'text', text: '更早的消息' },
    }
    const b = renderOverlay({ history: [message], historyHasMore: true, historyCursor: 'older-history' as never })
    b.fake.remote.getHistory = request => {
      b.fake.calls.push({ method: 'getHistory', request })
      return carried(success(request.cursor === undefined
        ? { items: [message], hasMore: true, nextCursor: 'older-history' as never }
        : { items: [older], hasMore: false }))
    }

    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))
    const history = await screen.findByRole('log', { name: '消息记录' })
    await waitFor(() => { expect(history.scrollTop).toBe(900) })
    history.scrollTop = 140
    fireEvent.scroll(history)
    expect(screen.getByRole('button', { name: '下滑到最新消息' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '加载更早消息' }))
    expect(await screen.findByText('更早的消息')).toBeTruthy()
    expect(screen.getByRole('button', { name: '下滑到最新消息' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /有 \d+ 条新消息/ })).toBeNull()
  })

  it('restores the last open conversation after collapse but respects an explicit return to the roster', async () => {
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(640)
    const b = renderOverlay({ history: [message] })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))
    expect(await screen.findByText('你好')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '关闭 AWiki' }))
    await waitFor(() => { expect(b.controller.getSnapshot().selectedConversationId).toBeNull() })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    expect(await screen.findByText('你好')).toBeTruthy()
    await waitFor(() => {
      expect(b.controller.getSnapshot().selectedConversationId).toBe(direct.id)
      expect(b.fake.calls.filter(call => call.method === 'getHistory')).toHaveLength(2)
      expect(screen.getByRole('log', { name: '消息记录' }).scrollTop).toBe(640)
    })

    fireEvent.click(screen.getByRole('button', { name: '返回会话列表' }))
    expect(await screen.findByText('选择一个私聊或群聊查看消息。')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '关闭 AWiki' }))
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    expect(await screen.findByText('选择一个私聊或群聊查看消息。')).toBeTruthy()
    expect(b.controller.getSnapshot().selectedConversationId).toBeNull()
  })

  it('shows an image thumbnail and clears the selected attachment from its corner action', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:awiki-preview')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    renderOverlay()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))
    const picker = screen.getByLabelText('选择一个附件')
    const image = new File(['png'], 'preview.png', { type: 'image/png' })
    fireEvent.change(picker, { target: { files: [image] } })

    expect(await screen.findByRole('img', { name: 'preview.png' })).toHaveProperty('src', 'blob:awiki-preview')
    expect(createObjectURL).toHaveBeenCalledWith(image)
    fireEvent.click(screen.getByRole('button', { name: '移除附件 preview.png' }))
    expect(screen.queryByRole('img', { name: 'preview.png' })).toBeNull()
    await waitFor(() => { expect(revokeObjectURL).toHaveBeenCalledWith('blob:awiki-preview') })
  })

  it('rejects an oversized attachment before reading or calling the Host', async () => {
    const b = renderOverlay({ config: { pollIntervalMs: 1000, attachmentMaxBytes: 2 } })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))
    const file = new File(['abc'], 'too-large.txt', { type: 'text/plain' })
    const arrayBuffer = vi.fn()
    Object.defineProperty(file, 'arrayBuffer', { value: arrayBuffer })
    fireEvent.change(screen.getByLabelText('选择一个附件'), { target: { files: [file] } })
    await screen.findByText('too-large.txt')
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))

    expect(await screen.findByRole('alert')).toHaveProperty('textContent', '附件不能超过 2 字节。')
    expect(arrayBuffer).not.toHaveBeenCalled()
    expect(b.fake.calls.some(call => call.method === 'sendAttachment')).toBe(false)
  })

  it('downloads an attachment with its containing message identity', async () => {
    const b = renderOverlay({ history: [attachmentMessage] })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))
    fireEvent.click(await screen.findByRole('button', { name: /a.txt/ }))
    await waitFor(() => {
      expect(b.fake.calls.find(call => call.method === 'downloadAttachment')?.request).toEqual({
        messageId: attachmentMessage.id,
        attachmentId: attachmentMessage.content.kind === 'attachment'
          ? attachmentMessage.content.attachment.id
          : undefined,
      })
    })
  })

  it('previews a verified image attachment inline and reuses its bytes for download', async () => {
    if (attachmentMessage.content.kind !== 'attachment') throw new Error('attachment fixture must carry an attachment')
    const imageAttachment = {
      ...attachmentMessage.content.attachment,
      fileName: 'preview.png',
      mimeType: 'image/png',
    }
    const imageMessage: AwikiMessage = {
      ...attachmentMessage,
      content: {
        kind: 'attachment',
        attachment: imageAttachment,
        caption: '图片说明',
      },
    }
    const value = {
      attachment: imageAttachment,
      bytesBase64: 'iVBORw0KGgo=',
    }
    const response = { ok: true as const, value: { ok: true as const, value } }
    let resolvePreview!: (result: typeof response) => void
    const previewRequest = new Promise<typeof response>((resolve) => { resolvePreview = resolve })
    const downloadAttachment = vi.fn(() => previewRequest)
    let renderedHeight = 200
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(() => renderedHeight)
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:message-preview')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const b = renderOverlay({ history: [imageMessage] })
    b.fake.remote.downloadAttachment = downloadAttachment
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))

    expect(await screen.findByText('正在加载图片预览…')).toBeTruthy()
    resolvePreview(response)
    const preview = await screen.findByRole('img', { name: 'preview.png' })
    expect(preview).toHaveProperty('src', 'blob:message-preview')
    renderedHeight = 900
    fireEvent.load(preview)
    expect(screen.getByRole('log', { name: '消息记录' }).scrollTop).toBe(900)
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(screen.getByText('图片说明')).toBeTruthy()
    expect(downloadAttachment).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: '下载图片 preview.png' }))
    expect(downloadAttachment).toHaveBeenCalledOnce()
    expect(vi.mocked(saveDownloadedAttachment)).toHaveBeenCalledWith(value)

    b.instance.actions.close()
    await waitFor(() => { expect(revokeObjectURL).toHaveBeenCalledWith('blob:message-preview') })

    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))
    expect(await screen.findByRole('img', { name: 'preview.png' })).toBeTruthy()
    expect(downloadAttachment).toHaveBeenCalledOnce()
    expect(createObjectURL).toHaveBeenCalledTimes(2)
  })

  it('keeps the file card and reports an image preview failure', async () => {
    if (attachmentMessage.content.kind !== 'attachment') throw new Error('attachment fixture must carry an attachment')
    const imageMessage: AwikiMessage = {
      ...attachmentMessage,
      content: {
        kind: 'attachment',
        attachment: { ...attachmentMessage.content.attachment, fileName: 'broken.png', mimeType: 'image/png' },
      },
    }
    const b = renderOverlay({ history: [imageMessage] })
    b.fake.remote.downloadAttachment = () => Promise.resolve({
      ok: true,
      value: { ok: false, error: { code: 'forbidden', message: '不能预览' } },
    })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))

    expect(await screen.findByText('forbidden：不能预览')).toBeTruthy()
    expect(screen.getByRole('button', { name: /broken.png/ })).toBeTruthy()
    expect(screen.queryByRole('img', { name: 'broken.png' })).toBeNull()
  })

  it('shows attachment captions, DID fallback, outgoing state, and download failures', async () => {
    if (attachmentMessage.content.kind !== 'attachment') throw new Error('attachment fixture must carry an attachment')
    const captioned: AwikiMessage = {
      ...attachmentMessage,
      content: { ...attachmentMessage.content, caption: '附件说明' },
    }
    delete (captioned as { senderHandle?: unknown }).senderHandle
    const outgoing: AwikiMessage = {
      ...attachmentMessage,
      id: 'outgoing-file' as never,
      outgoing: true,
      content: {
        kind: 'attachment',
        attachment: { ...attachmentMessage.content.attachment, id: 'a2' as never, fileName: 'b.txt' },
      },
    }
    const b = renderOverlay({ history: [captioned, outgoing] })
    b.fake.remote.downloadAttachment = () => Promise.resolve({
      ok: true,
      value: { ok: false, error: { code: 'forbidden', message: '不能下载' } },
    })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))
    expect(await screen.findByText('附件说明')).toBeTruthy()
    expect(screen.getAllByText('Bob').length).toBeGreaterThan(1)
    expect(screen.queryByText('did:wba:bob')).toBeNull()
    expect(screen.getByText('我')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /a.txt/ }))
    expect(await screen.findByText('forbidden：不能下载')).toBeTruthy()
  })

  it('renders group/empty navigation and invokes both pagination controls', async () => {
    const { senderHandle: _groupSenderHandle, ...groupMessageWithoutHandle } = message
    void _groupSenderHandle
    const noActivity = { ...direct }
    delete (noActivity as { lastMessageAt?: unknown }).lastMessageAt
    const b = renderOverlay({
      conversations: [noActivity, group],
      conversationsHasMore: true,
      conversationsCursor: 'more-conversations' as never,
      history: [
        {
          ...message,
          conversationId: group.id,
          conversationKind: 'group',
          senderDisplayName: '陈志',
          content: { kind: 'text', text: '群消息' },
        },
        {
          ...groupMessageWithoutHandle,
          id: 'm-group-did' as never,
          conversationId: group.id,
          conversationKind: 'group',
          senderDid: 'did:wba:group-peer' as never,
          content: { kind: 'text', text: '匿名' },
        },
      ],
      historyHasMore: true,
      historyCursor: 'older-history' as never,
    })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: '加载更多会话' }))
    await waitFor(() => {
      expect(b.fake.calls.filter(call => call.method === 'listConversations')).toHaveLength(2)
    })
    fireEvent.click(screen.getByRole('button', { name: /Harness Team/ }))
    expect((await screen.findAllByText('群聊')).length).toBeGreaterThan(0)
    expect((await screen.findAllByText('群消息')).length).toBeGreaterThan(1)
    expect(screen.getByText('陈志')).toBeTruthy()
    expect(screen.queryByText('bob')).toBeNull()
    expect(screen.getByText('did:wba:group-peer')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '加载更早消息' }))
    await waitFor(() => {
      expect(b.fake.calls.filter(call => call.method === 'getHistory')).toHaveLength(2)
    })
    fireEvent.click(screen.getByRole('button', { name: '返回会话列表' }))
    expect(await screen.findByText('选择一个私聊或群聊查看消息。')).toBeTruthy()

    b.instance.actions.close()
    const empty = renderOverlay({ conversations: [] })
    fireEvent.click(screen.getAllByRole('button', { name: '打开 AWiki' }).at(-1)!)
    expect(await screen.findByText('还没有可用的私聊或群聊。')).toBeTruthy()
    empty.instance.actions.close()
  })

  it('keeps registration and composer drafts after business failures', async () => {
    const registration = renderOverlay({ registered: false })
    registration.fake.remote.sendRegistrationOtp = () => Promise.resolve({
      ok: true,
      value: { ok: false, error: { code: 'rate-limited', message: '稍后重试' } },
    })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.change(await screen.findByLabelText('Handle'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('手机号'), { target: { value: '13800000000' } })
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }))
    expect(await screen.findByText('验证码发送过于频繁，请等待限流解除后再重新获取。')).toBeTruthy()
    expect(screen.queryByLabelText('验证码')).toBeNull()
    registration.fake.remote.sendRegistrationOtp = () => Promise.resolve({
      ok: true,
      value: { ok: true, value: { retryAfterSeconds: 60, retryAt: new Date(Date.now() + 60_000).toISOString() } },
    })
    registration.fake.remote.registerIdentity = () => Promise.resolve({
      ok: true,
      value: { ok: false, error: { code: 'conflict', message: 'untrusted remote text' } },
    })
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }))
    fireEvent.change(await screen.findByLabelText('注册验证码'), { target: { value: '000000' } })
    fireEvent.click(screen.getByRole('button', { name: '继续' }))
    expect(await screen.findByText('注册冲突：服务端可能已收到上次注册请求，或该手机号 / Handle 已绑定其他身份。请保留当前页面并再次提交；若仍失败，请勿清除本机身份数据，联系管理员并提供失败时间。')).toBeTruthy()
    expect(screen.getByLabelText('Handle')).toHaveProperty('value', 'alice')
    expect(screen.getByLabelText('手机号')).toHaveProperty('value', '13800000000')
    expect(screen.getByLabelText('注册验证码')).toHaveProperty('value', '000000')
    registration.instance.actions.close()

    const chat = renderOverlay()
    chat.fake.remote.sendText = () => Promise.resolve({
      ok: true,
      value: { ok: false, error: { code: 'network', message: '发送失败' } },
    })
    chat.fake.remote.sendAttachment = () => Promise.resolve({
      ok: true,
      value: { ok: false, error: { code: 'network', message: '附件失败' } },
    })
    fireEvent.click(screen.getAllByRole('button', { name: '打开 AWiki' }).at(-1)!)
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))
    await screen.findByText('你好')
    const composer = screen.getByPlaceholderText('输入消息')
    fireEvent.change(composer, { target: { value: '保留' } })
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))
    expect(await screen.findByText('network：发送失败')).toBeTruthy()
    expect((composer as HTMLTextAreaElement).value).toBe('保留')
    const picker = screen.getByLabelText('选择一个附件')
    fireEvent.change(picker, { target: { files: [new File(['x'], 'failed.txt')] } })
    await screen.findByText('failed.txt')
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))
    expect(await screen.findByText('network：附件失败')).toBeTruthy()
    expect(await screen.findByText('failed.txt')).toBeTruthy()
  })

  it('explains when registration is unavailable after OTP delivery', async () => {
    const registration = renderOverlay({ registered: false })
    registration.fake.remote.registerIdentity = () => Promise.resolve({
      ok: true,
      value: { ok: false, error: { code: 'forbidden', message: 'untrusted remote text' } },
    })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.change(await screen.findByLabelText('Handle'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('手机号'), { target: { value: '13800000000' } })
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }))
    fireEvent.change(await screen.findByLabelText('注册验证码'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: '继续' }))

    expect(await screen.findByText('当前 AWiki 服务未开放公开注册，或该手机号不在注册白名单。请使用已获准的手机号，或联系管理员开通注册权限。')).toBeTruthy()
    expect(screen.getByLabelText('Handle')).toHaveProperty('value', 'alice')
    expect(screen.getByLabelText('手机号')).toHaveProperty('value', '13800000000')
    expect(screen.getByLabelText('注册验证码')).toHaveProperty('value', '123456')
  })

  it('shows loading and pending states, refreshes, retries, and closes on Escape', async () => {
    const loading = renderOverlay()
    let settleConfig: (() => void) | undefined
    loading.fake.remote.getConfig = () => new Promise((resolve) => {
      settleConfig = () => {
        resolve({ ok: true, value: { ok: true, value: { pollIntervalMs: 1000, attachmentMaxBytes: 1024 } } })
      }
    })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    expect(await screen.findByText('正在连接 AWiki…')).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(screen.getByRole('dialog')).toBeTruthy()
    settleConfig?.()
    expect(await screen.findByText('Alice')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '刷新 AWiki' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '打开 AWiki' }))
  })

  it('keeps the closed launcher mounted and offers retry after a refresh failure', async () => {
    const b = renderOverlay()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByText('Alice')
    b.fake.remote.getConfig = () => Promise.resolve({ ok: false, error: { code: 'offline', message: '不可用', details: {} } })
    fireEvent.click(screen.getByRole('button', { name: '刷新 AWiki' }))
    expect(await screen.findByText(/连接 AWiki Host 失败/)).toBeTruthy()
    expect(screen.getByRole('button', { name: '重试' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '重试' }))
    fireEvent.click(screen.getByRole('button', { name: '关闭 AWiki' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('recovers an existing Handle through an explicit status-first confirmation flow without persisting factors', async () => {
    const b = renderOverlay({ sessionStatus: 'signed-out' })
    b.fake.remote.login = () => {
      b.fake.calls.push({ method: 'login' })
      return carried({ ok: false, error: { code: 'not-found', message: 'local identity unavailable' } })
    }
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: '重新进入本机身份' }))
    fireEvent.click(await screen.findByRole('button', { name: '恢复本机原有身份' }))
    expect(screen.getByRole('heading', { name: '恢复已有身份' })).toBeTruthy()

    fireEvent.change(screen.getByLabelText('完整 Handle'), { target: { value: 'alice.awiki.info' } })
    fireEvent.change(screen.getByLabelText('绑定手机号'), { target: { value: '13800000000' } })
    fireEvent.click(screen.getByRole('button', { name: '获取恢复验证码' }))
    expect(await screen.findByRole('heading', { name: '验证身份归属' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '取消恢复' })).toBeTruthy()
    expect(screen.getByText('alice.awiki.info')).toBeTruthy()
    expect(screen.getByText('138****0000')).toBeTruthy()
    expect(screen.queryByLabelText('绑定手机号')).toBeNull()
    expect(screen.getByText('恢复请求已创建')).toBeTruthy()
    const diagnostics = screen.getByText('诊断信息').closest('details')
    expect(diagnostics).toBeTruthy()
    expect(diagnostics?.hasAttribute('open')).toBe(false)
    expect(screen.getByText('recovery-1').closest('details')).toBe(diagnostics)
    expect(window.localStorage.getItem('awiki.handle-recovery.operation.v1')).toBe('recovery-1')
    expect(JSON.stringify(b.controller.getSnapshot())).not.toMatch(/13800000000|123456/u)
    expect(JSON.stringify(window.localStorage)).not.toMatch(/13800000000|123456/u)

    fireEvent.change(screen.getByLabelText('恢复验证码'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: '验证恢复信息' }))
    expect(await screen.findByRole('heading', { name: '确认恢复已有身份' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '取消恢复' })).toBeTruthy()
    expect(screen.getByText('等待最终确认')).toBeTruthy()
    expect(screen.getByText('recovery-1').closest('details')?.hasAttribute('open')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: '确认并恢复身份' }))

    expect(await screen.findByText('Alice')).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'activateRecovery')).toHaveLength(1)
    expect(window.localStorage.getItem('awiki.handle-recovery.operation.v1')).toBeNull()
  })

  it('restores only the recovery operation after restart and asks for the phone again', async () => {
    window.localStorage.setItem('awiki.handle-recovery.operation.v1', 'recovery-restart')
    const progress = {
      operationId: 'recovery-restart',
      fullHandle: 'alice.awiki.info',
      currentDid: identity.did,
      phase: 'awaiting_factor' as const,
      retryable: false,
      localOrdinaryDataWillMigrate: true,
      otherDevicesMustRejoin: false,
    }
    const b = renderOverlay({ registered: false, recoveryProgress: progress })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))

    expect(await screen.findByRole('heading', { name: '验证身份归属' })).toBeTruthy()
    expect(screen.getByText('alice.awiki.info')).toBeTruthy()
    expect(screen.getByLabelText('绑定手机号')).toHaveProperty('value', '')
    expect(screen.getByLabelText('恢复验证码')).toHaveProperty('value', '')
    expect(JSON.stringify(b.controller.getSnapshot())).not.toMatch(/otp|13800000000|123456/iu)
    expect(window.localStorage.getItem('awiki.handle-recovery.operation.v1')).toBe('recovery-restart')
  })

  it('requires an authoritative status refresh before another recovery activation', async () => {
    const b = renderOverlay({ sessionStatus: 'signed-out' })
    b.fake.remote.login = () => {
      b.fake.calls.push({ method: 'login' })
      return carried({ ok: false, error: { code: 'not-found', message: 'local identity unavailable' } })
    }
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: '重新进入本机身份' }))
    fireEvent.click(await screen.findByRole('button', { name: '恢复本机原有身份' }))
    fireEvent.change(screen.getByLabelText('完整 Handle'), { target: { value: 'alice.awiki.info' } })
    fireEvent.change(screen.getByLabelText('绑定手机号'), { target: { value: '13800000000' } })
    fireEvent.click(screen.getByRole('button', { name: '获取恢复验证码' }))
    await screen.findByRole('heading', { name: '验证身份归属' })
    expect(screen.getByText('alice.awiki.info')).toBeTruthy()
    expect(screen.getByText('138****0000')).toBeTruthy()
    expect(screen.queryByLabelText('绑定手机号')).toBeNull()
    fireEvent.change(screen.getByLabelText('恢复验证码'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: '验证恢复信息' }))
    await screen.findByRole('heading', { name: '确认恢复已有身份' })
    b.fake.remote.activateRecovery = (request) => {
      b.fake.calls.push({ method: 'activateRecovery', request })
      return carried({ ok: false, error: { code: 'network', message: 'uncertain' } })
    }
    fireEvent.click(screen.getByRole('button', { name: '确认并恢复身份' }))

    expect(await screen.findByRole('button', { name: '重新检查恢复结果' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '确认并恢复身份' })).toBeNull()
    expect(b.fake.calls.filter(call => call.method === 'activateRecovery')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: '重新检查恢复结果' }))
    expect(await screen.findByRole('heading', { name: '确认恢复已有身份' })).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'activateRecovery')).toHaveLength(1)
  })

  it('offers one local-transition retry and displays its failure only inside recovery', async () => {
    window.localStorage.setItem('awiki.handle-recovery.operation.v1', 'recovery-local-transition')
    const progress: AwikiRecoveryProgress = {
      operationId: 'recovery-local-transition',
      fullHandle: 'alice.awiki.info',
      previousDid: 'did:wba:alice:old' as AwikiDid,
      currentDid: identity.did,
      phase: 'identity_transition_pending',
      retryable: true,
      localOrdinaryDataWillMigrate: true,
      otherDevicesMustRejoin: true,
    }
    const b = renderOverlay({ registered: false, recoveryProgress: progress })
    b.fake.remote.resumeRecovery = request => {
      b.fake.calls.push({ method: 'resumeRecovery', request })
      return carried({
        ok: false,
        error: { code: 'invalid-request', message: 'local registry invariant' },
      })
    }

    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    expect(await screen.findByText('身份已在服务端恢复，本机切换尚未完成。请继续完成本机切换。')).toBeTruthy()
    const retry = await screen.findByRole('button', { name: '继续完成本机切换' })
    const failure = '身份已在服务端恢复，但本机切换尚未完成。请保留当前恢复操作，并继续完成本机切换；不要重新获取验证码或创建新身份。'
    expect(screen.getAllByText(failure)).toHaveLength(1)
    expect(b.controller.getSnapshot().error).toBeNull()

    fireEvent.click(retry)
    await waitFor(() => {
      expect(b.fake.calls.filter(call => call.method === 'resumeRecovery').length).toBeGreaterThanOrEqual(2)
    })
    expect(window.localStorage.getItem('awiki.handle-recovery.operation.v1')).toBe('recovery-local-transition')
  })

  it('joins a group by DID and exposes authoritative role-aware member management', async () => {
    const b = renderOverlay({ conversations: [group], groupSnapshot, groupMembers, history: [] })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: '发起会话' }))
    fireEvent.click(screen.getByRole('menuitem', { name: '加入群聊' }))
    fireEvent.change(screen.getByLabelText('群 DID'), { target: { value: group.groupDid } })
    fireEvent.click(screen.getByRole('button', { name: '加入群聊' }))
    await waitFor(() => { expect(b.fake.calls.some(call => call.method === 'joinGroup')).toBe(true) })

    fireEvent.click(await screen.findByRole('button', { name: '打开群聊详情' }))
    const details = await screen.findByRole('complementary', { name: '群聊详情' })
    expect(within(details).getAllByText('群主')).toHaveLength(2)
    expect(within(details).getByRole('button', { name: '移除群成员 Bob' })).toBeTruthy()
    expect(within(details).queryByRole('button', { name: '移除群成员 Alice' })).toBeNull()
    expect((within(details).getByRole('button', { name: '退出群聊' }) as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(within(details).getByLabelText('邀请成员'), { target: { value: 'carol' } })
    fireEvent.click(within(details).getByRole('button', { name: '邀请群成员' }))
    await waitFor(() => { expect(b.fake.calls.some(call => call.method === 'addGroupMember')).toBe(true) })
    fireEvent.click(within(details).getByRole('button', { name: '移除群成员 Bob' }))
    fireEvent.click(screen.getByRole('button', { name: '确认移除' }))
    await waitFor(() => { expect(b.fake.calls.some(call => call.method === 'removeGroupMember')).toBe(true) })
    expect(b.fake.calls.filter(call => call.method === 'listGroupMembers').length).toBeGreaterThanOrEqual(3)
  })

  it('keeps group invitation progress and its settled result beside the invite field', async () => {
    const b = renderOverlay({ conversations: [group], groupSnapshot, groupMembers, history: [] })
    const addGroupMember = b.fake.remote.addGroupMember
    const pending = deferred<Awaited<ReturnType<typeof addGroupMember>>>()
    b.fake.remote.addGroupMember = (request) => {
      b.fake.calls.push({ method: 'addGroupMember', request })
      return pending.promise
    }
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Harness Team/u }))
    fireEvent.click(await screen.findByRole('button', { name: '打开群聊详情' }))
    const details = await screen.findByRole('complementary', { name: '群聊详情' })
    const input = within(details).getByLabelText('邀请成员') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'carol' } })
    fireEvent.click(within(details).getByRole('button', { name: '邀请群成员' }))

    expect((await within(details).findByRole('status')).textContent).toBe('正在邀请 carol…')
    expect(input.disabled).toBe(true)
    pending.resolve(await addGroupMember({ groupDid: group.groupDid, member: 'carol' }))

    expect(await within(details).findByText('已邀请 carol')).toBeTruthy()
    expect(input.value).toBe('')
    expect(input.disabled).toBe(false)
  })

  it('shows a real pending and success state while refreshing authoritative group members', async () => {
    const b = renderOverlay({ conversations: [group], groupSnapshot, groupMembers, history: [] })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Harness Team/u }))
    fireEvent.click(await screen.findByRole('button', { name: '打开群聊详情' }))
    const details = await screen.findByRole('complementary', { name: '群聊详情' })
    const memberPage = deferred<Awaited<ReturnType<typeof b.fake.remote.listGroupMembers>>>()
    b.fake.remote.listGroupMembers = (request) => {
      b.fake.calls.push({ method: 'listGroupMembers', request })
      return memberPage.promise
    }
    const getGroupCalls = b.fake.calls.filter(call => call.method === 'getGroup').length
    const memberCalls = b.fake.calls.filter(call => call.method === 'listGroupMembers').length

    fireEvent.click(within(details).getByRole('button', { name: '刷新群成员' }))
    const pendingButton = await within(details).findByRole<HTMLButtonElement>('button', { name: '正在刷新群成员' })
    expect(pendingButton.disabled).toBe(true)
    expect(within(details).getByRole('status').textContent).toBe('正在刷新群成员…')
    await waitFor(() => {
      expect(b.fake.calls.filter(call => call.method === 'getGroup')).toHaveLength(getGroupCalls + 1)
      expect(b.fake.calls.filter(call => call.method === 'listGroupMembers')).toHaveLength(memberCalls + 1)
    })

    memberPage.resolve(carried(success({
      items: groupMembers,
      total: groupMembers.length,
      hasMore: false,
      pageGroup: group.groupDid,
      warnings: [],
    })))
    expect(await within(details).findByText('群成员已更新')).toBeTruthy()
    expect(within(details).getByRole<HTMLButtonElement>('button', { name: '刷新群成员' }).disabled).toBe(false)
  })

  it('keeps group-member refresh failure visible and clears it when retrying', async () => {
    const b = renderOverlay({ conversations: [group], groupSnapshot, groupMembers, history: [] })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Harness Team/u }))
    fireEvent.click(await screen.findByRole('button', { name: '打开群聊详情' }))
    const details = await screen.findByRole('complementary', { name: '群聊详情' })
    b.fake.remote.listGroupMembers = (request) => {
      b.fake.calls.push({ method: 'listGroupMembers', request })
      return carried({ ok: false, error: { code: 'network', message: 'private network detail' } })
    }

    fireEvent.click(within(details).getByRole('button', { name: '刷新群成员' }))
    expect((await within(details).findByRole('alert')).textContent).toBe('刷新失败：无法连接 AWiki 群聊服务，请检查网络后重试。')
    expect(b.controller.getSnapshot().error).toBeNull()

    const retry = deferred<Awaited<ReturnType<typeof b.fake.remote.listGroupMembers>>>()
    b.fake.remote.listGroupMembers = (request) => {
      b.fake.calls.push({ method: 'listGroupMembers', request })
      return retry.promise
    }
    fireEvent.click(within(details).getByRole('button', { name: '刷新群成员' }))
    expect(within(details).queryByRole('alert')).toBeNull()
    expect(within(details).getByText('正在刷新群成员…')).toBeTruthy()
    retry.resolve(carried(success({ items: groupMembers, hasMore: false, pageGroup: group.groupDid, warnings: [] })))
    expect(await within(details).findByText('群成员已更新')).toBeTruthy()
  })

  it('inserts human group mentions with emoji-safe P9 ranges, highlights them, and restores metadata after send failure', async () => {
    const incoming: AwikiMessage = {
      ...message,
      id: 'mention-incoming' as never,
      conversationId: group.id,
      conversationKind: 'group',
      content: {
        kind: 'text',
        text: '😀 hi @Alice',
        mentions: [{ id: 'incoming-mention', start: 5, end: 11, did: identity.did, displayName: 'Alice' }],
      },
    }
    const b = renderOverlay({ conversations: [group], groupSnapshot, groupMembers, history: [incoming] })
    const originalSend = b.fake.remote.sendText
    let fail = true
    b.fake.remote.sendText = (request) => {
      if (!fail) return originalSend(request)
      b.fake.calls.push({ method: 'sendText', request })
      return carried({ ok: false, error: { code: 'network', message: 'retry' } })
    }
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Harness Team/u }))
    expect(await screen.findByText('@Alice', { selector: 'mark' })).toBeTruthy()
    await waitFor(() => { expect(b.controller.getSnapshot().groupMembers).toHaveLength(2) })

    const textarea = screen.getByPlaceholderText<HTMLTextAreaElement>('输入消息')
    fireEvent.change(textarea, { target: { value: '😀 hello @b' } })
    textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    fireEvent.select(textarea)
    expect(await screen.findByRole('option', { name: /Bob/u })).toBeTruthy()
    fireEvent.keyDown(textarea, { key: 'Enter' })
    expect(textarea.value).toBe('😀 hello @Bob ')
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))
    await waitFor(() => { expect(textarea.value).toBe('😀 hello @Bob ') })

    fail = false
    fireEvent.click(screen.getByRole('button', { name: '发送消息' }))
    await waitFor(() => { expect(b.fake.calls.filter(call => call.method === 'sendText')).toHaveLength(2) })
    for (const call of b.fake.calls.filter(call => call.method === 'sendText')) {
      expect(call.request).toMatchObject({
        text: '😀 hello @Bob ',
        mentions: [{ start: 8, end: 12, did: direct.peerDid, displayName: 'Bob' }],
      })
    }
  })
})
