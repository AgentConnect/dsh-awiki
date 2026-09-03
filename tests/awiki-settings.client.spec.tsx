// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AwikiSettingsSection } from '../src/client/AwikiSettingsSection.tsx'
import { zh, type AwikiSettingsKey } from '../src/client/settings-locales.ts'
import type { AwikiTenantScopeSnapshot } from '../src/client/settings-controller.ts'

afterEach(() => { cleanup() })

function translate(key: AwikiSettingsKey, params?: Record<string, unknown>): string {
  let value = zh[key]
  for (const [name, replacement] of Object.entries(params ?? {})) value = value.replace(`{${name}}`, String(replacement))
  return value
}

function ready(overrides: Partial<AwikiTenantScopeSnapshot['value']> = {}): AwikiTenantScopeSnapshot {
  return {
    status: 'ready',
    value: {
      schemaVersion: 1,
      officialCatalogVersion: 1,
      generation: 0,
      activeTenantId: 'official-china',
      switching: false,
      tenants: [
        { tenantId: 'official-china', storageScopeId: 'official-china-v1', kind: 'built_in', displayName: 'AWiki 中国（上海）', backendBaseUrl: 'https://awiki.me', didHost: 'awiki.me', lifecycle: 'active', storageLayout: 'scope-v1' },
        { tenantId: 'official-global', storageScopeId: 'official-global-v1', kind: 'built_in', displayName: 'AWiki 全球（硅谷）', backendBaseUrl: 'https://awiki.ai', didHost: 'awiki.ai', lifecycle: 'inactive', storageLayout: 'scope-v1' },
        { tenantId: 'custom-1', storageScopeId: 'scope-1', kind: 'custom', displayName: 'My Team', backendBaseUrl: 'https://team.example', didHost: 'team.example', lifecycle: 'inactive', storageLayout: 'scope-v1' },
      ],
      ...overrides,
    },
  }
}

function mount(snapshot: AwikiTenantScopeSnapshot = ready(), overrides: Record<string, unknown> = {}) {
  const actions = {
    createTenant: vi.fn(() => Promise.resolve()),
    renameTenant: vi.fn(() => Promise.resolve()),
    switchTenant: vi.fn(() => Promise.resolve()),
    archiveTenant: vi.fn(() => Promise.resolve()),
    refreshUpdatePolicy: vi.fn(() => Promise.resolve()),
    clearLocalData: vi.fn(() => Promise.resolve()),
    loadIntegration: vi.fn(() => Promise.resolve({ ok: false, error: 'unavailable' })),
    ...overrides,
  }
  render(<AwikiSettingsSection {...{
    t: translate,
    useAwikiTenants: <T,>(selector: (value: AwikiTenantScopeSnapshot) => T) => selector(snapshot),
    useAwikiSettings: () => undefined,
    saveDomain: () => Promise.resolve(),
    resetDomain: () => Promise.resolve(),
    saveIntegration: () => Promise.resolve({ ok: false, error: 'unavailable' }),
    rotateIntegrationId: () => Promise.resolve({ ok: false, error: 'unavailable' }),
    closeIntegration: () => Promise.resolve({ ok: false, error: 'unavailable' }),
    listOwnedGroups: () => Promise.resolve({ ok: false, error: 'unavailable' }),
    openIntegrationGuide: () => {},
    close: () => {},
    ...actions,
  } as never} />)
  return actions
}

