// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useSyncExternalStore } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AwikiOnboarding } from '../src/client/AwikiOnboarding.tsx'
import {
  AWIKI_MODEL_PROXY_RPC_CHANNEL,
  AWIKI_MODEL_PROXY_RPC_ENDPOINTS,
} from '../../../src/model-proxy-contract.ts'
import type { AwikiView } from '../../../src/client/controller.ts'
import type { ModelAvailabilityView } from '../src/client/model-availability-controller.ts'
import { AwikiModelProxyController, type AwikiModelProxyView } from '../src/client/model-proxy-controller.ts'
import { zh, type ModelProxySettingsKey } from '../src/client/settings-locales.ts'
import { identity as registeredIdentity } from '../../../tests/helpers.client.ts'
import { AwikiIdentityAccess } from '../../../src/client/AwikiIdentityAccess.tsx'

afterEach(() => { cleanup() })

function translate(key: ModelProxySettingsKey, params?: Record<string, unknown>): string {
  let value = zh[key]
  for (const [name, replacement] of Object.entries(params ?? {})) value = value.replace(`{${name}}`, String(replacement))
  return value
}

function identity(sessionStatus: AwikiView['sessionStatus']): AwikiView {
  return {
    status: 'ready', sessionStatus,
    identity: sessionStatus === 'active' || sessionStatus === 'recovery-required' ? registeredIdentity : null,
    conversations: [], conversationsHasMore: false,
    profile: null, selectedConversationId: null, selectedGroup: null, groupAccess: null, groupMembers: [], groupMembersHasMore: false,
    groupRecovery: null, messages: [], historyHasMore: false, pending: null, error: null,
    attachmentMaxBytes: 1024, summaries: {}, recoveryOperationId: null, recoveryProgress: null,
    localPending: false, refreshing: false,
  }
}

