// @vitest-environment jsdom
import { createHash } from 'node:crypto'
import { useSyncExternalStore } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AwikiMessage } from 'dsh-awiki/types'
import { AwikiController } from '../src/client/controller.ts'
import { AWIKI_ME_APP_ICON_DATA_URL } from '../src/client/assets.ts'
import {
  AWIKI_LAUNCHER_POSITION_KEY,
  AwikiOverlay,
  clampAwikiLauncherPosition,
  resolveAwikiDrawerPlacement,
} from '../src/client/AwikiOverlay.tsx'
import { createAwikiOverlayStore } from '../src/client/store.ts'
import type { AwikiOverlayProps } from '../src/client/slots.ts'
import { attachmentMessage, carried, direct, fakeRemote, group, identity, message, success, summary } from './helpers.client.ts'
import { saveDownloadedAttachment } from '../src/client/file.ts'

vi.mock('../src/client/file.ts', async importOriginal => ({
  ...await importOriginal<typeof import('../src/client/file.ts')>(),
  saveDownloadedAttachment: vi.fn(),
}))

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
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
    sendRegistrationOtp: request => controller.sendRegistrationOtp(request),
    registerIdentity: request => controller.registerIdentity(request),
    updateDisplayName: displayName => controller.updateDisplayName(displayName),
    loadMoreConversations: () => controller.loadMoreConversations(),
    startDirectChat: handle => controller.startDirectChat(handle),
    selectConversation: id => controller.selectConversation(id),
    loadOlderHistory: () => controller.loadOlderHistory(),
    summarizeConversation: () => controller.summarizeConversation(),
    setSummaryCollapsed: (conversationId, collapsed) => { controller.setSummaryCollapsed(conversationId, collapsed) },
    sendText: text => controller.sendText(text),
    sendAttachment: file => controller.sendAttachment(file),
    downloadAttachment: (messageId, attachmentId) => controller.downloadAttachment(messageId, attachmentId),
    logout: () => controller.clearLocalData({ confirmation: 'clear-awiki-local-data' }),
    useSessions: (() => undefined) as never,
    useWorkspaces: (() => undefined) as never,
  }
  render(<AwikiOverlay {...props} />)
  return { fake, controller, instance }
}

