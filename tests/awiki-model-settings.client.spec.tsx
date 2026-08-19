// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import QRCode from 'qrcode/lib/browser.js'
import type { SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { AwikiSettingsSection } from '../src/client/AwikiSettingsSection.tsx'
import type { AwikiView } from '../src/client/controller.ts'
import type { AwikiModelProxyView } from '../src/client/model-proxy-controller.ts'
import { zh, type AwikiSettingsKey } from '../src/client/settings-locales.ts'
import type { AwikiSettings } from '../src/settings.ts'
import { identity as registeredIdentity } from './helpers.client.ts'

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
      pending_recharge_order: null,
      account: {
        did: 'did:wba:alice.example', balance_cents: 0, balance: '0.00', currency: 'CNY',
        model_access_available: true, model_access_reason: null,
        billing_mode: 'development_bypass', payments_available: false,
      },
    },
    ...overrides,
  }
}

function session(sessionStatus: AwikiView['sessionStatus'] = 'active'): AwikiView {
  return {
    status: 'ready', sessionStatus,
    identity: sessionStatus === 'active' ? registeredIdentity : null,
    conversations: [], conversationsHasMore: false, selectedConversationId: null,
    messages: [], historyHasMore: false, pending: null, error: null,
    attachmentMaxBytes: 1024, summaries: {},
  }
}

function mount(
  view: AwikiModelProxyView,
  overrides: Record<string, unknown> = {},
  identityView: AwikiView = session(),
  rechargeEnabled = true,
) {
  const models = {
    load: vi.fn(() => Promise.resolve()),
    loadUsage: vi.fn(() => Promise.resolve()),
    setEnabled: vi.fn(() => Promise.resolve()),
    createRecharge: vi.fn(),
    rechargeStatus: vi.fn(() => new Promise(() => {})),
    closeRecharge: vi.fn(),
    ...overrides,
  }
  const identity = {
    loadSession: vi.fn(() => Promise.resolve()),
    login: vi.fn(() => Promise.resolve({ ok: true, value: { status: 'active', identity: registeredIdentity } })),
  }
  render(<AwikiSettingsSection {...{
    t: translate,
    useAwikiSettings: <T,>(selector: (value: SettingsScopeSnapshot<AwikiSettings>) => T) => selector(settings),
    useAwikiModelProxy: <T,>(selector: (value: AwikiModelProxyView) => T) => selector(view),
    useAwikiSession: <T,>(selector: (value: AwikiView) => T) => selector(identityView),
    models, identity, rechargeEnabled,
    saveDomain: () => Promise.resolve(), resetDomain: () => Promise.resolve(), clearLocalData: () => Promise.resolve(), close: () => {},
  } as never} />)
  return { models, identity }
}