function models(enabled = false): AwikiModelProxyView {
  return {
    capability: 'available', status: 'ready', usage: [], usageLoading: false, pending: null, error: null,
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
  modelControllerOverride?: Pick<AwikiModelProxyController, 'getSnapshot' | 'subscribe' | 'load' | 'setEnabled'>,
) {
  const identityController = {
    loadSession: vi.fn(() => Promise.resolve()), login: vi.fn(() => Promise.resolve({ ok: true, value: { status: 'active' } })),
    inspectIdentityAccess: vi.fn(() => Promise.resolve({ ok: true, value: { status: 'available', fullHandle: 'alice.awiki.info' } })),
    sendRegistrationOtp: vi.fn(() => Promise.resolve({ ok: true, value: { retryAt: '', retryAfterSeconds: 1 } })),
    registerIdentity: vi.fn(() => Promise.resolve({ ok: true, value: {} })),
    clearLocalData: vi.fn(() => Promise.resolve({ ok: true, value: { cleared: true } })),
    sendRecoveryOtp: vi.fn(() => Promise.resolve({ ok: true, value: { operationId: 'recovery-1' } })),
    prepareRecovery: vi.fn(() => Promise.resolve({ ok: true, value: {} })),
    activateRecovery: vi.fn(() => Promise.resolve({ ok: true, value: {} })),
    refreshRecoveryStatus: vi.fn(() => Promise.resolve({ ok: true, value: {} })),
    resumeRecovery: vi.fn(() => Promise.resolve({ ok: true, value: {} })),
    discardRecovery: vi.fn(() => Promise.resolve({ ok: true, value: undefined })),
  }
  const availabilityController = { load: vi.fn(() => Promise.resolve()) }
  const modelController = modelControllerOverride ?? {
    load: vi.fn(() => Promise.resolve()),
    setEnabled: vi.fn(() => Promise.resolve()),
  }
  const subscribeModel = modelControllerOverride?.subscribe ?? (() => () => {})
  const getModelSnapshot = modelControllerOverride?.getSnapshot ?? (() => modelView)
  const complete = vi.fn()
  const dismiss = vi.fn()
  const openSection = vi.fn()
  render(<AwikiOnboarding {...{
    t: translate,
    stepId: 'awiki-model-proxy', complete, dismiss, openSection,
    useAwikiOnboarding: <T,>(selector: (value: AwikiView) => T) => selector(identityView),
    useAwikiModelAvailability: <T,>(selector: (value: ModelAvailabilityView) => T) => selector(availabilityView),
    useAwikiModelProxy: <T,>(selector: (value: AwikiModelProxyView) => T) => useSyncExternalStore(
      subscribeModel,
      () => selector(getModelSnapshot()),
    ),
    identity: identityController,
    IdentityAccess: AwikiIdentityAccess,
    clearLocalIdentity: vi.fn(() => Promise.resolve()),
    availability: availabilityController,
    models: modelController,
    rechargeEnabled,
  } as never} />)
  return { identityController, availabilityController, modelController, complete, dismiss, openSection }
}

describe('AWiki-hosted DeepSeek onboarding', () => {
  it('stays hidden and fails open when the optional model-proxy package is absent', async () => {
    const unavailable: AwikiModelProxyView = {
      capability: 'unavailable', status: 'unavailable', account: null, usage: [], usageLoading: false,
      pending: null, error: 'model proxy channel is not installed',
    }
    const actions = mount(identity('active'), unavailable)

    await waitFor(() => { expect(actions.complete).toHaveBeenCalledOnce() })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(actions.modelController.setEnabled).not.toHaveBeenCalled()
  })

  it('never paints model onboarding when the Host capability is absent before identity registration', async () => {
    const unavailable: AwikiModelProxyView = {
      capability: 'unavailable', status: 'unavailable', account: null, usage: [], usageLoading: false,
      pending: null, error: null,
    }
    const actions = mount(identity('unregistered'), unavailable)

    await waitFor(() => { expect(actions.complete).toHaveBeenCalledOnce() })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(actions.identityController.loadSession).not.toHaveBeenCalled()
    expect(actions.modelController.load).not.toHaveBeenCalled()
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
    fireEvent.click(screen.getByRole('button', { name: '重新进入本机身份' }))
    expect(actions.identityController.login).toHaveBeenCalledOnce()
  })

  it('labels a revoked credential as recovery-required instead of signed out or unregistered', () => {
    const actions = mount(identity('recovery-required'), models())

    expect(screen.getByRole('dialog', { name: '需要重新恢复 AWiki 身份' })).toBeTruthy()
    expect(screen.getByText(/旧身份凭证已失效/)).toBeTruthy()
    expect(screen.getByRole('heading', { name: '需要重新恢复身份' })).toBeTruthy()
    expect(screen.getByText(registeredIdentity.handle)).toBeTruthy()
    expect(screen.queryByLabelText('完整 Handle')).toBeNull()
    expect(actions.identityController.login).not.toHaveBeenCalled()
  })

  it('requires explicit enable and keeps recharge unavailable non-blocking', () => {
    const actions = mount(identity('active'), models())
    expect(screen.getByText('开发环境暂未开放充值。')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '启用' }))
    expect(actions.modelController.setEnabled).toHaveBeenCalledWith(true)
    expect(actions.complete).not.toHaveBeenCalled()
  })

  it('handles a rejected enable action and displays the controller error beside the account', async () => {
    const identityView = identity('active')
    const identitySource = {
      getSnapshot: () => identityView,
      subscribe: vi.fn(() => () => {}),
    }
    const rpcCall = vi.fn(async (_channel: string, endpoint: string) => {
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.capability) {
        return { ok: true as const, value: { available: true, protocol: 1 } }
      }
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.status) {
        return { ok: true as const, value: models().account }
      }
      if (endpoint === AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled) {
        return {
          ok: false as const,
          error: { code: 'internal' as const, message: 'enable rpc failed', details: {} },
        }
      }
      throw new Error(`unexpected endpoint: ${endpoint}`)
    })
    const controller = new AwikiModelProxyController(
      { isLoopback: true, rpc: { call: rpcCall } } as never,
      identitySource as never,
    )
    await controller.load()
    const actions = mount(identityView, controller.getSnapshot(), availability(), true, controller)

    const enable = screen.getByRole('button', { name: '启用' })
    await waitFor(() => { expect((enable as HTMLButtonElement).disabled).toBe(false) })
    fireEvent.click(enable)

    await waitFor(() => { expect(screen.getByRole('alert').textContent).toBe('enable rpc failed') })
    expect(controller.getSnapshot()).toMatchObject({ pending: null, error: 'enable rpc failed' })
    expect(rpcCall).toHaveBeenCalledWith(
      AWIKI_MODEL_PROXY_RPC_CHANNEL,
      AWIKI_MODEL_PROXY_RPC_ENDPOINTS.setEnabled,
      { enabled: true },
      expect.any(AbortSignal),
    )
    expect(actions.complete).not.toHaveBeenCalled()
    controller.dispose()
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
    expect(screen.queryByRole('button', { name: '启用' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '前往充值' }))
    expect(actions.dismiss).toHaveBeenCalledOnce()
    expect(actions.openSection).toHaveBeenCalledWith('awiki-model-proxy')
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
    expect(actions.openSection).toHaveBeenCalledWith('awiki-model-proxy')
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
