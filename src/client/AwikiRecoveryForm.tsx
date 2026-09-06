import { useEffect, useRef, useState } from 'react'
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
  return progress.retryable || ['remote_outcome_unknown', 'remote_committed', 'identity_transition_pending'].includes(progress.phase)
}

function maskedPhone(value: string): string {
  const normalized = value.replace(/[\s()-]/g, '')
  if (normalized.length <= 7) return normalized
  return `${normalized.slice(0, 3)}****${normalized.slice(-4)}`
}

function progressMessage(progress: AwikiRecoveryProgress): string {
  switch (progress.phase) {
    case 'remote_outcome_unknown': return '恢复请求已经提交，正在确认服务端结果。请不要重新发起恢复。'
    case 'remote_committed': return '身份已在服务端恢复，正在为当前设备更新本机凭证。'
    case 'identity_transition_pending': return '身份已在服务端恢复，本机切换尚未完成。请继续完成本机切换。'
    case 'quarantined_key_unavailable': return '新的本机凭证暂时不可用，请稍后重新检查恢复结果。'
    case 'applied': return '身份已经恢复完成。'
    default: return '正在处理身份恢复，请保持窗口打开。'
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

/** Status-first Handle recovery. Secret inputs remain inside the mounted form only. */
export function AwikiRecoveryForm(props: AwikiRecoveryActions & {
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
  const handle = useRef<HTMLInputElement>(null)
  const requestPhone = useRef<HTMLInputElement>(null)
  const factorPhone = useRef<HTMLInputElement>(null)
  const otp = useRef<HTMLInputElement>(null)
  const [commitAttempted, setCommitAttempted] = useState(false)
  const [factorContext, setFactorContext] = useState<{ readonly fullHandle: string; readonly phone: string } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const effectiveFactorContext = factorContext ?? props.initialFactorContext ?? null

  useEffect(() => {
    setCommitAttempted(false)
    setNotice(null)
    setError(null)
  }, [props.operationId])

  useEffect(() => {
    const progress = props.progress
    if (progress === null
      || progress.phase === 'awaiting_factor'
      || progress.phase === 'ready_to_commit'
      || progress.phase === 'applied'
      || progress.phase === 'quarantined_key_unavailable'
      || props.pending
      || error !== null) return
    const timer = setTimeout(() => {
      void (canResume(progress) ? resume() : refresh())
    }, 900)
    return () => { clearTimeout(timer) }
  }, [error, props.pending, props.progress])

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
    setFactorContext({ fullHandle: result.value.fullHandle, phone })
    setNotice('恢复验证码已发送。')
  }

  const requestOtp = async () => {
    const fullHandle = props.fixedHandle?.trim() ?? handle.current?.value.trim() ?? ''
    const phone = requestPhone.current?.value.trim() ?? ''
    await sendOtp(fullHandle, phone)
  }

  const resendOtp = async () => {
    if (effectiveFactorContext === null) return
    await sendOtp(effectiveFactorContext.fullHandle, effectiveFactorContext.phone)
  }

  const prepare = async () => {
    setError(null)
    const result = await props.prepareRecovery({
      phone: effectiveFactorContext?.phone ?? factorPhone.current?.value.trim() ?? '',
      otp: otp.current?.value.trim() ?? '',
    })
    if (factorPhone.current !== null) factorPhone.current.value = ''
    if (otp.current !== null) otp.current.value = ''
    if (!result.ok) {
      setError(result.error)
      return
    }
    setNotice(null)
  }

  const activate = async () => {
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
    if (result.value.phase === 'ready_to_commit') setCommitAttempted(false)
  }

  const resume = async () => {
    setError(null)
    const result = await props.resumeRecovery()
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (result.value.phase === 'ready_to_commit') setCommitAttempted(false)
  }

  const discard = async () => {
    setError(null)
    const result = await props.discardRecovery()
    if (!result.ok) {
      setError(result.error)
      return
    }
    props.onExit?.()
  }

  if (props.operationId === null) {
    return (
      <AwikiIdentityPage
        {...props.onExit === undefined ? {} : { onBack: props.onExit }}
        backLabel={props.onExitLabel ?? '返回本机身份'}
        backDisabled={props.pending}
      >
        <form className={css.recoveryForm} onSubmit={(event) => { event.preventDefault(); void requestOtp() }}>
          <div className={css.registrationIcon}><IconUserOutline16 size={24} /></div>
          <h3>{props.requestTitle ?? '恢复已有身份'}</h3>
          <p>{props.requestDescription ?? '输入原来的完整 Handle 和绑定手机号，我们会发送验证码来确认身份归属。'}</p>
          {props.fixedHandle === undefined
            ? <label>完整 Handle<input ref={handle} autoComplete="username" placeholder="例如 alice.awiki.info" autoFocus /></label>
            : (
                <div className={css.recoveryIdentitySummary}>
                  <span>当前身份</span><strong>{props.fixedHandle}</strong>
                </div>
              )}
          <label>绑定手机号<input ref={requestPhone} type="tel" autoComplete="tel" autoFocus={props.fixedHandle !== undefined} /></label>
          <button type="submit" className={css.primary} disabled={props.pending}>获取恢复验证码</button>
          {error !== null && <small className={css.inlineError} role="alert">{error}</small>}
        </form>
      </AwikiIdentityPage>
    )
  }

  if (props.progress === null || props.progress.phase === 'awaiting_factor') {
    return (
      <AwikiIdentityPage onBack={() => { void discard() }} backLabel="取消恢复" backDisabled={props.pending || commitAttempted}>
        <form className={css.recoveryForm} onSubmit={(event) => { event.preventDefault(); void prepare() }}>
          <div className={css.recoveryStatusLine}><span>恢复请求已创建</span></div>
          <h3>验证身份归属</h3>
          <p>验证码已发送，请完成验证后再确认是否恢复。</p>
          <div className={css.recoveryIdentitySummary}>
            <span>恢复身份</span><strong>{effectiveFactorContext?.fullHandle ?? props.progress?.fullHandle ?? '待确认'}</strong>
            {effectiveFactorContext !== null && <><span>验证码已发送至</span><strong>{maskedPhone(effectiveFactorContext.phone)}</strong></>}
          </div>
          {effectiveFactorContext === null && (
            <label>绑定手机号<input ref={factorPhone} type="tel" autoComplete="tel" autoFocus /></label>
          )}
          <label>恢复验证码<input ref={otp} inputMode="numeric" autoComplete="one-time-code" autoFocus={effectiveFactorContext !== null} /></label>
          <button type="submit" className={css.primary} disabled={props.pending}>验证恢复信息</button>
          {effectiveFactorContext !== null && (
            <button type="button" className={css.secondary} disabled={props.pending} onClick={() => { void resendOtp() }}>
              重新获取恢复验证码
            </button>
          )}
          {notice !== null && <small className={css.notice} role="status">{notice}</small>}
          {error !== null && <small className={css.inlineError} role="alert">{error}</small>}
          <RecoveryDiagnostics operationId={props.operationId} />
        </form>
      </AwikiIdentityPage>
    )
  }

  const progress = props.progress
  const preCommit = progress.phase === 'ready_to_commit' && !commitAttempted
  return (
    <AwikiIdentityPage
      {...preCommit ? { onBack: () => { void discard() }, backLabel: '取消恢复', backDisabled: props.pending } : {}}
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
            <p className={css.recoveryConfirmationCopy}>确认后，这台设备将使用新的本机凭证。恢复开始后请保持窗口打开，不要重复提交。</p>
            <button type="button" className={css.primary} disabled={props.pending} onClick={() => { void activate() }}>确认并恢复身份</button>
          </>
        ) : (
          <div className={css.recoveryProgressPanel} aria-live="polite">
            {error === null && progress.phase !== 'quarantined_key_unavailable' && <IconLoadingOutline16 size={18} />}
            <p>{progressMessage(progress)}</p>
            {(error !== null || progress.phase === 'quarantined_key_unavailable') && (
              <button type="button" className={css.primary} disabled={props.pending} onClick={() => { void (canResume(progress) ? resume() : refresh()) }}>
                <IconRefreshOutline16 size={14} />
                {progress.phase === 'identity_transition_pending' || progress.phase === 'remote_committed'
                  ? '继续完成本机切换'
                  : '重新检查恢复结果'}
              </button>
            )}
          </div>
        )}
        {error !== null && <small className={css.inlineError} role="alert">{error}</small>}
        <RecoveryDiagnostics
          operationId={progress.operationId}
          {...progress.failureCode === undefined ? {} : { failureCode: progress.failureCode }}
        />
      </div>
    </AwikiIdentityPage>
  )
}
