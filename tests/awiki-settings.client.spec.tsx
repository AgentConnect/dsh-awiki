// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { AwikiSettingsSection } from '../src/client/AwikiSettingsSection.tsx'
import { zh, type AwikiSettingsKey } from '../src/client/settings-locales.ts'
import type { AwikiSettings } from '../src/settings.ts'

afterEach(() => { cleanup() })

function translate(key: AwikiSettingsKey, params?: Record<string, unknown>): string {
  let value = zh[key]
  for (const [name, replacement] of Object.entries(params ?? {})) {
    value = value.replace(`{${name}}`, String(replacement))
  }
  return value
}

function ready(overrides: Partial<SettingsScopeSnapshot<AwikiSettings>> = {}): SettingsScopeSnapshot<AwikiSettings> {
  return {
    status: 'ready',
    value: { domain: 'awiki.ai' },
    base: { domain: 'awiki.ai' },
    user: undefined,
    revision: 0,
    writable: true,
    mode: 'host',
    ...overrides,
  }
}

function mount(snapshot: SettingsScopeSnapshot<AwikiSettings>, actions: {
  saveDomain?: (domain: string) => Promise<void>
  resetDomain?: () => Promise<void>
  clearLocalData?: () => Promise<void>
  loadAwiki?: () => Promise<unknown>
  refreshDeviceManagement?: () => Promise<unknown>
} = {}) {
  const saveDomain = vi.fn(actions.saveDomain ?? (() => Promise.resolve()))
  const resetDomain = vi.fn(actions.resetDomain ?? (() => Promise.resolve()))
  const clearLocalData = vi.fn(actions.clearLocalData ?? (() => Promise.resolve()))
  const loadAwiki = vi.fn(actions.loadAwiki ?? (async () => ({ ok: true, value: undefined })))
  const refreshDeviceManagement = vi.fn(actions.refreshDeviceManagement ?? (async () => ({
    ok: true,
    value: {
      canManage: true,
      rootTransferSupported: false,
      role: 'admin',
      readiness: 'admin_ready',
      devices: [{ deviceRef: 'device-current', status: 'active', role: 'admin', managementReady: true, isCurrent: true }],
      requests: [],
    },
  })))
  render(<AwikiSettingsSection {...{
    t: translate,
    useAwikiSettings: <T,>(selector: (value: SettingsScopeSnapshot<AwikiSettings>) => T) => selector(snapshot),
    useAwiki: <T,>(selector: (value: { status: string; sessionStatus: string; pending: null }) => T) => selector({ status: 'ready', sessionStatus: 'active', pending: null }),
    saveDomain,
    resetDomain,
    clearLocalData,
    loadAwiki,
    refreshDeviceManagement,
    startDeviceJoinVerification: async () => ({ ok: false, error: 'unexpected verification' }),
    approveDeviceJoin: async () => ({ ok: false, error: 'unexpected approval' }),
    rejectDeviceJoin: async () => ({ ok: false, error: 'unexpected rejection' }),
    revokeDevice: async () => ({ ok: false, error: 'unexpected revoke' }),
    prepareRootTransfer: async () => ({ ok: false, error: 'unexpected transfer' }),
    confirmRootTransfer: async () => ({ ok: false, error: 'unexpected transfer confirmation' }),
    loadIntegration: async () => ({ ok: true, value: null }),
    saveIntegration: async () => ({ ok: false, error: 'unexpected integration save' }),
    rotateIntegrationId: async () => ({ ok: false, error: 'unexpected integration rotation' }),
    closeIntegration: async () => ({ ok: false, error: 'unexpected integration close' }),
    reopenIntegration: async () => ({ ok: false, error: 'unexpected integration reopen' }),
    listOwnedGroups: async () => ({ ok: true, value: [] }),
    openIntegrationGuide: () => {},
    close: () => {},
  } as never} />)
  return { saveDomain, resetDomain, clearLocalData, loadAwiki, refreshDeviceManagement }
}

