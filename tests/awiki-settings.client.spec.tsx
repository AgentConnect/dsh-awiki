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
} = {}) {
  const saveDomain = vi.fn(actions.saveDomain ?? (() => Promise.resolve()))
  const resetDomain = vi.fn(actions.resetDomain ?? (() => Promise.resolve()))
  const clearLocalData = vi.fn(actions.clearLocalData ?? (() => Promise.resolve()))
  render(<AwikiSettingsSection {...{
    t: translate,
    useAwikiSettings: <T,>(selector: (value: SettingsScopeSnapshot<AwikiSettings>) => T) => selector(snapshot),
    saveDomain,
    resetDomain,
    clearLocalData,
    close: () => {},
  } as never} />)
  return { saveDomain, resetDomain, clearLocalData }
}

describe('AWiki settings section', () => {
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
