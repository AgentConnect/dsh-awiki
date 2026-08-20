// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AwikiOnboarding } from '../src/client/AwikiOnboarding.tsx'
import type { AwikiView } from '../src/client/controller.ts'
import type { ModelAvailabilityView } from '../src/client/model-availability-controller.ts'
import type { AwikiModelProxyView } from '../src/client/model-proxy-controller.ts'
import { zh, type AwikiSettingsKey } from '../src/client/settings-locales.ts'

afterEach(() => { cleanup() })

function translate(key: AwikiSettingsKey, params?: Record<string, unknown>): string {
  let value = zh[key]
  for (const [name, replacement] of Object.entries(params ?? {})) value = value.replace(`{${name}}`, String(replacement))
  return value
}

function identity(sessionStatus: AwikiView['sessionStatus']): AwikiView {
  return {
    status: 'ready', sessionStatus, identity: null, conversations: [], conversationsHasMore: false,
    selectedConversationId: null, messages: [], historyHasMore: false, pending: null, error: null,
    attachmentMaxBytes: 1024, summaries: {},
  }
}

function models(enabled = false): AwikiModelProxyView {
  return {
    status: 'ready', usage: [], usageLoading: false, pending: null, error: null,
    account: {
      enabled, recommended_model: 'deepseek-v4-flash', models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
      pending_recharge_order: null,
      account: {
        did: 'did:wba:alice.example', balance_cents: 0, balance: '0.00', currency: 'CNY',
        model_access_available: true, model_access_reason: null,
        billing_mode: 'development_bypass', payments_available: false,
      },
    },
  }
}

function availability(usable = false): ModelAvailabilityView {
  return { status: 'ready', usable, error: null }
}

function mount(
  identityView: AwikiView,
  modelView: AwikiModelProxyView,
  availabilityView: ModelAvailabilityView = availability(),
  rechargeEnabled = true,
  setEnabled = vi.fn(() => Promise.resolve()),
) {
  const identityController = {
    loadSession: vi.fn(() => Promise.resolve()), login: vi.fn(() => Promise.resolve()),
    sendRegistrationOtp: vi.fn(() => Promise.resolve({ ok: true, value: { retryAt: '', retryAfterSeconds: 1 } })),
    registerIdentity: vi.fn(() => Promise.resolve({ ok: true, value: {} })),
  }
  const availabilityController = { load: vi.fn(() => Promise.resolve()) }
  const modelController = { load: vi.fn(() => Promise.resolve()), setEnabled }
  const complete = vi.fn()
  const dismiss = vi.fn()
  const openSection = vi.fn()
  render(<AwikiOnboarding {...{
    t: translate,
    stepId: 'awiki-model-proxy', complete, dismiss, openSection,
    useAwikiOnboarding: <T,>(selector: (value: AwikiView) => T) => selector(identityView),
    useAwikiModelAvailability: <T,>(selector: (value: ModelAvailabilityView) => T) => selector(availabilityView),
    useAwikiModelProxy: <T,>(selector: (value: AwikiModelProxyView) => T) => selector(modelView),
    identity: identityController,
    availability: availabilityController,
    models: modelController,
    rechargeEnabled,
  } as never} />)
  return { identityController, availabilityController, modelController, complete, dismiss, openSection }
}

