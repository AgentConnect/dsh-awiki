/** AWiki account, usage, and advanced settings contributed to DSH settings. */

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import QRCode from 'qrcode/lib/browser.js'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  AWIKI_DOMAIN_FIELD,
  DEFAULT_AWIKI_DOMAIN,
  normalizeAwikiDomain,
} from '../domain.ts'
import type { AwikiModelProxyUsage } from '../model-proxy-contract.ts'
import type { AwikiSettings } from '../settings.ts'
import type { AwikiController, AwikiView } from './controller.ts'
import type { AwikiModelProxyController, AwikiModelProxyView } from './model-proxy-controller.ts'
import css from './AwikiSettingsSection.module.css'

/** Browser actions and reactive Host-owned state. */
export interface AwikiSettingsInjected {
  hooks: {
    /** Host-backed AWiki settings namespace. */
    awikiSettings: SettingsScope<AwikiSettings>
    /** Sanitized loopback model account state. */
    awikiModelProxy: AwikiModelProxyController
    /** Shared AWiki identity and sign-in state. */
    awikiSession: AwikiController
  }
  /** Shared identity actions; private keys remain Host-owned. */
  identity: AwikiController
  /** Host-only model account actions; credentials never enter this face. */
  models: AwikiModelProxyController
  /** Persist a normalized domain. */
  saveDomain: (domain: string) => Promise<void>
  /** Remove the user override and restore the composition default. */
  resetDomain: () => Promise<void>
  /** Permanently remove the Host installation's local AWiki state. */
  clearLocalData: () => Promise<void>
}

/** Full composed settings-section props. */
export type AwikiSettingsSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.awiki'>
  & InjectFace<AwikiSettingsInjected>

type Tab = 'account' | 'usage' | 'advanced'
type Message = { readonly kind: 'saved' | 'error'; readonly text: string }

function hasDomainOverride(snapshot: SettingsScopeSnapshot<AwikiSettings>): boolean {
  return typeof snapshot.user === 'object'
    && snapshot.user !== null
    && !Array.isArray(snapshot.user)
    && Object.hasOwn(snapshot.user, AWIKI_DOMAIN_FIELD)
}

/** Render account controls, usage visibility, and existing advanced settings. */
export function AwikiSettingsSection(props: AwikiSettingsSectionProps): ReactNode {
  const { t, useAwikiSettings, useAwikiModelProxy, useAwikiSession } = props
  const settings = useAwikiSettings(value => value)
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
        <TabButton active={tab === 'advanced'} onClick={() => { setTab('advanced') }}>{t('tabAdvanced')}</TabButton>
      </div>
      {tab === 'account' && (sessionActive
        ? <AccountPanel {...props} view={models} />
        : <IdentityRequiredPanel {...props} view={identity} />)}
      {tab === 'usage' && (sessionActive
        ? <UsagePanel {...props} view={models} />
        : <IdentityRequiredPanel {...props} view={identity} />)}
      {tab === 'advanced' && <AdvancedPanel {...props} settings={settings} />}
    </section>
  )
}

