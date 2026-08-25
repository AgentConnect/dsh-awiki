/** Model Proxy account, recharge, and usage settings contributed to DSH settings. */

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import QRCode from 'qrcode/lib/browser.js'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { AwikiController, AwikiView } from '@awiki/dsh-plugin/client'
import type { AwikiModelProxyUsage } from '@awiki/dsh-plugin/model-proxy-contract'
import type { AwikiModelProxyController, AwikiModelProxyView } from './model-proxy-controller.ts'
import { RechargeComingSoonDialog } from './RechargeComingSoonDialog.tsx'
import css from './ModelProxySettingsSection.module.css'

/** Browser actions and reactive Host-owned state. */
export interface ModelProxySettingsInjected {
  hooks: {
    /** Sanitized loopback model account state. */
    awikiModelProxy: AwikiModelProxyController
    /** Shared AWiki identity and sign-in state. */
    awikiSession: AwikiController
  }
  /** Shared identity actions; private keys remain Host-owned. */
  identity: AwikiController
  /** Host-only model account actions; credentials never enter this face. */
  models: AwikiModelProxyController
  /** Client release gate for creating recharge orders. */
  rechargeEnabled: boolean
}

/** Full composed settings-section props. */
export type ModelProxySettingsSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.awiki-model-proxy'>
  & InjectFace<ModelProxySettingsInjected>

type Tab = 'account' | 'usage'
type Message = { readonly kind: 'saved' | 'error'; readonly text: string }

/** Render Model Proxy account, recharge, model state, and usage controls. */
export function ModelProxySettingsSection(props: ModelProxySettingsSectionProps): ReactNode {
  const { t, useAwikiModelProxy, useAwikiSession } = props
  const models = useAwikiModelProxy((value: AwikiModelProxyView) => value)
  const identity = useAwikiSession((value: AwikiView) => value)
  const [tab, setTab] = useState<Tab>('account')
  const sessionActive = identity.status === 'ready'
    && identity.sessionStatus === 'active'
    && identity.identity !== null

  useEffect(() => {
    if (identity.status === 'cold') void props.identity.loadSession()
  }, [identity.status, props.identity])

  useEffect(() => {
    if (sessionActive) void props.models.load()
  }, [props.models, sessionActive])

  useEffect(() => {
    if (sessionActive && tab === 'usage' && models.status === 'ready') void props.models.loadUsage()
  }, [models.status, props.models, sessionActive, tab])

  return (
    <section className={css.section}>
      <div className={css.heading}>
        <h2 className={css.title}>{t('nav')}</h2>
        <p className={css.intro}>{t('intro')}</p>
      </div>
      <div className={css.tabs} role="tablist" aria-label={t('nav')}>
        <TabButton active={tab === 'account'} onClick={() => { setTab('account') }}>{t('tabAccount')}</TabButton>
        <TabButton active={tab === 'usage'} onClick={() => { setTab('usage') }}>{t('tabUsage')}</TabButton>
      </div>
      {tab === 'account' && (sessionActive
        ? <AccountPanel {...props} view={models} />
        : <IdentityRequiredPanel {...props} view={identity} />)}
      {tab === 'usage' && (sessionActive
        ? <UsagePanel {...props} view={models} />
        : <IdentityRequiredPanel {...props} view={identity} />)}
    </section>
  )
}

