import { useRecoveryOtpCooldown } from './otp-cooldown.ts'
import { useDraftState } from './drafts.tsx'
import { useEffect, useRef } from 'react'
import {
  IconCheckOutline16,
  IconLoadingOutline16,
  IconRefreshOutline16,
  IconUserOutline16,
  IconWarningOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  AwikiRecoveryOtpRequest,
  AwikiRecoveryOtpResult,
  AwikiRecoveryPrepareRequest,
  AwikiRecoveryProgress,
} from '@awiki/dsh-plugin/types'
import type { AwikiActionResult } from './controller.ts'
import { AwikiIdentityPage } from './AwikiIdentityPage.tsx'
import css from './AwikiOverlay.module.css'

export interface AwikiRecoveryActions {
  continueRecoveryForHandle?: (handle: string) => Promise<AwikiActionResult<boolean>>
  enterRecoveredSession?: () => Promise<AwikiActionResult<AwikiRecoveryProgress>>
  sendRecoveryOtp: (request: AwikiRecoveryOtpRequest) => Promise<AwikiActionResult<AwikiRecoveryOtpResult>>
  prepareRecovery: (request: Omit<AwikiRecoveryPrepareRequest, 'operationId'>) => Promise<AwikiActionResult<AwikiRecoveryProgress>>
  activateRecovery: () => Promise<AwikiActionResult<AwikiRecoveryProgress>>
  refreshRecoveryStatus: () => Promise<AwikiActionResult<AwikiRecoveryProgress>>
  resumeRecovery: () => Promise<AwikiActionResult<AwikiRecoveryProgress>>
  discardRecovery: () => Promise<AwikiActionResult>
}

export interface AwikiRecoveryFactorContext {
  readonly fullHandle: string
  readonly phone: string
}

function phaseLabel(phase: AwikiRecoveryProgress['phase']): string {
  switch (phase) {
    case 'awaiting_factor': return '等待验证码验证'
    case 'ready_to_commit': return '等待最终确认'
    case 'remote_outcome_unknown': return '远端结果待确认'
    case 'remote_committed': return '身份已在远端恢复'
    case 'identity_transition_pending': return '正在切换本机身份'
    case 'applied': return '身份恢复完成'
    case 'quarantined_key_unavailable': return '新身份凭证暂不可用'
  }
}

function canResume(progress: AwikiRecoveryProgress): boolean {
  return progress.allowedActions?.includes('resume') === true
}