describe('AWiki-hosted DeepSeek onboarding', () => {
  it('stays hidden and fails open when the optional model-proxy package is absent', async () => {
    const unavailable: AwikiModelProxyView = {
      status: 'unavailable', account: null, usage: [], usageLoading: false,
      pending: null, error: 'model proxy channel is not installed',
    }
    const actions = mount(identity('active'), unavailable)

    await waitFor(() => { expect(actions.complete).toHaveBeenCalledOnce() })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(actions.modelController.setEnabled).not.toHaveBeenCalled()
  })

  it('offers registration before the API-key escape path', () => {
    const actions = mount(identity('unregistered'), models())
    expect(screen.getByRole('dialog', { name: '使用 AWiki 托管模型' })).toBeTruthy()
    expect(screen.getByText(/当前设备的 AWiki 身份/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '使用 API Key' }))
    expect(actions.complete).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: '稍后配置' }))
    expect(actions.dismiss).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: '关闭首次引导' }))
    expect(actions.dismiss).toHaveBeenCalledTimes(2)
  })

  it('restores an existing signed-out identity', () => {
    const actions = mount(identity('signed-out'), models())
    fireEvent.click(screen.getByRole('button', { name: '恢复身份' }))
    expect(actions.identityController.login).toHaveBeenCalledOnce()
  })

  it('requires explicit enable and keeps recharge unavailable non-blocking', () => {
    const actions = mount(identity('active'), models())
    expect(screen.getByText('开发环境暂未开放充值。')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '启用 AWiki 托管模型' }))
    expect(actions.modelController.setEnabled).toHaveBeenCalledWith(true)
    expect(actions.complete).not.toHaveBeenCalled()
  })

  it('handles a rejected enable action and displays the controller error beside the account', async () => {
    const setEnabled = vi.fn(() => Promise.reject(new Error('enable rpc failed')))
    const failed = { ...models(), error: '启用托管模型失败' }
    const actions = mount(identity('active'), failed, availability(), true, setEnabled)

    fireEvent.click(screen.getByRole('button', { name: '启用 AWiki 托管模型' }))

    await waitFor(() => { expect(actions.modelController.setEnabled).toHaveBeenCalledWith(true) })
    expect(screen.getByRole('alert').textContent).toBe('启用托管模型失败')
  })

  it('routes an insufficient-balance account to recharge without showing a disabled enable action', () => {
    const current = models()
    const strict: AwikiModelProxyView = {
      ...current,
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
    }
    const actions = mount(identity('active'), strict)

    expect(screen.getByText(/余额不足，需要先充值/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: '启用 AWiki 托管模型' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '前往充值' }))
    expect(actions.dismiss).toHaveBeenCalledOnce()
    expect(actions.openSection).toHaveBeenCalledWith('awiki')
  })

  it('shows the shared coming-soon notice without leaving onboarding when recharge is gated', () => {
    const current = models()
    const strict: AwikiModelProxyView = {
      ...current,
      account: {
        ...current.account!,
        pending_recharge_order: {
          out_trade_no: 'test-account-order', amount_cents: 100, status: 'pending', provider: 'tongqifu',
          payment_method: 'ALI_QR', created_at: '2026-08-18T00:00:00Z',
          payment_action: { type: 'qr_code', data: 'test-account-qr' },
        },
        account: {
          ...current.account!.account,
          billing_mode: 'strict',
          payments_available: true,
          model_access_available: false,
          model_access_reason: 'insufficient_balance',
        },
      },
    }
    const actions = mount(identity('active'), strict, availability(), false)

    expect(screen.queryByRole('button', { name: '继续支付' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '前往充值' }))
    expect(screen.getByRole('dialog', { name: '充值功能正在开通中' }).textContent).toContain('敬请期待')
    expect(actions.dismiss).not.toHaveBeenCalled()
    expect(actions.openSection).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '知道了' }))
    expect(screen.getByRole('dialog', { name: '启用 AWiki 托管模型' })).toBeTruthy()
  })

  it('dismisses onboarding before restoring a pending payment in account settings', () => {
    const current = models()
    const pending: AwikiModelProxyView = {
      ...current,
      account: {
        ...current.account!,
        account: {
          ...current.account!.account,
          billing_mode: 'strict',
          payments_available: true,
          model_access_available: false,
          model_access_reason: 'insufficient_balance',
        },
        pending_recharge_order: {
          out_trade_no: 'order-existing',
          amount_cents: 100,
          status: 'pending',
          provider: 'tongqifu',
          payment_method: 'ALI_QR',
          created_at: '2026-08-18T00:00:00Z',
          payment_action: { type: 'qr_code', data: 'qr-content' },
        },
      },
    }
    const actions = mount(identity('active'), pending)

    fireEvent.click(screen.getByRole('button', { name: '继续支付' }))
    expect(actions.dismiss).toHaveBeenCalledOnce()
    expect(actions.openSection).toHaveBeenCalledWith('awiki')
  })

  it('auto-completes only when AWiki-hosted DeepSeek was already enabled', async () => {
    const actions = mount(identity('active'), models(true))
    await waitFor(() => { expect(actions.complete).toHaveBeenCalledOnce() })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('stays out of a new session when another model provider is already usable', async () => {
    const current = models()
    const pending: AwikiModelProxyView = {
      ...current,
      account: {
        ...current.account!,
        pending_recharge_order: {
          out_trade_no: 'order-existing',
          amount_cents: 100,
          status: 'pending',
          provider: 'tongqifu',
          payment_method: 'ALI_QR',
          created_at: '2026-08-18T00:00:00Z',
          payment_action: { type: 'qr_code', data: 'qr-content' },
        },
      },
    }
    const actions = mount(identity('active'), pending, availability(true))

    await waitFor(() => { expect(actions.complete).toHaveBeenCalledOnce() })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(actions.modelController.load).not.toHaveBeenCalled()
  })

  it('waits for the provider check without painting or loading AWiki account state', () => {
    const actions = mount(identity('active'), models(), { status: 'loading', usable: true, error: null })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(actions.complete).not.toHaveBeenCalled()
    expect(actions.modelController.load).not.toHaveBeenCalled()
  })

  it('fails open when Harness model availability cannot be confirmed', async () => {
    const actions = mount(identity('active'), models(), { status: 'unavailable', usable: false, error: 'offline' })

    await waitFor(() => { expect(actions.complete).toHaveBeenCalledOnce() })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