function IdentityRequiredPanel(props: ModelProxySettingsSectionProps & { readonly view: AwikiView }): ReactNode {
  const { t, view } = props
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (view.status === 'cold' || view.status === 'loading') {
    return <p className={css.status}>{t('identityLoading')}</p>
  }
  if (view.status === 'error') {
    return <p className={`${css.notice} ${css.error}`} role="alert">{view.error ?? t('onboardingIdentityUnavailable')}</p>
  }

  const restore = async (): Promise<void> => {
    setPending(true)
    setError(null)
    const result = await props.identity.login()
    if (!result.ok) setError(result.error)
    setPending(false)
  }

  return (
    <div className={css.panel} role="tabpanel">
      <p className={css.notice}>
        {view.sessionStatus === 'recovery-required'
          ? t('identityRecoveryRequired')
          : view.sessionStatus === 'signed-out'
            ? t('identitySignedOutRequired')
            : t('identityRegistrationRequired')}
      </p>
      {view.sessionStatus === 'signed-out' && (
        <div className={css.actions}>
          <Button type="button" disabled={pending} onClick={() => { void restore() }}>
            {pending ? t('identityRestoring') : t('onboardingRestore')}
          </Button>
        </div>
      )}
      {error !== null && <p className={`${css.status} ${css.error}`} role="alert">{error}</p>}
    </div>
  )
}

function TabButton(props: { readonly active: boolean; readonly onClick: () => void; readonly children: ReactNode }): ReactNode {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={props.active}
      className={`${css.tab} ${props.active ? css.tabActive : ''}`}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  )
}

