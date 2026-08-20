// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { AwikiSettingsSection } from '../src/client/AwikiSettingsSection.tsx'
import { zh, type AwikiSettingsKey } from '../src/client/settings-locales.ts'
import type { AwikiSettings } from '../src/settings.ts'
import type { AwikiView } from '../src/client/controller.ts'
import type { AwikiModelProxyView } from '../src/client/model-proxy-controller.ts'
import { identity as registeredIdentity } from './helpers.client.ts'

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

const modelView: AwikiModelProxyView = {
  status: 'ready',
  account: {
    enabled: false,
    recommended_model: 'deepseek-v4-flash',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    pending_recharge_order: null,
    account: {
      did: 'did:wba:alice.example', balance_cents: 0, balance: '0.00', currency: 'CNY',
      model_access_available: true, model_access_reason: null,
      billing_mode: 'development_bypass', payments_available: false,
    },
  },
  usage: [], usageLoading: false, pending: null, error: null,
}

const identityView: AwikiView = {
  status: 'ready', sessionStatus: 'active', identity: registeredIdentity,
  conversations: [], conversationsHasMore: false, selectedConversationId: null,
  messages: [], historyHasMore: false, pending: null, error: null,
  attachmentMaxBytes: 1024, summaries: {},
}

function fakeIdentity() {
  return {
    loadSession: vi.fn(() => Promise.resolve()),
    login: vi.fn(() => Promise.resolve({ ok: true, value: { status: 'active', identity: registeredIdentity } })),
  }
}

function fakeModels() {
  return {
    load: vi.fn(() => Promise.resolve()),
    loadUsage: vi.fn(() => Promise.resolve()),
    setEnabled: vi.fn(() => Promise.resolve()),
    createRecharge: vi.fn(),
    rechargeStatus: vi.fn(),
  }
}

function mount(snapshot: SettingsScopeSnapshot<AwikiSettings>, actions: {
  saveDomain?: (domain: string) => Promise<void>
  resetDomain?: () => Promise<void>
  clearLocalData?: () => Promise<void>
} = {}) {
  const saveDomain = vi.fn(actions.saveDomain ?? (() => Promise.resolve()))
  const resetDomain = vi.fn(actions.resetDomain ?? (() => Promise.resolve()))
  const clearLocalData = vi.fn(actions.clearLocalData ?? (() => Promise.resolve()))
  const models = fakeModels()
  render(<AwikiSettingsSection {...{
    t: translate,
    useAwikiSettings: <T,>(selector: (value: SettingsScopeSnapshot<AwikiSettings>) => T) => selector(snapshot),
    useAwikiModelProxy: <T,>(selector: (value: AwikiModelProxyView) => T) => selector(modelView),
    useAwikiSession: <T,>(selector: (value: AwikiView) => T) => selector(identityView),
    models, identity: fakeIdentity(),
    saveDomain,
    resetDomain,
    clearLocalData,
    close: () => {},
  } as never} />)
  fireEvent.click(screen.getByRole('tab', { name: '高级设置' }))
  return { saveDomain, resetDomain, clearLocalData, models }
}

describe('AWiki settings section', () => {
  it('hides model, recharge, and usage entry points when the optional Host capability is absent', () => {
    const unavailable: AwikiModelProxyView = {
      status: 'unavailable', account: null, usage: [], usageLoading: false,
      pending: null, error: 'model proxy channel is not installed',
    }
    const models = fakeModels()
    render(<AwikiSettingsSection {...{
      t: translate,
      useAwikiSettings: <T,>(selector: (value: SettingsScopeSnapshot<AwikiSettings>) => T) => selector(ready()),
      useAwikiModelProxy: <T,>(selector: (value: AwikiModelProxyView) => T) => selector(unavailable),
      useAwikiSession: <T,>(selector: (value: AwikiView) => T) => selector(identityView),
      models,
      identity: fakeIdentity(),
      saveDomain: () => Promise.resolve(),
      resetDomain: () => Promise.resolve(),
      clearLocalData: () => Promise.resolve(),
      close: () => {},
    } as never} />)

    expect(screen.queryByRole('tab', { name: '账户与充值' })).toBeNull()
    expect(screen.queryByRole('tab', { name: '用量明细' })).toBeNull()
    expect(screen.getByRole('tab', { name: '高级设置' })).toBeTruthy()
    expect(screen.queryByText('model proxy channel is not installed')).toBeNull()
    expect(models.loadUsage).not.toHaveBeenCalled()
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
      useAwikiModelProxy: <T,>(selector: (value: AwikiModelProxyView) => T) => selector(modelView),
      useAwikiSession: <T,>(selector: (value: AwikiView) => T) => selector(identityView),
      models: fakeModels(), identity: fakeIdentity(),
      saveDomain: () => Promise.resolve(),
      resetDomain: () => Promise.resolve(),
      clearLocalData: () => Promise.resolve(),
      close: () => {},
    } as never} />)
    fireEvent.click(screen.getByRole('tab', { name: '高级设置' }))
    expect((screen.getByLabelText('默认域名') as HTMLInputElement).disabled).toBe(true)
    expect(screen.getByText(/当前连接无法修改 Host 设置/)).toBeTruthy()
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
    expect(await screen.findByText('本地 AWiki 数据已清空，无法恢复。')).toBeTruthy()
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