describe('AWiki tenant-aware settings section', () => {
  it('renders the required three tabs and marks both immutable official tenants', () => {
    mount()
    expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['租户', '本地数据', '临时消息集成'])
    const china = screen.getByText('AWiki 中国（上海）').closest('article')!
    const global = screen.getByText('AWiki 全球（硅谷）').closest('article')!
    expect(within(china).getByText('当前')).toBeTruthy()
    expect(within(china).queryByRole('button', { name: '归档' })).toBeNull()
    expect(within(global).getByRole('button', { name: '切换' })).toBeTruthy()
    expect(within(global).queryByRole('button', { name: '归档' })).toBeNull()
  })

  it('creates custom tenants from a name and bare domain and rejects URL input locally', async () => {
    const actions = mount()
    fireEvent.change(document.getElementById('awiki-tenant-name')!, { target: { value: 'Private' } })
    fireEvent.change(screen.getByLabelText('租户域名'), { target: { value: 'https://bad.example/path' } })
    fireEvent.click(screen.getByRole('button', { name: '创建租户' }))
    expect(await screen.findByText('请输入有效的域名，例如 tenant.example。')).toBeTruthy()
    expect(actions.createTenant).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('租户域名'), { target: { value: 'tenant.example' } })
    fireEvent.click(screen.getByRole('button', { name: '创建租户' }))
    await waitFor(() => { expect(actions.createTenant).toHaveBeenCalledWith('Private', 'tenant.example') })
  })

  it('switches, renames, and archives only eligible tenants', async () => {
    const actions = mount()
    const global = screen.getByText('AWiki 全球（硅谷）').closest('article')!
    fireEvent.click(within(global).getByRole('button', { name: '切换' }))
    await waitFor(() => { expect(actions.switchTenant).toHaveBeenCalledWith('official-global') })

    const customInput = screen.getByDisplayValue('My Team')
    fireEvent.change(customInput, { target: { value: 'Renamed' } })
    const custom = customInput.closest('article')!
    fireEvent.click(within(custom).getByRole('button', { name: '保存' }))
    await waitFor(() => { expect(actions.renameTenant).toHaveBeenCalledWith('custom-1', 'Renamed') })
    fireEvent.click(within(custom).getByRole('button', { name: '归档' }))
    await waitFor(() => { expect(actions.archiveTenant).toHaveBeenCalledWith('custom-1') })
  })

  it('disables duplicate operations while a switch is in progress', () => {
    mount(ready({ switching: true }))
    expect(screen.getAllByRole('button', { name: '切换' }).every(button => (button as HTMLButtonElement).disabled)).toBe(true)
    expect(screen.getByText('正在切换租户并隔离旧运行时…')).toBeTruthy()
  })

  it('keeps destructive data cleanup in its own tab and requires typed confirmation', async () => {
    const actions = mount()
    fireEvent.click(screen.getByRole('tab', { name: '本地数据' }))
    fireEvent.click(screen.getByRole('button', { name: '清空本地 AWiki 数据' }))
    expect(screen.getByRole('dialog', { name: '确认清空本地 AWiki 数据' }).textContent).toContain('私钥')
    const confirm = screen.getByRole('button', { name: '永久清空' })
    expect((confirm as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('请输入“永久清空”以确认：'), { target: { value: '永久清空' } })
    fireEvent.click(confirm)
    await waitFor(() => { expect(actions.clearLocalData).toHaveBeenCalledOnce() })
  })

  it('fails closed when the Host catalog is unavailable', () => {
    mount({ status: 'unavailable', value: ready().value })
    expect(screen.getByRole('alert').textContent).toContain('租户目录当前不可用')
  })

  it('locks every plugin settings function except update and tenant switching', () => {
    const snapshot: AwikiTenantScopeSnapshot = {
      ...ready(),
      updateStatus: 'ready',
      update: {
        tenantId: 'official-china',
        policyOrigin: 'https://awiki.me',
        tenantGeneration: 0,
        currentPluginVersion: '0.3.7',
        recommendedPluginVersion: '0.3.9',
        minimumPluginVersion: '0.3.8',
        offline: false,
        usedCache: false,
        policyUnavailable: false,
        restricted: true,
        modelProxyRestricted: false,
      },
    }

    mount(snapshot)

    expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['租户'])
    expect(screen.queryByText('添加自定义租户')).toBeNull()
    expect(screen.queryByRole('button', { name: '保存' })).toBeNull()
    expect(screen.queryByRole('button', { name: '归档' })).toBeNull()
    expect(screen.getAllByRole('button', { name: '切换' })).not.toHaveLength(0)
    expect(screen.getByText('dsh plugin --profile web add @awiki/dsh-plugin@0.3.9')).toBeTruthy()
    expect(screen.getByRole('button', { name: '检查更新' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '复制升级命令' })).toBeTruthy()
  })
})