function AccountPanel(props: ModelProxySettingsSectionProps & { readonly view: AwikiModelProxyView }): ReactNode {
  const { t, view } = props
  const account = view.account?.account
  const [amount, setAmount] = useState('1.00')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [refreshingPayment, setRefreshingPayment] = useState(false)
  const [cancelRechargeOpen, setCancelRechargeOpen] = useState(false)
  const [rechargeComingSoonOpen, setRechargeComingSoonOpen] = useState(false)
  const [focusRechargeAmount, setFocusRechargeAmount] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const amountInput = useRef<HTMLInputElement>(null)
  const order = props.rechargeEnabled ? view.account?.pending_recharge_order ?? null : null
  const cancellingRecharge = view.pending === 'close-recharge'
  const paymentBusy = refreshingPayment || view.pending !== null

  useEffect(() => {
    let stopped = false
    setQrDataUrl(null)
    if (order?.status !== 'pending' || order.payment_action?.type !== 'qr_code') return
    void QRCode.toDataURL(order.payment_action.data, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#111111ff', light: '#ffffffff' },
    }).then((value) => {
      if (!stopped) setQrDataUrl(value)
    }).catch(() => {
      if (!stopped) setMessage({ kind: 'error', text: t('paymentQrFailed') })
    })
    return () => { stopped = true }
  }, [order?.out_trade_no, order?.payment_action?.data, order?.payment_action?.type, order?.status, t])

  useEffect(() => {
    if (order?.status !== 'pending') return
    let stopped = false
    let polling = false
    const poll = async (): Promise<void> => {
      if (polling) return
      polling = true
      try {
        const current = await props.models.rechargeStatus(order.out_trade_no)
        if (stopped) return
        if (current.status === 'paid') setMessage({ kind: 'saved', text: t('rechargePaid') })
        if (current.status === 'closed') setMessage({ kind: 'error', text: t('rechargeClosed') })
      } catch (error) {
        if (!stopped) setMessage({ kind: 'error', text: displayError(error, t('rechargeStatusFailed')) })
      } finally {
        polling = false
      }
    }
    const timer = window.setInterval(() => { void poll() }, 2_000)
    return () => { stopped = true; window.clearInterval(timer) }
  }, [order?.out_trade_no, order?.status, props.models, t])

  useEffect(() => {
    if (order !== null) return
    setCancelRechargeOpen(false)
    if (!focusRechargeAmount) return
    amountInput.current?.focus()
    amountInput.current?.select()
    setFocusRechargeAmount(false)
  }, [focusRechargeAmount, order])

  const setEnabled = async (enabled: boolean): Promise<void> => {
    setMessage(null)
    try {
      await props.models.setEnabled(enabled)
      setMessage({ kind: 'saved', text: enabled ? t('modelsEnabled') : t('modelsDisabled') })
    } catch (error) {
      setMessage({ kind: 'error', text: displayError(error, t('modelActionFailed')) })
    }
  }

  const createRecharge = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    if (!props.rechargeEnabled) {
      setMessage(null)
      setRechargeComingSoonOpen(true)
      return
    }
    const cents = parseAmountCents(amount)
    if (cents === undefined) {
      setMessage({ kind: 'error', text: t('invalidRechargeAmount') })
      return
    }
    setMessage(null)
    try {
      const created = await props.models.createRecharge(cents)
      if (created.payment_action?.type === 'redirect_url') {
        if (!openPaymentUrl(created.payment_action.data)) throw new Error(t('paymentWindowFailed'))
      }
      setMessage({ kind: 'saved', text: t('rechargeCreated') })
    } catch (error) {
      setMessage({ kind: 'error', text: displayError(error, t('rechargeFailed')) })
    }
  }

  const refreshPayment = async (): Promise<void> => {
    if (order === null || refreshingPayment) return
    setRefreshingPayment(true)
    setMessage(null)
    try {
      const current = await props.models.rechargeStatus(order.out_trade_no)
      if (current.status === 'paid') setMessage({ kind: 'saved', text: t('rechargePaid') })
      if (current.status === 'closed') setMessage({ kind: 'error', text: t('rechargeClosed') })
    } catch (error) {
      setMessage({ kind: 'error', text: displayError(error, t('rechargeStatusFailed')) })
    } finally {
      setRefreshingPayment(false)
    }
  }

  const continuePayment = (): void => {
    if (order?.payment_action?.type !== 'redirect_url'
      || !openPaymentUrl(order.payment_action.data)) {
      setMessage({ kind: 'error', text: t('paymentWindowFailed') })
    }
  }

  const closeCancelRecharge = (): void => {
    if (!cancellingRecharge) setCancelRechargeOpen(false)
  }

  const cancelRecharge = async (): Promise<void> => {
    if (order === null || cancellingRecharge) return
    const amountCents = order.amount_cents
    setMessage(null)
    try {
      const outcome = await props.models.closeRecharge(order.out_trade_no)
      setCancelRechargeOpen(false)
      if (outcome === 'paid') {
        setMessage({ kind: 'saved', text: t('rechargePaid') })
        return
      }
      setAmount((amountCents / 100).toFixed(2))
      setFocusRechargeAmount(true)
      setMessage({ kind: 'saved', text: t('rechargeCancelled') })
    } catch {
      setMessage({ kind: 'error', text: t('rechargeCancelFailed') })
    }
  }

  if ((view.status === 'idle' || view.status === 'loading') && account === undefined) {
    return <p className={css.status}>{t('modelAccountLoading')}</p>
  }
  if (view.status === 'unavailable' || account === undefined) {
    return <p className={`${css.notice} ${css.error}`} role="alert">{view.error ?? t('modelAccountUnavailable')}</p>
  }

  return (
    <div className={css.panel} role="tabpanel">
      <dl className={`${css.accountSummary} ${account.billing_mode === 'development_bypass' ? css.accountSummaryDevelopment : ''}`}>
        <div><dt>{t('accountBalance')}</dt><dd>{account.balance} {account.currency}</dd></div>
        <div>
          <dt>{t('modelStatus')}</dt>
          <dd className={css.modelControl}>
            <span className={`${css.modelState} ${view.account?.enabled ? css.modelStateEnabled : css.modelStateDisabled}`}>
              {view.account?.enabled ? t('statusEnabled') : t('statusDisabled')}
            </span>
            {(account.model_access_available || view.account?.enabled === true) && (
              <Button
                type="button"
                className={`${css.modelAction} ${view.account?.enabled ? css.modelActionDisable : css.modelActionEnable}`}
                {...view.account?.enabled ? { variant: 'outline' as const } : {}}
                disabled={view.pending !== null || view.status === 'loading'}
                onClick={() => { void setEnabled(view.account?.enabled !== true) }}
              >
                {view.pending === 'enable'
                  ? t('enablingModels')
                  : view.pending === 'disable'
                    ? t('disablingModels')
                    : view.account?.enabled ? t('disableModels') : t('enableModels')}
              </Button>
            )}
          </dd>
        </div>
        {account.billing_mode === 'development_bypass' && <div><dt>{t('billingMode')}</dt><dd>{t('billingBypass')}</dd></div>}
      </dl>
      <p className={css.modelSourceNotice}>{t('modelSourceNotice')}</p>
      {account.billing_mode === 'development_bypass' && <p className={`${css.notice} ${css.developmentNotice}`}>{t('billingBypassNotice')}</p>}
      {!account.model_access_available && (
        <div className={`${css.notice} ${css.accessNotice}`} role="status">
          <strong>{account.model_access_reason === 'insufficient_balance' ? t('insufficientBalanceTitle') : t('modelAccessUnavailableTitle')}</strong>
          <span>{account.model_access_reason === 'insufficient_balance' ? t('insufficientBalanceDescription') : t('modelAccessUnavailable')}</span>
        </div>
      )}
      {order !== null ? (
        <section className={css.paymentPanel} aria-labelledby="awiki-pending-recharge-title">
          <div className={css.paymentHeader}>
            <div>
              <h3 id="awiki-pending-recharge-title">{t('pendingRechargeTitle')}</h3>
              <p>{t('pendingRechargeDescription', { amount: formatCents(order.amount_cents) })}</p>
            </div>
            <span className={css.paymentStatus}>{t('orderPending')}</span>
          </div>
          {qrDataUrl !== null && (
            <div className={css.qrPayment}>
              <img src={qrDataUrl} width="220" height="220" alt={t('paymentQrAlt')} />
              <p>{t('paymentQrHint')}</p>
            </div>
          )}
          <div className={css.actions}>
            {order.payment_action?.type === 'redirect_url' && (
              <Button type="button" disabled={paymentBusy} onClick={continuePayment}>{t('continuePayment')}</Button>
            )}
            <Button
              type="button"
              {...order.payment_action?.type === 'redirect_url' ? { variant: 'outline' as const } : {}}
              disabled={paymentBusy}
              onClick={() => { void refreshPayment() }}
            >
              {refreshingPayment ? t('refreshingPaymentStatus') : t('refreshPaymentStatus')}
            </Button>
            <Button type="button" variant="outline" disabled={paymentBusy} onClick={() => { setMessage(null); setCancelRechargeOpen(true) }}>
              {t('changeRechargeAmount')}
            </Button>
          </div>
          <p className={css.orderStatus}>{t('pendingRechargeLimit')}</p>
        </section>
      ) : props.rechargeEnabled && !account.payments_available ? (
        <p className={css.notice}>{t('paymentsUnavailable')}</p>
      ) : (
        <form className={css.recharge} onSubmit={(event) => { void createRecharge(event) }}>
          <label className={css.label} htmlFor="awiki-recharge-amount">{t('rechargeAmount')}</label>
          <div className={css.rechargeRow}>
            <input
              id="awiki-recharge-amount"
              ref={amountInput}
              className={css.input}
              value={amount}
              disabled={view.pending !== null}
              inputMode="decimal"
              autoComplete="off"
              onChange={(event) => { setAmount(event.target.value); setMessage(null) }}
            />
            <Button type="submit" {...account.model_access_available ? { variant: 'outline' as const } : {}} disabled={view.pending !== null || view.status === 'loading'}>
              {view.pending === 'recharge' ? t('creatingRecharge') : t('createRecharge')}
            </Button>
          </div>
        </form>
      )}
      <p className={`${css.status} ${message?.kind === 'error' ? css.error : ''}`} role={message?.kind === 'error' ? 'alert' : 'status'}>
        {message?.text ?? view.error ?? ''}
      </p>
      <Modal
        open={cancelRechargeOpen && order !== null}
        onClose={closeCancelRecharge}
        title={t('cancelRechargeDialogTitle')}
        closeLabel={t('cancel')}
        description={t('cancelRechargeDialogDescription', { amount: formatCents(order?.amount_cents ?? 0) })}
        className={`${css.clearDialog ?? ''} ${css.compactModal ?? ''}`}
        contentClassName={css.compactModalContent ?? ''}
        footer={<>
          <Button type="button" variant="outline" disabled={cancellingRecharge} onClick={closeCancelRecharge}>{t('cancel')}</Button>
          <Button type="button" variant="outline" className={css.cancelRechargeConfirm} disabled={cancellingRecharge} onClick={() => { void cancelRecharge() }}>
            {cancellingRecharge ? t('cancellingRecharge') : t('confirmCancelRecharge')}
          </Button>
        </>}
      >
        <p className={css.cancelRechargeWarning}>{t('cancelRechargeWarning')}</p>
      </Modal>
      <RechargeComingSoonDialog
        open={rechargeComingSoonOpen}
        onClose={() => { setRechargeComingSoonOpen(false) }}
        t={t}
      />
    </div>
  )
}

