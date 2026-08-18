// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import QRCode from 'qrcode/lib/browser.js'
import type { SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { AwikiSettingsSection } from '../src/client/AwikiSettingsSection.tsx'
import type { AwikiModelProxyView } from '../src/client/model-proxy-controller.ts'
import { zh, type AwikiSettingsKey } from '../src/client/settings-locales.ts'
import type { AwikiSettings } from '../src/settings.ts'

vi.mock('qrcode/lib/browser.js', () => ({ default: { toDataURL: vi.fn(() => Promise.resolve('data:image/png;base64,fixture')) } }))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function translate(key: AwikiSettingsKey, params?: Record<string, unknown>): string {
  let value = zh[key]
  for (const [name, replacement] of Object.entries(params ?? {})) value = value.replace(`{${name}}`, String(replacement))
  return value
}

const settings: SettingsScopeSnapshot<AwikiSettings> = {
  status: 'ready', value: { domain: 'awiki.ai' }, base: { domain: 'awiki.ai' },
  revision: 0, writable: true, mode: 'host',
}

function account(overrides: Partial<AwikiModelProxyView> = {}): AwikiModelProxyView {
  return {
    status: 'ready', usage: [], usageLoading: false, pending: null, error: null,
    account: {
      enabled: false, recommended_model: 'deepseek-v4-flash',
      models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
      account: {
        did: 'did:wba:alice.example', balance_cents: 0, balance: '0.00', currency: 'CNY',
        model_access_available: true, billing_mode: 'development_bypass', payments_available: false,
      },
    },
    ...overrides,
  }
}

function mount(view: AwikiModelProxyView, overrides: Record<string, unknown> = {}) {
  const models = {
    load: vi.fn(() => Promise.resolve()),
    loadUsage: vi.fn(() => Promise.resolve()),
    setEnabled: vi.fn(() => Promise.resolve()),
    createRecharge: vi.fn(),
    rechargeStatus: vi.fn(() => new Promise(() => {})),
    ...overrides,
  }
  render(<AwikiSettingsSection {...{
    t: translate,
    useAwikiSettings: <T,>(selector: (value: SettingsScopeSnapshot<AwikiSettings>) => T) => selector(settings),
    useAwikiModelProxy: <T,>(selector: (value: AwikiModelProxyView) => T) => selector(view),
    models,
    saveDomain: () => Promise.resolve(), resetDomain: () => Promise.resolve(), clearLocalData: () => Promise.resolve(), close: () => {},
  } as never} />)
  return models
}

describe('AWiki-hosted DeepSeek account settings', () => {
  it('shows development access and allows explicit enable while recharge is disabled', async () => {
    const models = mount(account())
    expect(screen.getByText('开发环境暂未开放充值。')).toBeTruthy()
    expect(screen.getByText(/模型调用不会扣减账户余额/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '启用 AWiki 托管模型' }))
    await waitFor(() => { expect(models.setEnabled).toHaveBeenCalledWith(true) })
    expect(await screen.findByText(/默认模型为 DeepSeek V4 Flash/)).toBeTruthy()
  })

  it('opens redirect payments in the system-browser path without enabling models', async () => {
    const view = account({
      account: {
        ...account().account!,
        account: { ...account().account!.account, payments_available: true },
      },
    })
    const open = vi.spyOn(window, 'open').mockReturnValue(window)
    const models = mount(view, {
      createRecharge: vi.fn(() => Promise.resolve({
        out_trade_no: 'redirect-1', amount_cents: 100, status: 'pending', provider: 'tongqifu',
        payment_method: 'ALI_QR', payment_action: { type: 'redirect_url', data: 'https://pay.example/order/1' },
      })),
    })
    fireEvent.click(screen.getByRole('button', { name: '创建充值' }))
    await waitFor(() => { expect(open).toHaveBeenCalledWith('https://pay.example/order/1', '_blank', 'noopener,noreferrer') })
    expect(models.setEnabled).not.toHaveBeenCalled()
    expect(await screen.findByText(/不会自动启用或切换模型/)).toBeTruthy()
  })

  it('renders ALI_QR content as a QR image instead of navigating to the content', async () => {
    const view = account({
      account: {
        ...account().account!,
        account: { ...account().account!.account, payments_available: true },
      },
    })
    const open = vi.spyOn(window, 'open').mockReturnValue(window)
    mount(view, {
      createRecharge: vi.fn(() => Promise.resolve({
        out_trade_no: 'qr-1', amount_cents: 100, status: 'pending', provider: 'tongqifu',
        payment_method: 'ALI_QR', payment_action: { type: 'qr_code', data: 'alipay-qr-payload' },
      })),
    })
    fireEvent.click(screen.getByRole('button', { name: '创建充值' }))
    expect((await screen.findByAltText('支付宝充值二维码')).getAttribute('src')).toBe('data:image/png;base64,fixture')
    expect(QRCode.toDataURL).toHaveBeenCalledWith('alipay-qr-payload', expect.objectContaining({ width: 220 }))
    expect(open).not.toHaveBeenCalled()
  })

  it('shows token, calculated cost, and actual charge independently', async () => {
    const view = account({
      usage: [{
        id: 7, endpoint: '/v1/chat/completions', model: 'deepseek-v4-flash',
        cache_hit_tokens: 2, cache_miss_tokens: 3, completion_tokens: 5,
        billing_mode: 'development_bypass', calculated_cost_micros: 1234,
        charged_micros: 0, estimated: false, created_at: '2026-08-18T00:00:00Z',
      }],
    })
    const models = mount(view)
    fireEvent.click(screen.getByRole('tab', { name: '用量明细' }))
    expect(screen.getByText('10')).toBeTruthy()
    expect(screen.getByText('0.001234 CNY')).toBeTruthy()
    expect(screen.getByText('0.000000 CNY')).toBeTruthy()
    await waitFor(() => { expect(models.loadUsage).toHaveBeenCalled() })
  })
})