function IdentityRequiredPanel(props: AwikiSettingsSectionProps & { readonly view: AwikiView }): ReactNode {
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
        {view.sessionStatus === 'signed-out' ? t('identitySignedOutRequired') : t('identityRegistrationRequired')}
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

function AccountPanel(props: AwikiSettingsSectionProps & { readonly view: AwikiModelProxyView }): ReactNode {
  const { t, view } = props
  const account = view.account?.account
  const [amount, setAmount] = useState('1.00')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [refreshingPayment, setRefreshingPayment] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const order = view.account?.pending_recharge_order ?? null

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
        <div><dt>{t('modelStatus')}</dt><dd>{view.account?.enabled ? t('statusEnabled') : t('statusDisabled')}</dd></div>
        {account.billing_mode === 'development_bypass' && <div><dt>{t('billingMode')}</dt><dd>{t('billingBypass')}</dd></div>}
      </dl>
      {account.billing_mode === 'development_bypass' && <p className={`${css.notice} ${css.developmentNotice}`}>{t('billingBypassNotice')}</p>}
      {!account.model_access_available && (
        <div className={`${css.notice} ${css.accessNotice}`} role="status">
          <strong>{account.model_access_reason === 'insufficient_balance' ? t('insufficientBalanceTitle') : t('modelAccessUnavailableTitle')}</strong>
          <span>{account.model_access_reason === 'insufficient_balance' ? t('insufficientBalanceDescription') : t('modelAccessUnavailable')}</span>
        </div>
      )}
      {account.model_access_available && (
        <div className={css.actions}>
          <Button
            type="button"
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
              <Button type="button" disabled={refreshingPayment} onClick={continuePayment}>{t('continuePayment')}</Button>
            )}
            <Button type="button" variant="outline" disabled={refreshingPayment} onClick={() => { void refreshPayment() }}>
              {refreshingPayment ? t('refreshingPaymentStatus') : t('refreshPaymentStatus')}
            </Button>
          </div>
          <p className={css.orderStatus}>{t('pendingRechargeLimit')}</p>
        </section>
      ) : !account.payments_available ? (
        <p className={css.notice}>{t('paymentsUnavailable')}</p>
      ) : (
        <form className={css.recharge} onSubmit={(event) => { void createRecharge(event) }}>
          <label className={css.label} htmlFor="awiki-recharge-amount">{t('rechargeAmount')}</label>
          <div className={css.rechargeRow}>
            <input
              id="awiki-recharge-amount"
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
    </div>
  )
}