function UsagePanel(props: ModelProxySettingsSectionProps & { readonly view: AwikiModelProxyView }): ReactNode {
  const { t, view } = props
  if (view.status === 'idle' || view.status === 'loading' || view.usageLoading) {
    return <p className={css.status}>{t('usageLoading')}</p>
  }
  if (view.status === 'unavailable') {
    return <p className={`${css.notice} ${css.error}`} role="alert">{view.error ?? t('modelAccountUnavailable')}</p>
  }
  return (
    <div className={css.panel} role="tabpanel">
      <div className={css.panelHeader}>
        <p className={css.description}>{view.account?.account.billing_mode === 'development_bypass' ? t('usageDescriptionBypass') : t('usageDescription')}</p>
        <Button type="button" variant="outline" disabled={view.usageLoading} onClick={() => { void props.models.loadUsage() }}>
          {t('reloadUsage')}
        </Button>
      </div>
      {view.usage.length === 0 ? <p className={css.notice}>{t('usageEmpty')}</p> : (
        <div className={css.usageList}>
          {view.usage.map(item => <UsageRow key={item.id} item={item} t={t} />)}
        </div>
      )}
      {view.error !== null && <p className={`${css.status} ${css.error}`} role="alert">{view.error}</p>}
    </div>
  )
}