describe('AWiki settings section', () => {
  it('separates basic, device, and integration settings and loads devices only in the device tab', async () => {
    const actions = mount(ready())
    const tabs = screen.getByRole('tablist', { name: 'AWiki 设置' })
    expect(tabs).toBeTruthy()
    expect(screen.getByRole('tab', { name: '基础设置' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tab', { name: '设备' }).getAttribute('aria-selected')).toBe('false')
    expect(screen.getByRole('tab', { name: '集成' }).getAttribute('aria-selected')).toBe('false')
    expect(screen.getByLabelText('默认域名')).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'AWiki 设备管理' })).toBeNull()
    expect(actions.refreshDeviceManagement).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('tab', { name: '设备' }))
    expect(screen.queryByLabelText('默认域名')).toBeNull()
    expect(screen.getByRole('region', { name: 'AWiki 设备管理' })).toBeTruthy()
    await waitFor(() => { expect(actions.refreshDeviceManagement).toHaveBeenCalledOnce() })
    expect(await screen.findByText('当前设备 · admin · active')).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: '集成' }))
    expect(screen.queryByRole('region', { name: 'AWiki 设备管理' })).toBeNull()
    expect(await screen.findByText('临时消息集成')).toBeTruthy()
  })

  it('loads AWiki identity state when devices is opened before the messaging overlay', async () => {
    const loadAwiki = vi.fn(async () => ({ ok: true, value: undefined }))
    render(<AwikiSettingsSection {...{
      t: translate,
      useAwikiSettings: <T,>(selector: (value: SettingsScopeSnapshot<AwikiSettings>) => T) => selector(ready()),
      useAwiki: <T,>(selector: (value: { status: string; sessionStatus: null; pending: null }) => T) => selector({ status: 'cold', sessionStatus: null, pending: null }),
      loadAwiki,
      close: () => {},
    } as never} />)

    fireEvent.click(screen.getByRole('tab', { name: '设备' }))
    await waitFor(() => { expect(loadAwiki).toHaveBeenCalledOnce() })
    expect(screen.getByRole('status').textContent).toBe('正在读取 AWiki 设备状态…')
  })

  it('contains only AWiki-owned identity, domain, and local-data settings', () => {
    mount(ready())
    expect(screen.queryByRole('tab', { name: '账户与充值' })).toBeNull()
    expect(screen.queryByRole('tab', { name: '用量明细' })).toBeNull()
    expect(screen.queryByText('快速充值')).toBeNull()
    expect(screen.queryByText(/DeepSeek官方API/)).toBeNull()
    expect(screen.getByLabelText('默认域名')).toBeTruthy()
    expect(screen.getByRole('button', { name: '清空本地 AWiki 数据' })).toBeTruthy()
  })

  it('shows awiki.ai as the default and rejects a URL before persistence', async () => {
    const actions = mount(ready())
    const input = screen.getByLabelText('默认域名')
    expect((input as HTMLInputElement).value).toBe('awiki.ai')
    expect(screen.getByText('默认值：awiki.ai')).toBeTruthy()

    fireEvent.change(input, { target: { value: 'https://awiki.example/path' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(await screen.findByText('请输入有效的域名，例如 awiki.ai。')).toBeTruthy()
    expect(actions.saveDomain).not.toHaveBeenCalled()
  })

  it('persists a custom domain and explains the restart and identity boundary', async () => {
    const actions = mount(ready())
    const input = screen.getByLabelText('默认域名')
    fireEvent.change(input, { target: { value: 'teams.example' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => { expect(actions.saveDomain).toHaveBeenCalledWith('teams.example') })
    expect(await screen.findByText('已保存。 重启 DeepSeek Harness 后生效。')).toBeTruthy()
    expect(screen.getByText(/不会改写已经注册的 DID 或 Handle/)).toBeTruthy()
  })

  it('offers reset only for a persisted override and reports write failures', async () => {
    const failure = () => Promise.reject(new Error('write failed'))
    const actions = mount(ready({ user: { domain: 'legacy.example' }, value: { domain: 'legacy.example' } }), {
      resetDomain: failure,
    })
    const reset = screen.getByRole('button', { name: '恢复默认值' })
    expect((reset as HTMLButtonElement).disabled).toBe(false)
    fireEvent.click(reset)

    await waitFor(() => { expect(actions.resetDomain).toHaveBeenCalledOnce() })
    expect(await screen.findByText('未能保存设置，请刷新后重试。')).toBeTruthy()
  })

  it('disables editing for remote-memory and read-only settings surfaces', () => {
    const { unmount } = render(<AwikiSettingsSection {...{
      t: translate,
      useAwikiSettings: <T,>(selector: (value: SettingsScopeSnapshot<AwikiSettings>) => T) => selector(ready({ mode: 'memory' })),
      useAwiki: <T,>(selector: (value: { status: string; sessionStatus: string; pending: null }) => T) => selector({ status: 'ready', sessionStatus: 'active', pending: null }),
      saveDomain: () => Promise.resolve(),
      resetDomain: () => Promise.resolve(),
      clearLocalData: () => Promise.resolve(),
      close: () => {},
    } as never} />)
    expect((screen.getByLabelText('默认域名') as HTMLInputElement).disabled).toBe(true)
    expect(screen.getAllByText(/当前连接无法修改 Host 设置/).length).toBeGreaterThan(0)
    unmount()

    mount(ready({ writable: false }))
    expect((screen.getByLabelText('默认域名') as HTMLInputElement).disabled).toBe(true)
    expect(screen.getByText('当前设置文件为只读。')).toBeTruthy()
  })

  it('requires the typed second confirmation before clearing local AWiki data', async () => {
    const actions = mount(ready())
    fireEvent.click(screen.getByRole('button', { name: '清空本地 AWiki 数据' }))

    const dialog = screen.getByRole('dialog', { name: '确认清空本地 AWiki 数据' })
    expect(dialog.textContent).toContain('私钥')
    expect(dialog.textContent).toContain('服务端 AWiki 账号与 Handle 不会被删除')
    expect(dialog.textContent).toContain('使用完整 Handle、绑定手机号和验证码恢复原身份')
    const confirm = screen.getByRole('button', { name: '永久清空' })
    expect((confirm as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('请输入“永久清空”以确认：'), { target: { value: '永久清除' } })
    expect((confirm as HTMLButtonElement).disabled).toBe(true)
    expect(actions.clearLocalData).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText('取消'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(actions.clearLocalData).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '清空本地 AWiki 数据' }))

    fireEvent.change(screen.getByLabelText('请输入“永久清空”以确认：'), { target: { value: '永久清空' } })
    fireEvent.click(screen.getByRole('button', { name: '永久清空' }))
    await waitFor(() => { expect(actions.clearLocalData).toHaveBeenCalledOnce() })
    expect(await screen.findByText('本地 AWiki 数据已清空。原身份可通过 Handle 和绑定手机号恢复，已清除的本地数据无法恢复。')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps the destructive dialog open and reports a failed clear', async () => {
    const actions = mount(ready(), { clearLocalData: () => Promise.reject(new Error('failed')) })
    fireEvent.click(screen.getByRole('button', { name: '清空本地 AWiki 数据' }))
    fireEvent.change(screen.getByLabelText('请输入“永久清空”以确认：'), { target: { value: '永久清空' } })
    fireEvent.click(screen.getByRole('button', { name: '永久清空' }))

    await waitFor(() => { expect(actions.clearLocalData).toHaveBeenCalledOnce() })
    expect(await screen.findByText('未能清空本地 AWiki 数据，未完成删除。请重试。')).toBeTruthy()
    expect(screen.getByRole('dialog', { name: '确认清空本地 AWiki 数据' })).toBeTruthy()
  })
})
