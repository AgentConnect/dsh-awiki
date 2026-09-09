// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AwikiUpdates } from '../src/client/AwikiUpdates.tsx'
import { zh, type AwikiSettingsKey } from '../src/client/settings-locales.ts'
import type { AwikiTenantScopeSnapshot } from '../src/client/settings-controller.ts'
import { decodeDesktopDistribution } from '../src/desktop-distribution.ts'

const t = (key: AwikiSettingsKey, params: Record<string, unknown> = {}) => Object.entries(params)
  .reduce((value, [name, replacement]) => value.replaceAll(`{${name}}`, String(replacement)), zh[key])
const snapshot = (): AwikiTenantScopeSnapshot => ({ status: 'ready', updateStatus: 'ready', value: {
  schemaVersion: 1, officialCatalogVersion: 1, activeTenantId: 'china', generation: 0, switching: false,
  tenants: [{ tenantId: 'china', storageScopeId: 'china', kind: 'built_in', displayName: '上海', backendBaseUrl: 'https://awiki.me', didHost: 'awiki.me', lifecycle: 'active', storageLayout: 'scope-v1' }],
}, update: { tenantId: 'china', tenantGeneration: 0, policyOrigin: 'https://awiki.me', currentPluginVersion: '0.3.7',
  offline: false, usedCache: false, policyUnavailable: false, restricted: false, modelProxyRestricted: false,
  checkState: 'ready', updateAvailable: true, upgradeCommand: 'dsh plugin add @awiki/dsh-plugin@0.3.9' } })
const desktop = { schemaVersion: 1 as const, distributionId: 'awiki-dsh-desktop' as const, currentVersion: '2.1.0-rc.7',
  channel: 'prerelease' as const, downloadPageUrl: 'https://awiki.me/downloads/dsh-awiki/', state: 'ready' as const,
  latestVersion: '2.1.0', updateAvailable: true, usedCache: false }
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
describe('manual update presentation', () => {
  it('keeps commands visible and reports copy success and failure', async () => {
    const writeText = vi.fn(async () => {})
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<AwikiUpdates t={t} snapshot={snapshot()} refreshUpdatePolicy={async () => {}} />)
    expect(screen.getByText('dsh plugin --profile YOUR_PROFILE add @awiki/dsh-plugin@0.3.9')).toBeTruthy()
    expect(screen.queryByText('DSH Desktop · AWiki')).toBeNull()
    fireEvent.click(screen.getByText('复制升级命令'))
    await screen.findByText('已复制升级命令。')
    expect(writeText).toHaveBeenCalledWith('dsh plugin --profile YOUR_PROFILE add @awiki/dsh-plugin@0.3.9')
    writeText.mockRejectedValueOnce(new Error('denied'))
    fireEvent.click(screen.getByText('复制升级命令'))
    await screen.findByText('复制失败，请选中上方命令手动复制。')
  })
  it('retains Desktop downloads when the tenant has no policy, and never fabricates a command', () => {
    const state = snapshot()
    const { upgradeCommand: _command, ...update } = state.update!
    render(<AwikiUpdates t={t} snapshot={{ ...state, desktop, update: { ...update, policyUnavailable: true, checkState: 'unavailable' } }} refreshUpdatePolicy={async () => {}} />)
    expect(screen.getByText('当前服务暂未提供更新信息。')).toBeTruthy()
    expect(screen.queryByText('复制升级命令')).toBeNull()
    expect(screen.getByRole('link', { name: '前往桌面版下载页面' }).getAttribute('href')).toBe(desktop.downloadPageUrl)
  })
  it('clears tenant copy feedback during switching and preserves the desktop card', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined })
    const state = snapshot()
    const view = render(<AwikiUpdates t={t} snapshot={{ ...state, desktop }} refreshUpdatePolicy={async () => {}} />)
    fireEvent.click(screen.getByText('复制升级命令'))
    await waitFor(() => expect(screen.getByText('复制失败，请选中上方命令手动复制。')).toBeTruthy())
    view.rerender(<AwikiUpdates t={t} snapshot={{ ...state, desktop, update: undefined, value: { ...state.value, switching: true, generation: 1 } }} refreshUpdatePolicy={async () => {}} />)
    expect(screen.queryByText('复制升级命令')).toBeNull()
    expect(screen.getByRole('link', { name: '前往桌面版下载页面' })).toBeTruthy()
  })
  it('rejects foreign distributions and unsafe download URLs', () => {
    expect(decodeDesktopDistribution({ ...desktop, distributionId: 'other-desktop' })).toBeUndefined()
    expect(decodeDesktopDistribution({ ...desktop, downloadPageUrl: 'javascript:alert(1)' })).toBeUndefined()
  })
})