describe('AWiki-hosted DeepSeek account settings', () => {
  it('shows development access and allows explicit enable while recharge is disabled', async () => {
    const { models } = mount(account())
    expect(screen.getByText('开发环境暂未开放充值。')).toBeTruthy()
    expect(screen.getByText(/模型调用不会扣减账户余额/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '启用 AWiki 托管模型' }))
    await waitFor(() => { expect(models.setEnabled).toHaveBeenCalledWith(true) })
    expect(await screen.findByText(/默认模型为 DeepSeek V4 Flash/)).toBeTruthy()
  })

  it('hides production billing mode and makes recharge the next action when balance is insufficient', () => {
    const current = account()
    const strict = account({
      account: {
        ...current.account!,
        account: {
          ...current.account!.account,
          billing_mode: 'strict',
          payments_available: true,
          model_access_available: false,
          model_access_reason: 'insufficient_balance',
        },
      },
    })
    mount(strict)

    expect(screen.queryByText('计费模式')).toBeNull()
    expect(screen.queryByText('正式计费')).toBeNull()
    expect(screen.getByText('余额不足')).toBeTruthy()
    expect(screen.getByRole('button', { name: '创建充值' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '启用 AWiki 托管模型' })).toBeNull()
  })

  it('keeps recharge visible but shows a coming-soon notice without creating an order', () => {
    const current = account()
    const strict = account({
      account: {
        ...current.account!,
        account: {
          ...current.account!.account,
          billing_mode: 'strict',
          payments_available: true,
          model_access_available: false,
          model_access_reason: 'insufficient_balance',
        },
      },
    })
    const { models } = mount(strict, {}, session(), false)

    fireEvent.change(screen.getByLabelText('充值金额（元）'), { target: { value: '25.00' } })
    fireEvent.click(screen.getByRole('button', { name: '创建充值' }))

    const dialog = screen.getByRole('dialog', { name: '充值功能正在开通中' })
    expect(dialog.textContent).toContain('暂时无法创建充值订单，敬请期待')
    expect(models.createRecharge).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '知道了' }))
    expect(screen.queryByRole('dialog', { name: '充值功能正在开通中' })).toBeNull()
    expect(screen.getByDisplayValue('25.00')).toBeTruthy()
  })

  it('does not expose a retained payment action while the client recharge gate is closed', () => {
    const pendingOrder = {
      out_trade_no: 'test-account-order', amount_cents: 100, status: 'pending' as const, provider: 'tongqifu',
      payment_method: 'ALI_QR', created_at: '2026-08-18T00:00:00Z',
      payment_action: { type: 'qr_code' as const, data: 'test-account-qr' },
    }
    const current = account()
    const view = account({
      account: {
        ...current.account!,
        account: { ...current.account!.account, payments_available: true },
        pending_recharge_order: pendingOrder,
      },
    })
    const { models } = mount(view, {}, session(), false)

    expect(screen.queryByAltText('支付宝充值二维码')).toBeNull()
    expect(screen.queryByRole('button', { name: '继续支付' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '创建充值' }))
    expect(screen.getByRole('dialog', { name: '充值功能正在开通中' })).toBeTruthy()
    expect(models.rechargeStatus).not.toHaveBeenCalled()
  })

  it('opens redirect payments in the system-browser path without enabling models', async () => {
    const view = account({
      account: {
        ...account().account!,
        account: { ...account().account!.account, payments_available: true },
      },
    })
    const open = vi.spyOn(window, 'open').mockReturnValue(window)
    const { models } = mount(view, {
      createRecharge: vi.fn(() => Promise.resolve({
        out_trade_no: 'redirect-1', amount_cents: 100, status: 'pending', provider: 'tongqifu',
        payment_method: 'ALI_QR', created_at: '2026-08-18T00:00:00Z',
        payment_action: { type: 'redirect_url', data: 'https://pay.example/order/1' },
      })),
    })
    fireEvent.click(screen.getByRole('button', { name: '创建充值' }))
    await waitFor(() => { expect(open).toHaveBeenCalledWith('https://pay.example/order/1', '_blank', 'noopener,noreferrer') })
    expect(models.setEnabled).not.toHaveBeenCalled()
    expect(await screen.findByText(/不会自动启用或切换模型/)).toBeTruthy()
  })

  it('renders ALI_QR content as a QR image instead of navigating to the content', async () => {
    const pendingOrder = {
      out_trade_no: 'qr-1', amount_cents: 100, status: 'pending' as const, provider: 'tongqifu',
      payment_method: 'ALI_QR', created_at: '2026-08-18T00:00:00Z',
      payment_action: { type: 'qr_code' as const, data: 'alipay-qr-payload' },
    }
    const current = account()
    const view = account({
      account: {
        ...current.account!,
        account: {
          ...current.account!.account,
          billing_mode: 'strict',
          payments_available: true,
          model_access_available: false,
          model_access_reason: 'insufficient_balance',
        },
        pending_recharge_order: pendingOrder,
      },
    })
    const open = vi.spyOn(window, 'open').mockReturnValue(window)
    const { models } = mount(view, { rechargeStatus: vi.fn(() => Promise.resolve(pendingOrder)) })
    expect((await screen.findByAltText('支付宝充值二维码')).getAttribute('src')).toBe('data:image/png;base64,fixture')
    expect(QRCode.toDataURL).toHaveBeenCalledWith('alipay-qr-payload', expect.objectContaining({ width: 220 }))
    expect(screen.queryByRole('button', { name: '创建充值' })).toBeNull()
    expect(screen.getByRole('button', { name: '取消并修改金额' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '刷新支付状态' }))
    await waitFor(() => { expect(models.rechargeStatus).toHaveBeenCalledWith('qr-1') })
    expect(open).not.toHaveBeenCalled()
  })

  it('requires confirmation before cancelling a pending order and never creates a replacement', async () => {
    const pendingOrder = {
      out_trade_no: 'qr-cancel', amount_cents: 325, status: 'pending' as const, provider: 'tongqifu',
      payment_method: 'ALI_QR', created_at: '2026-08-18T00:00:00Z',
      payment_action: { type: 'qr_code' as const, data: 'alipay-qr-payload' },
    }
    const current = account()
    const view = account({
      account: {
        ...current.account!,
        account: { ...current.account!.account, payments_available: true },
        pending_recharge_order: pendingOrder,
      },
    })
    const closeRecharge = vi.fn(() => Promise.resolve('closed' as const))
    const { models } = mount(view, { closeRecharge })

    fireEvent.click(screen.getByRole('button', { name: '取消并修改金额' }))
    const dialog = screen.getByRole('dialog', { name: '取消当前充值订单？' })
    expect(dialog.textContent).toContain('3.25 CNY')
    expect(dialog.textContent).toContain('二维码将立即失效')
    fireEvent.click(screen.getByText('取消'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(closeRecharge).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '取消并修改金额' }))
    fireEvent.click(screen.getByRole('button', { name: '确认取消' }))
    await waitFor(() => { expect(closeRecharge).toHaveBeenCalledWith('qr-cancel') })
    expect(models.createRecharge).not.toHaveBeenCalled()
    expect(models.setEnabled).not.toHaveBeenCalled()
    expect(await screen.findByText('订单已取消，现在可以修改充值金额。')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('keeps the current payment action when cancelling fails', async () => {
    const pendingOrder = {
      out_trade_no: 'qr-failed', amount_cents: 100, status: 'pending' as const, provider: 'tongqifu',
      payment_method: 'ALI_QR', created_at: '2026-08-18T00:00:00Z',
      payment_action: { type: 'qr_code' as const, data: 'alipay-qr-payload' },
    }
    const current = account()
    const view = account({
      account: {
        ...current.account!,
        account: { ...current.account!.account, payments_available: true },
        pending_recharge_order: pendingOrder,
      },
    })
    mount(view, { closeRecharge: vi.fn(() => Promise.reject(new Error('payment_order_close_failed'))) })

    fireEvent.click(screen.getByRole('button', { name: '取消并修改金额' }))
    fireEvent.click(screen.getByRole('button', { name: '确认取消' }))

    expect(await screen.findByText('未能取消充值订单，当前支付入口仍然有效。')).toBeTruthy()
    expect(screen.getByRole('dialog', { name: '取消当前充值订单？' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '刷新支付状态' })).toBeTruthy()
    expect(await screen.findByAltText('支付宝充值二维码')).toBeTruthy()
  })

  it('reports payment instead of cancellation when payment wins the race', async () => {
    const pendingOrder = {
      out_trade_no: 'qr-paid', amount_cents: 100, status: 'pending' as const, provider: 'tongqifu',
      payment_method: 'ALI_QR', created_at: '2026-08-18T00:00:00Z',
    }
    const current = account()
    const view = account({
      account: {
        ...current.account!,
        account: { ...current.account!.account, payments_available: true },
        pending_recharge_order: pendingOrder,
      },
    })
    mount(view, { closeRecharge: vi.fn(() => Promise.resolve('paid' as const)) })

    fireEvent.click(screen.getByRole('button', { name: '取消并修改金额' }))
    fireEvent.click(screen.getByRole('button', { name: '确认取消' }))

    expect(await screen.findByText('充值已到账。是否启用 AWiki 托管模型仍由你决定。')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('disables payment actions while an order cancellation is in progress', async () => {
    const pendingOrder = {
      out_trade_no: 'qr-closing', amount_cents: 100, status: 'pending' as const, provider: 'tongqifu',
      payment_method: 'ALI_QR', created_at: '2026-08-18T00:00:00Z',
    }
    const current = account()
    mount(account({
      pending: 'close-recharge',
      account: {
        ...current.account!,
        account: { ...current.account!.account, payments_available: true },
        pending_recharge_order: pendingOrder,
      },
    }))

    expect((screen.getByRole('button', { name: '刷新支付状态' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '取消并修改金额' }) as HTMLButtonElement).disabled).toBe(true)
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
    const { models } = mount(view)
    fireEvent.click(screen.getByRole('tab', { name: '用量明细' }))
    expect(screen.getByText('10')).toBeTruthy()
    expect(screen.getByText('0.001234 CNY')).toBeTruthy()
    expect(screen.getByText('0.000000 CNY')).toBeTruthy()
    await waitFor(() => { expect(models.loadUsage).toHaveBeenCalled() })
  })

  it('hides cached account and usage after sign-out and restores only the retained local identity', async () => {
    const cached = account({
      usage: [{
        id: 7, endpoint: '/v1/chat/completions', model: 'deepseek-v4-flash',
        cache_hit_tokens: 2, cache_miss_tokens: 3, completion_tokens: 5,
        billing_mode: 'strict', calculated_cost_micros: 1234,
        charged_micros: 1234, estimated: false, created_at: '2026-08-18T00:00:00Z',
      }],
    })
    const { models, identity } = mount(cached, {}, session('signed-out'))

    expect(screen.queryByText('0.00 CNY')).toBeNull()
    expect(screen.getByText(/当前 AWiki 身份已退出/)).toBeTruthy()
    fireEvent.click(screen.getByRole('tab', { name: '用量明细' }))
    expect(screen.queryByText('deepseek-v4-flash')).toBeNull()
    expect(models.loadUsage).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '恢复身份' }))
    await waitFor(() => { expect(identity.login).toHaveBeenCalledOnce() })
  })
})