function UsagePanel(props: AwikiSettingsSectionProps & { readonly view: AwikiModelProxyView }): ReactNode {
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
  readonly t: AwikiSettingsSectionProps['t']
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

function AdvancedPanel(props: AwikiSettingsSectionProps & { readonly settings: SettingsScopeSnapshot<AwikiSettings> }): ReactNode {
  const { t, settings } = props
  const current = settings.value?.domain ?? DEFAULT_AWIKI_DOMAIN
  const overridden = hasDomainOverride(settings)
  const [draft, setDraft] = useState(current)
  const [edited, setEdited] = useState(false)
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<Message | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [clearDraft, setClearDraft] = useState('')
  const [clearing, setClearing] = useState(false)
  const [clearStatus, setClearStatus] = useState<Message | null>(null)

  useEffect(() => {
    if (!edited) setDraft(current)
  }, [current, edited])

  if (settings.status === 'loading') return <p className={css.status}>{t('loading')}</p>
  const unavailable = settings.status !== 'ready' || settings.mode !== 'host'
  const disabled = unavailable || !settings.writable || pending

  const save = async (event?: FormEvent): Promise<void> => {
    event?.preventDefault()
    let normalized: string
    try { normalized = normalizeAwikiDomain(draft) } catch {
      setStatus({ kind: 'error', text: t('invalidDomain') })
      return
    }
    setPending(true)
    setStatus(null)
    try {
      await props.saveDomain(normalized)
      setDraft(normalized)
      setEdited(false)
      setStatus({ kind: 'saved', text: `${t('saved')} ${t('restartNotice')}` })
    } catch { setStatus({ kind: 'error', text: t('saveFailed') }) } finally { setPending(false) }
  }

  const reset = async (): Promise<void> => {
    setPending(true)
    setStatus(null)
    try {
      await props.resetDomain()
      setEdited(false)
      setStatus({ kind: 'saved', text: `${t('saved')} ${t('restartNotice')}` })
    } catch { setStatus({ kind: 'error', text: t('saveFailed') }) } finally { setPending(false) }
  }

  const closeClear = (): void => {
    if (clearing) return
    setClearOpen(false)
    setClearDraft('')
  }

  const clearLocalData = async (): Promise<void> => {
    if (clearDraft !== t('clearConfirmationPhrase')) return
    setClearing(true)
    setClearStatus(null)
    try {
      await props.clearLocalData()
      setClearOpen(false)
      setClearDraft('')
      setClearStatus({ kind: 'saved', text: t('clearSucceeded') })
    } catch { setClearStatus({ kind: 'error', text: t('clearFailed') }) } finally { setClearing(false) }
  }

  return (
    <div className={css.panel} role="tabpanel">
      <form className={css.card} onSubmit={(event) => { void save(event) }}>
        <label className={css.label} htmlFor="awiki-default-domain">{t('domainLabel')}</label>
        <p className={css.description}>{t('domainDescription')}</p>
        <input
          id="awiki-default-domain"
          className={css.input}
          value={draft}
          disabled={disabled}
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          inputMode="url"
          placeholder={DEFAULT_AWIKI_DOMAIN}
          onChange={(event) => { setDraft(event.target.value); setEdited(true); setStatus(null) }}
        />
        <p className={css.defaultValue}>{t('defaultValue', { domain: DEFAULT_AWIKI_DOMAIN })}</p>
        <div className={css.actions}>
          <Button type="submit" disabled={disabled || !edited || draft.trim() === ''}>{pending ? t('saving') : t('save')}</Button>
          <Button type="button" variant="outline" disabled={disabled || !overridden} onClick={() => { void reset() }}>{t('reset')}</Button>
        </div>
        {unavailable
          ? <p className={`${css.status} ${css.error}`} role="alert">{t('unavailable')}</p>
          : !settings.writable
            ? <p className={`${css.status} ${css.error}`} role="alert">{t('readOnly')}</p>
            : <p className={`${css.status} ${status?.kind === 'error' ? css.error : ''}`} role="status">{status?.text ?? ''}</p>}
      </form>
      <p className={css.notice}>{t('identityNotice')}</p>
      <section className={css.dangerZone} aria-labelledby="awiki-danger-zone-title">
        <div className={css.dangerCopy}>
          <h3 id="awiki-danger-zone-title" className={css.dangerTitle}>{t('dangerTitle')}</h3>
          <p className={css.dangerDescription}>{t('dangerDescription')}</p>
        </div>
        <Button type="button" variant="outline" className={css.dangerButton} disabled={unavailable || clearing} onClick={() => { setClearStatus(null); setClearOpen(true) }}>
          {t('clearLocalData')}
        </Button>
        {clearStatus?.kind === 'saved' && <p className={css.status} role="status">{clearStatus.text}</p>}
      </section>
      <Modal
        open={clearOpen}
        onClose={closeClear}
        title={t('clearDialogTitle')}
        closeLabel={t('cancel')}
        description={t('clearDialogDescription')}
        className={css.clearDialog ?? ''}
        footer={<>
          <Button type="button" variant="outline" disabled={clearing} onClick={closeClear}>{t('cancel')}</Button>
          <Button type="button" variant="outline" className={css.clearConfirmButton} disabled={clearing || clearDraft !== t('clearConfirmationPhrase')} onClick={() => { void clearLocalData() }}>
            {clearing ? t('clearing') : t('clearConfirm')}
          </Button>
        </>}
      >
        <div className={css.clearWarning}><p>{t('clearScope')}</p><p>{t('clearRemoteNotice')}</p></div>
        <label className={css.confirmLabel} htmlFor="awiki-clear-confirmation">{t('clearConfirmationLabel', { phrase: t('clearConfirmationPhrase') })}</label>
        <input id="awiki-clear-confirmation" className={css.input} value={clearDraft} disabled={clearing} autoComplete="off" spellCheck={false} autoFocus onChange={(event) => { setClearDraft(event.target.value) }} />
        {clearStatus?.kind === 'error' && <p className={`${css.status} ${css.error}`} role="alert">{clearStatus.text}</p>}
      </Modal>
    </div>
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

export { hasDomainOverride, openPaymentUrl, parseAmountCents }