describe('AwikiOverlay', () => {
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
    expect(drawer.style.left).toBe('16px')
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
    fireEvent.click(screen.getByRole('button', { name: '发起会话' }))
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
    await screen.findByText('注册 AWiki 身份')
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
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Alice' }))
    expect(screen.getByRole('tooltip').textContent).toBe('did:wba:alice')
    expect(screen.getByRole('button', { name: /Bob/ }).textContent).toContain('你好')
  })

  it('opens logout from the top-left AWiki icon and clears only after confirmation', async () => {
    const b = renderOverlay()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    await screen.findByText('Alice')

    fireEvent.click(screen.getByRole('button', { name: 'AWiki 账户菜单' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: '退出登录' }))
    expect(screen.getByRole('dialog', { name: '退出登录' })).toBeTruthy()
    expect(screen.getByText(/不会删除远端 AWiki 账号或 Handle/)).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'clearLocalData')).toHaveLength(0)

    fireEvent.click(screen.getByText('取消', { selector: 'button' }))
    expect(screen.queryByRole('dialog', { name: '退出登录' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'AWiki 账户菜单' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: '退出登录' }))
    fireEvent.click(screen.getByRole('button', { name: '确认退出' }))
    expect(await screen.findByText('注册 AWiki 身份')).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'clearLocalData')).toEqual([{
      method: 'clearLocalData',
      request: { confirmation: 'clear-awiki-local-data' },
    }])
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

  it('edits the nickname inline while preserving the Handle and supports cancel', async () => {
    const b = renderOverlay()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Alice' }))
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: '昵称' })
    expect(input.value).toBe('Alice')
    expect(screen.getByText('alice')).toBeTruthy()

    fireEvent.change(input, { target: { value: '  新昵称  ' } })
    fireEvent.click(screen.getByRole('button', { name: '保存昵称' }))
    expect(await screen.findByRole('button', { name: '新昵称' })).toBeTruthy()
    expect(b.fake.calls.find(call => call.method === 'updateDisplayName')?.request).toEqual({ displayName: '新昵称' })
    expect(screen.getByText('alice')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '新昵称' }))
    fireEvent.change(screen.getByRole('textbox', { name: '昵称' }), { target: { value: '不保存' } })
    fireEvent.keyDown(screen.getByRole('textbox', { name: '昵称' }), { key: 'Escape' })
    expect(screen.getByRole('button', { name: '新昵称' })).toBeTruthy()
    expect(b.fake.calls.filter(call => call.method === 'updateDisplayName')).toHaveLength(1)
  })

  it('validates an inline nickname before calling the Host', async () => {
    const b = renderOverlay()
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Alice' }))
    fireEvent.change(screen.getByRole('textbox', { name: '昵称' }), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: '保存昵称' }))
    expect(screen.getByRole('alert').textContent).toBe('请输入昵称')
    expect(b.fake.calls.filter(call => call.method === 'updateDisplayName')).toHaveLength(0)
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
    await screen.findByText('注册 AWiki 身份')
    fireEvent.change(screen.getByLabelText('Handle'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText('手机号'), { target: { value: '13800000000' } })
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }))
    expect(await screen.findByText(/验证码已发送/)).toBeTruthy()
    expect(b.fake.calls.find(call => call.method === 'sendRegistrationOtp')?.request).toEqual({ handle: 'alice', phone: '13800000000' })

    fireEvent.click(screen.getByRole('button', { name: '重新获取验证码' }))
    expect(screen.queryByLabelText('验证码')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }))

    fireEvent.change(await screen.findByLabelText('验证码'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: '注册身份' }))
    expect(await screen.findByText('Alice')).toBeTruthy()
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
    expect((await screen.findByRole('status')).textContent).toContain('正在整理这段对话')
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
    const getHistory = b.fake.remote.getHistory
    let releaseHistory!: () => void
    b.fake.remote.getHistory = request => new Promise((resolve) => {
      releaseHistory = () => { void getHistory(request).then(resolve) }
    })
    fireEvent.click(screen.getByRole('button', { name: '打开 AWiki' }))
    fireEvent.click(await screen.findByRole('button', { name: /Bob/ }))

    const history = await screen.findByRole('log', { name: '消息记录' })
    expect(history.scrollTop).toBe(0)
    releaseHistory()
    expect(await screen.findByText('你好')).toBeTruthy()
    await waitFor(() => { expect(history.scrollTop).toBe(640) })
    expect(scrollHeight).toHaveBeenCalled()
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
    fireEvent.change(await screen.findByLabelText('验证码'), { target: { value: '000000' } })
    fireEvent.click(screen.getByRole('button', { name: '注册身份' }))
    expect(await screen.findByText('注册冲突：服务端可能已收到上次注册请求，或该手机号 / Handle 已绑定其他身份。请保留当前页面并再次提交；若仍失败，请勿清除本机身份数据，联系管理员并提供失败时间。')).toBeTruthy()
    expect(screen.getByLabelText('Handle')).toHaveProperty('value', 'alice')
    expect(screen.getByLabelText('手机号')).toHaveProperty('value', '13800000000')
    expect(screen.getByLabelText('验证码')).toHaveProperty('value', '000000')
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
    fireEvent.change(await screen.findByLabelText('验证码'), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: '注册身份' }))

    expect(await screen.findByText('当前 AWiki 服务未开放公开注册，或该手机号不在注册白名单。请使用已获准的手机号，或联系管理员开通注册权限。')).toBeTruthy()
    expect(screen.getByLabelText('Handle')).toHaveProperty('value', 'alice')
    expect(screen.getByLabelText('手机号')).toHaveProperty('value', '13800000000')
    expect(screen.getByLabelText('验证码')).toHaveProperty('value', '123456')
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
})