function maskedPhone(value: string): string {
  const normalized = value.replace(/[\s()-]/g, '')
  if (normalized.length <= 7) return normalized
  return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`
}

function progressMessage(progress: AwikiRecoveryProgress): string {
  if (progress.failureCode === 'local_transition_superseded') return '此恢复操作已由更新的身份状态关闭。请返回身份入口重新检查当前身份。'
  switch (progress.phase) {
    case 'remote_outcome_unknown': return '恢复请求已经提交，正在确认服务端结果。请不要重新发起恢复。'
    case 'remote_committed': return '身份已在服务端恢复，正在为当前设备更新本机凭证。'
    case 'identity_transition_pending': return '身份已在服务端恢复，本机切换尚未完成。请继续完成本机切换。'
    case 'quarantined_key_unavailable': return '新的本机凭证暂时不可用，请稍后重新检查恢复结果。'
    case 'applied': return '身份已经恢复完成。'
    default: return '请根据当前状态继续操作，也可以返回入口稍后处理。'
  }
}

function RecoveryDiagnostics(props: { readonly operationId: string; readonly failureCode?: string }) {
  return (
    <details className={css.recoveryDiagnostics}>
      <summary>诊断信息</summary>
      <dl>
        <div><dt>恢复请求编号</dt><dd><code>{props.operationId}</code></dd></div>
        {props.failureCode !== undefined && <div><dt>状态代码</dt><dd><code>{props.failureCode}</code></dd></div>}
      </dl>
    </details>
  )
}

/** Status-first Handle recovery. Secret inputs stay in browser memory only. */
export function AwikiRecoveryForm(props: AwikiRecoveryActions & {
  readonly statusError?: string | null
  readonly requestError?: string | null
  readonly operationId: string | null
  readonly progress: AwikiRecoveryProgress | null
  readonly pending: boolean
  readonly onExit?: () => void
  readonly onExitLabel?: string
  readonly initialFactorContext?: AwikiRecoveryFactorContext
  readonly fixedHandle?: string
  readonly requestTitle?: string
  readonly requestDescription?: string
}) {
  const cooldown = useRecoveryOtpCooldown()
  const handle = useRef<HTMLInputElement>(null)
  const requestPhone = useRef<HTMLInputElement>(null)
  const factorPhone = useRef<HTMLInputElement>(null)
  const otp = useRef<HTMLInputElement>(null)
  const [handleDraft, setHandleDraft] = useDraftState('recovery:handle', props.fixedHandle ?? '')
  const targetHandle = props.progress?.fullHandle ?? props.fixedHandle ?? props.initialFactorContext?.fullHandle ?? handleDraft
  const initialContext = props.initialFactorContext?.fullHandle === targetHandle ? props.initialFactorContext : undefined
  const [phoneDraft, setPhoneDraft] = useDraftState(`recovery:${targetHandle}:phone`, initialContext?.phone ?? '')
  const [otpDraft, setOtpDraft] = useDraftState(`recovery:${props.operationId}:otp`, '')
  const [autoAttempt, setAutoAttempt] = useDraftState(`recovery:${props.operationId}:autoAttempt`, false, false)
  const [commitAttempted, setCommitAttempted] = useDraftState(`recovery:${props.operationId}:commitAttempted`, false, false)
  const [factorContext, setFactorContext] = useDraftState<{ readonly fullHandle: string; readonly phone: string } | null>(`recovery:${targetHandle}:factorContext`, null, false)
  const [notice, setNotice] = useDraftState<string | null>(`recovery:${props.operationId}:notice`, null, false)
  const [error, setError] = useDraftState<string | null>(`recovery:${props.operationId}:error`, null, false)
  const effectiveFactorContext = factorContext ?? initialContext ?? null

  useEffect(() => {
    setNotice(null)
    setError(null)
  }, [props.operationId])

  useEffect(() => {
    const progress = props.progress
    if (progress === null
      || !canResume(progress)
      || progress.phase === 'awaiting_factor'
      || progress.phase === 'ready_to_commit'
      || progress.phase === 'applied'
      || progress.phase === 'quarantined_key_unavailable'
      || props.pending
      || props.statusError
      || autoAttempt
      || error !== null) return
    const timer = setTimeout(() => {
      setAutoAttempt(true)
      void (canResume(progress) ? resume() : refresh())
    }, 900)
    return () => { clearTimeout(timer) }
  }, [error, props.pending, props.progress, props.statusError, autoAttempt])

  const sendOtp = async (fullHandle: string, phone: string) => {
    setError(null)
    const result = await props.sendRecoveryOtp({
      fullHandle,
      phone,
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    cooldown.start(result.value.retryAfterSeconds)
    setOtpDraft('')
    setFactorContext({ fullHandle: result.value.fullHandle, phone })
    setNotice('恢复验证码已发送。')
  }

  const requestOtp = async () => {
    const fullHandle = props.fixedHandle?.trim() ?? handleDraft.trim()
    const phone = phoneDraft.trim()
    const continued = await props.continueRecoveryForHandle?.(fullHandle)
    if (continued !== undefined && !continued.ok) return setError(continued.error)
    if (continued?.ok && continued.value) return
    await sendOtp(fullHandle, phone)
  }

  const resendOtp = async () => {
    if (props.progress?.allowedActions?.includes('request_otp') !== true || props.pending) return
    const fullHandle = effectiveFactorContext?.fullHandle ?? props.progress?.fullHandle
    if (fullHandle === undefined) return
    await sendOtp(fullHandle, effectiveFactorContext?.phone ?? phoneDraft.trim())
  }

  const prepare = async () => {
    if (props.progress?.allowedActions?.includes('prepare') !== true || props.pending) return
    setError(null)
    const result = await props.prepareRecovery({
      phone: effectiveFactorContext?.phone ?? phoneDraft.trim(),
      otp: otpDraft.trim(),
    })
    setOtpDraft('')
    if (!result.ok) {
      setError(result.error)
      return
    }
    setNotice(null)
  }

  const activate = async () => {
    if (props.progress?.allowedActions?.includes('activate') !== true || props.pending) return
    setCommitAttempted(true)
    setError(null)
    const result = await props.activateRecovery()
    if (!result.ok) {
      setError(result.error)
    }
  }

  const refresh = async () => {
    setError(null)
    const result = await props.refreshRecoveryStatus()
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (result.value.allowedActions?.includes('discard_pre_attempt')) setCommitAttempted(false)
  }

  const resume = async () => {
    setError(null)
    const result = await props.resumeRecovery()
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (result.value.allowedActions?.includes('discard_pre_attempt')) setCommitAttempted(false)
  }

  const discard = async () => {
    if (props.progress?.allowedActions?.includes('discard_pre_attempt') !== true || props.pending) return
    setError(null)
    const result = await props.discardRecovery()
    if (!result.ok) {
      setError(result.error)
      return
    }
    setHandleDraft('')
    setPhoneDraft('')
    setOtpDraft('')
    setFactorContext(null)
    props.onExit?.()
  }

  if (props.operationId === null) {
    return (
      <AwikiIdentityPage
        {...props.onExit === undefined ? {} : { onBack: props.onExit }}
        backLabel={props.onExitLabel ?? '返回身份入口'}
        backDisabled={false}
      >
        <form className={css.recoveryForm} onSubmit={(event) => { event.preventDefault(); void requestOtp() }}>
          <div className={css.registrationIcon}><IconUserOutline16 size={24} /></div>
          <h3>{props.requestTitle ?? '恢复已有身份'}</h3>
          <p>{props.requestDescription ?? '输入原来的完整 Handle 和绑定手机号，我们会发送验证码来确认身份归属。'}</p>
          {props.fixedHandle === undefined
            ? <label>完整 Handle<input ref={handle} value={handleDraft} onChange={event => { setHandleDraft(event.target.value) }} autoComplete="username" placeholder="例如 alice.awiki.info" autoFocus /></label>
            : (
                <div className={css.recoveryIdentitySummary}>
                  <span>当前身份</span><strong>{props.fixedHandle}</strong>
                </div>
              )}
          <label>绑定手机号<input ref={requestPhone} value={phoneDraft} onChange={event => { setPhoneDraft(event.target.value) }} type="tel" autoComplete="tel" autoFocus={props.fixedHandle !== undefined} /></label>
          <button type="submit" className={css.primary} disabled={props.pending || cooldown.seconds > 0 || phoneDraft.trim() === ''}>获取恢复验证码</button>
          {(error ?? props.requestError) && <small className={css.inlineError} role="alert">{error ?? props.requestError}</small>}
        </form>
      </AwikiIdentityPage>
    )
  }

  if (props.progress === null || props.statusError) {
    return <AwikiIdentityPage {...props.onExit === undefined ? {} : { onBack: props.onExit }} backLabel={props.onExitLabel ?? '返回身份入口'}><div className={css.recoveryForm}>
      <h3>确认上次恢复的进度</h3><p>请先确认恢复状态，无需重新发起恢复。</p>
      <p>恢复进度已保留。返回不会撤销已提交的恢复。</p>
      {(error ?? props.statusError) && <p role="alert">{error ?? props.statusError}</p>}
      <button type="button" className={css.primary} disabled={props.pending} onClick={() => { void refresh() }}>重新检查恢复结果</button>
    </div></AwikiIdentityPage>
  }

  if (props.progress.phase === 'awaiting_factor' || (props.progress.allowedActions?.includes('prepare') && !props.progress.allowedActions?.includes('activate'))) {
    return (
      <AwikiIdentityPage {...props.onExit === undefined ? {} : { onBack: props.onExit }} backLabel={props.onExitLabel ?? '返回身份入口'}>
        <form className={css.recoveryForm} onSubmit={(event) => { event.preventDefault(); void prepare() }}>
          <div className={css.recoveryStatusLine}><span>恢复请求已创建</span></div>
          <h3>验证身份归属</h3>
          <p>请填写收到的验证码。验证码过期时，可以重新获取。</p>
          <div className={css.recoveryIdentitySummary}>
            <span>恢复身份</span><strong>{effectiveFactorContext?.fullHandle ?? props.progress?.fullHandle ?? '待确认'}</strong>
            {effectiveFactorContext !== null && <><span>验证码已发送至</span><strong>{maskedPhone(effectiveFactorContext.phone)}</strong></>}
          </div>
          {effectiveFactorContext === null && (
            <label>绑定手机号<input ref={factorPhone} value={phoneDraft} onChange={event => { setPhoneDraft(event.target.value) }} type="tel" autoComplete="tel" autoFocus /></label>
          )}
          <label>恢复验证码<input ref={otp} value={otpDraft} onChange={event => { setOtpDraft(event.target.value) }} inputMode="numeric" autoComplete="one-time-code" autoFocus={effectiveFactorContext !== null} /></label>
          <button type="submit" className={css.primary} disabled={props.pending || !props.progress.allowedActions?.includes('prepare')}>验证恢复信息</button>
          {(effectiveFactorContext !== null || props.progress.fullHandle !== '') && (
            <button type="button" className={css.secondary} disabled={props.pending || !props.progress.allowedActions?.includes('request_otp') || cooldown.seconds > 0 || (effectiveFactorContext === null && phoneDraft.trim() === '')} onClick={() => { void resendOtp() }}>
              {cooldown.seconds > 0 ? `${cooldown.seconds} 秒后重新获取恢复验证码` : '重新获取恢复验证码'}
            </button>
          )}
          {notice !== null && <small className={css.notice} role="status">{notice}</small>}
          {error !== null && <small className={css.inlineError} role="alert">{error}</small>}
          {props.progress.allowedActions?.includes('discard_pre_attempt') && <button type="button" className={css.secondary} disabled={props.pending} onClick={() => { void discard() }}>取消恢复</button>}
          <RecoveryDiagnostics operationId={props.operationId} />
        </form>
      </AwikiIdentityPage>
    )
  }

  const progress = props.progress
  const preCommit = progress.phase === 'ready_to_commit' && progress.allowedActions?.includes('activate') === true && !commitAttempted
  return (
    <AwikiIdentityPage
      {...props.onExit === undefined ? {} : { onBack: props.onExit }}
      backLabel={props.onExitLabel ?? '返回身份入口'}
      live={preCommit ? 'off' : 'polite'}
    >
      <div className={css.recoveryForm}>
        <div className={css.recoveryStatusLine}><span>{phaseLabel(progress.phase)}</span></div>
        <h3>{preCommit ? '确认恢复已有身份' : '身份恢复进度'}</h3>
        <p className={css.recoveryHandle}>{progress.fullHandle}</p>
        <div className={css.recoveryImpact}>
          <p data-tone={progress.localOrdinaryDataWillMigrate ? 'success' : 'neutral'}>
            {progress.localOrdinaryDataWillMigrate ? <IconCheckOutline16 size={14} /> : <IconWarningOutline16 size={14} />}
            普通本地会话数据{progress.localOrdinaryDataWillMigrate ? '将迁移到恢复后的身份' : '不会迁移'}
          </p>
        </div>
        {preCommit ? (
          <>
            <p className={css.recoveryConfirmationCopy}>确认后，这台设备将使用新的本机凭证。请勿重复提交；返回入口不会撤销已提交的恢复。</p>
            <button type="button" className={css.primary} disabled={props.pending} onClick={() => { void activate() }}>确认并恢复身份</button>
          </>
        ) : (
          <div className={css.recoveryProgressPanel} aria-live="polite">
            {props.pending && <IconLoadingOutline16 size={18} />}
            <p>{progressMessage(progress)}</p>
            <p>恢复进度已保留，可以返回入口稍后继续。</p>
            {progress.phase === 'applied' && progress.allowedActions?.includes('activate_identity') && <button type="button" className={css.primary} disabled={props.pending} onClick={() => { void props.enterRecoveredSession?.().then(result => { if (!result.ok) setError(result.error) }) }}>进入 AWiki</button>}
            {progress.phase !== 'applied' && (
              <button type="button" className={css.primary} disabled={props.pending} onClick={() => { void (canResume(progress) ? resume() : refresh()) }}>
                <IconRefreshOutline16 size={14} />
                {canResume(progress) && (progress.phase === 'identity_transition_pending' || progress.phase === 'remote_committed')
                  ? '继续完成本机切换'
                  : '重新检查恢复结果'}
              </button>
            )}
          </div>
        )}
        {progress.allowedActions?.includes('discard_pre_attempt') && <button type="button" className={css.secondary} disabled={props.pending} onClick={() => { void discard() }}>取消恢复</button>}
        {error !== null && <small className={css.inlineError} role="alert">{error}</small>}
        <RecoveryDiagnostics
          operationId={progress.operationId}
          {...progress.failureCode === undefined ? {} : { failureCode: progress.failureCode }}
        />
      </div>
    </AwikiIdentityPage>
  )
}