function UsageRow({ item, t }: {
  readonly item: AwikiModelProxyUsage
  readonly t: ModelProxySettingsSectionProps['t']
}): ReactNode {
  const tokens = item.cache_hit_tokens + item.cache_miss_tokens + item.completion_tokens
  return (
    <article className={css.usageRow}>
      <div className={css.usageMain}>
        <strong>{item.model}</strong>
        <span>{formatDate(item.created_at)}</span>
      </div>
      <dl className={css.usageMetrics}>
        <div><dt>{t('usageTokens')}</dt><dd>{tokens.toLocaleString()}</dd></div>
        <div><dt>{t('usageCalculated')}</dt><dd>{item.calculated_cost_micros === null ? t('usageNoPrice') : formatMicros(item.calculated_cost_micros)}</dd></div>
        <div><dt>{t('usageCharged')}</dt><dd>{formatMicros(item.charged_micros)}</dd></div>
      </dl>
    </article>
  )
}

function parseAmountCents(value: string): number | undefined {
  const normalized = value.trim()
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/u.test(normalized)) return undefined
  const [yuan = '0', decimal = ''] = normalized.split('.')
  const cents = Number(yuan) * 100 + Number(decimal.padEnd(2, '0'))
  return Number.isSafeInteger(cents) && cents > 0 ? cents : undefined
}

function openPaymentUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return false
    return window.open(url.toString(), '_blank', 'noopener,noreferrer') !== null
  } catch { return false }
}

function formatMicros(value: number): string {
  return `${(value / 1_000_000).toFixed(6)} CNY`
}

function formatCents(value: number): string {
  return `${(value / 100).toFixed(2)} CNY`
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function displayError(error: unknown, fallback: string): string {
  return error instanceof Error && error.message !== '' ? error.message : fallback
}

export { openPaymentUrl, parseAmountCents }
