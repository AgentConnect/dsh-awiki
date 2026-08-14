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
} = {}) {
  const saveDomain = vi.fn(actions.saveDomain ?? (() => Promise.resolve()))
  const resetDomain = vi.fn(actions.resetDomain ?? (() => Promise.resolve()))
  render(<AwikiSettingsSection {...{
    t: translate,
    useAwikiSettings: <T,>(selector: (value: SettingsScopeSnapshot<AwikiSettings>) => T) => selector(snapshot),
    saveDomain,
    resetDomain,
    close: () => {},
  } as never} />)
  return { saveDomain, resetDomain }
}

describe('AWiki settings section', () => {
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
      close: () => {},
    } as never} />)
    expect((screen.getByLabelText('默认域名') as HTMLInputElement).disabled).toBe(true)
    expect(screen.getByText(/当前连接无法修改 Host 设置/)).toBeTruthy()
    unmount()

    mount(ready({ writable: false }))
    expect((screen.getByLabelText('默认域名') as HTMLInputElement).disabled).toBe(true)
    expect(screen.getByText('当前设置文件为只读。')).toBeTruthy()
  })
})
