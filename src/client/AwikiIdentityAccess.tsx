/** One explicit create, recover, resume, or replace flow for AWiki identity access. */

import { useEffect, useState } from 'react'
import { IconUserOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  AwikiDeviceJoinProgress,
  AwikiIdentity,
  AwikiIdentityAccessResult,
  AwikiRecoveryProgress,
  AwikiRegistrationOtpRequest,
  AwikiRegistrationOtpResult,
  AwikiRegistrationRequest,
  AwikiSession,
} from '@awiki/dsh-plugin/types'
import type { AwikiActionResult } from './controller.ts'
import { AwikiIdentityPage } from './AwikiIdentityPage.tsx'
import {
  AwikiRecoveryForm,
  type AwikiRecoveryActions,
  type AwikiRecoveryFactorContext,
} from './AwikiRecoveryForm.tsx'
import css from './AwikiIdentityAccess.module.css'

export interface AwikiIdentityAccessActions extends AwikiRecoveryActions {
  sendRegistrationOtp: (request: AwikiRegistrationOtpRequest) => Promise<AwikiActionResult<AwikiRegistrationOtpResult>>
  registerIdentity: (request: AwikiRegistrationRequest) => Promise<AwikiActionResult<AwikiIdentityAccessResult>>
  beginDeviceJoin: () => Promise<AwikiActionResult<AwikiDeviceJoinProgress>>
  getDeviceJoinStatus: () => Promise<AwikiActionResult<AwikiDeviceJoinProgress | null>>
  cancelDeviceJoin: () => Promise<AwikiActionResult>
  retireDeviceIdentityForRejoin: () => Promise<AwikiActionResult>
  login: () => Promise<AwikiActionResult<AwikiSession>>
  clearLocalIdentity: () => Promise<AwikiActionResult>
}

export interface AwikiIdentityAccessProps extends AwikiIdentityAccessActions {
  readonly sessionStatus: 'unregistered' | 'signed-out' | 'recovery-required' | 'device-rejoin-required'
  readonly identity?: AwikiIdentity | null
  readonly recoveryOperationId: string | null
  readonly recoveryProgress: AwikiRecoveryProgress | null
  readonly pending: boolean
  readonly autoFocusHandle?: boolean
  readonly handleRecoveryPhoneEnabled: boolean
}

type SignedOutAlternative = 'none' | 'recover' | 'replace'

function Recovery(props: AwikiIdentityAccessProps & {
  readonly onExit?: () => void
  readonly onExitLabel?: string
  readonly initialFactorContext?: AwikiRecoveryFactorContext
  readonly fixedHandle?: string
  readonly requestTitle?: string
  readonly requestDescription?: string
}) {
  return (
    <AwikiRecoveryForm
      operationId={props.recoveryOperationId}
      progress={props.recoveryProgress}
      pending={props.pending}
      sendRecoveryOtp={props.sendRecoveryOtp}
      prepareRecovery={props.prepareRecovery}
      activateRecovery={props.activateRecovery}
      refreshRecoveryStatus={props.refreshRecoveryStatus}
      resumeRecovery={props.resumeRecovery}
      discardRecovery={props.discardRecovery}
      {...props.onExit === undefined ? {} : { onExit: props.onExit }}
      {...props.onExitLabel === undefined ? {} : { onExitLabel: props.onExitLabel }}
      {...props.initialFactorContext === undefined ? {} : { initialFactorContext: props.initialFactorContext }}
      {...props.fixedHandle === undefined ? {} : { fixedHandle: props.fixedHandle }}
      {...props.requestTitle === undefined ? {} : { requestTitle: props.requestTitle }}
      {...props.requestDescription === undefined ? {} : { requestDescription: props.requestDescription }}
    />
  )
}

/** Keep phone and OTP values mounted only for the duration of this explicit user flow. */
export function AwikiIdentityAccess(props: AwikiIdentityAccessProps) {
  const [phone, setPhone] = useState('')
  const [handle, setHandle] = useState('')
  const [otp, setOtp] = useState('')
  const [registrationOtpSent, setRegistrationOtpSent] = useState(false)
  const [recoveryFactorContext, setRecoveryFactorContext] = useState<AwikiRecoveryFactorContext | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryDeadline, setRetryDeadline] = useState<number | null>(null)
  const [retrySeconds, setRetrySeconds] = useState(0)
  const [signedOutAlternative, setSignedOutAlternative] = useState<SignedOutAlternative>('none')
  const [replaceConfirmed, setReplaceConfirmed] = useState(false)
  const [loginFailed, setLoginFailed] = useState(false)
  const [joinContext, setJoinContext] = useState<{ readonly fullHandle: string; readonly phone: string } | null>(null)
  const [joinProgress, setJoinProgress] = useState<AwikiDeviceJoinProgress | null>(null)
  const [deviceRejoinHandle, setDeviceRejoinHandle] = useState<string | null>(null)

  useEffect(() => {
    if (retryDeadline === null) return
    const update = () => {
      const remaining = Math.max(0, Math.ceil((retryDeadline - Date.now()) / 1000))
      setRetrySeconds(remaining)
      if (remaining === 0) setRetryDeadline(null)
    }
    update()
    const timer = setInterval(update, 250)
    return () => { clearInterval(timer) }
  }, [retryDeadline])

  const resetIdentityEntry = () => {
    setOtp('')
    setRegistrationOtpSent(false)
    setRecoveryFactorContext(null)
    setNotice(null)
    setError(null)
    setRetryDeadline(null)
    setRetrySeconds(0)
  }

  const returnToSignedOutHome = () => {
    resetIdentityEntry()
    setSignedOutAlternative('none')
    setReplaceConfirmed(false)
    setLoginFailed(false)
  }

  const requestRegistrationOtp = async () => {
    setError(null)
    const result = await props.sendRegistrationOtp({ handle: handle.trim(), phone: phone.trim() })
    if (!result.ok) {
      setError(result.error)
      return
    }
    const cooldownSeconds = Math.max(0, Math.ceil(result.value.retryAfterSeconds))
    setRegistrationOtpSent(true)
    setRetryDeadline(Date.now() + cooldownSeconds * 1000)
    setRetrySeconds(cooldownSeconds)
    setNotice(`注册验证码已发送；${cooldownSeconds} 秒后可重新获取。`)
  }

  const requestIdentityOtp = requestRegistrationOtp

  const completeRegistration = async () => {
    if (!registrationOtpSent) return
    setError(null)
    const result = await props.registerIdentity({
      phone: phone.trim(),
      handle: handle.trim(),
      otp: otp.trim(),
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (result.value.status === 'join-required') {
      setOtp('')
      setJoinContext({ fullHandle: result.value.fullHandle, phone: phone.trim() })
      return
    }
    setPhone('')
    setHandle('')
    setDeviceRejoinHandle(null)
    resetIdentityEntry()
  }

  const beginJoin = async () => {
    setError(null)
    const result = await props.beginDeviceJoin()
    if (!result.ok) return setError(result.error)
    setJoinProgress(result.value)
  }

  const cancelJoin = async () => {
    setError(null)
    const result = await props.cancelDeviceJoin()
    if (!result.ok) return setError(result.error)
    setJoinContext(null)
    setJoinProgress(null)
    resetIdentityEntry()
  }

  const chooseRecovery = async () => {
    if (joinContext === null || !props.handleRecoveryPhoneEnabled) return
    setError(null)
    const discarded = await props.cancelDeviceJoin()
    if (!discarded.ok) return setError(discarded.error)
    const recovery = await props.sendRecoveryOtp({
      fullHandle: joinContext.fullHandle,
      phone: joinContext.phone,
    })
    if (!recovery.ok) return setError(recovery.error)
    setRecoveryFactorContext({ fullHandle: recovery.value.fullHandle, phone: joinContext.phone })
    setJoinContext(null)
  }

  useEffect(() => {
    if (props.sessionStatus !== 'unregistered'
      || joinContext !== null
      || joinProgress !== null
      || typeof props.getDeviceJoinStatus !== 'function') return
    let active = true
    void props.getDeviceJoinStatus().then((result) => {
      if (!active) return
      if (!result.ok) setError(result.error)
      else if (result.value !== null) setJoinProgress(result.value)
    })
    return () => { active = false }
  }, [props.sessionStatus])

  useEffect(() => {
    if (joinProgress === null || joinProgress.completed || ['authorized', 'cancelled', 'rejected', 'expired'].includes(joinProgress.phase)) return
    const timer = setInterval(() => {
      void props.getDeviceJoinStatus().then((result) => {
        if (!result.ok) setError(result.error)
        else if (result.value !== null) setJoinProgress(result.value)
      })
    }, 2_000)
    return () => { clearInterval(timer) }
  }, [joinProgress?.completed, joinProgress?.phase])

  const login = async () => {
    setError(null)
    setLoginFailed(false)
    const result = await props.login()
    if (!result.ok) {
      setError(result.error)
      setLoginFailed(true)
    }
  }

  const clearLocalIdentity = async () => {
    setError(null)
    const result = await props.clearLocalIdentity()
    if (!result.ok) {
      setError(result.error)
      return
    }
    setPhone('')
    setHandle('')
    resetIdentityEntry()
    setReplaceConfirmed(false)
    setLoginFailed(false)
    setSignedOutAlternative('none')
  }

  const prepareDeviceRejoin = async () => {
    const currentHandle = props.identity?.handle
    if (currentHandle === undefined) return setError('当前设备缺少可重新加入的 Handle。')
    setError(null)
    const result = await props.retireDeviceIdentityForRejoin()
    if (!result.ok) return setError(result.error)
    setHandle(currentHandle)
    setDeviceRejoinHandle(currentHandle)
    resetIdentityEntry()
  }

  const signedOutRecoveryOpen = props.sessionStatus === 'signed-out' && signedOutAlternative === 'recover'
  const revokedHandle = props.sessionStatus === 'recovery-required' ? props.identity?.handle : undefined
  if (props.recoveryOperationId !== null && !signedOutRecoveryOpen) {
    const onExit = props.sessionStatus === 'signed-out' ? returnToSignedOutHome : resetIdentityEntry
    return (
      <Recovery
        {...props}
        onExit={onExit}
        onExitLabel={props.sessionStatus === 'signed-out' ? '返回本机身份' : '返回身份入口'}
        {...recoveryFactorContext === null ? {} : { initialFactorContext: recoveryFactorContext }}
        {...revokedHandle === undefined ? {} : {
          fixedHandle: revokedHandle,
          requestTitle: '需要重新恢复身份',
          requestDescription: '这个 Handle 已在另一台设备完成了更新恢复，当前设备的旧凭证因此失效。验证绑定手机号后即可继续使用本机数据。',
        }}
      />
    )
  }

  if (props.sessionStatus === 'recovery-required') {
    return (
      <Recovery
        {...props}
        {...revokedHandle === undefined ? {} : { fixedHandle: revokedHandle }}
        requestTitle="需要重新恢复身份"
        requestDescription="这个 Handle 已在另一台设备完成了更新恢复，当前设备的旧凭证因此失效。验证绑定手机号后即可继续使用本机数据。"
      />
    )
  }

  if (props.sessionStatus === 'device-rejoin-required') {
    return (
      <AwikiIdentityPage>
        <div className={css.accessFlow}>
          <div className={css.identityIcon}><IconUserOutline16 size={24} /></div>
          <div className={css.headingGroup}>
            <h3>此设备已被撤销</h3>
            <p>这台设备的旧凭证已永久失效。可以保留本机消息数据，重新验证手机号并向管理设备重新申请加入。</p>
          </div>
          {props.identity?.handle !== undefined && <div className={css.identitySummary}><span>当前身份</span><strong>{props.identity.handle}</strong></div>}
          <button type="button" className={css.primary} disabled={props.pending} onClick={() => { void prepareDeviceRejoin() }}>重新加入此设备</button>
          {error !== null && <small className={css.error} role="alert">{error}</small>}
        </div>
      </AwikiIdentityPage>
    )
  }

  if (props.sessionStatus === 'unregistered' && joinProgress !== null) {
    const terminal = ['cancelled', 'rejected', 'expired'].includes(joinProgress.phase)
    return (
      <AwikiIdentityPage>
        <div className={css.accessFlow}>
          <div className={css.identityIcon}><IconUserOutline16 size={24} /></div>
          <div className={css.headingGroup}>
            <h3>{joinProgress.phase === 'sas-ready' ? '核对安全码' : terminal ? '设备加入已结束' : '正在加入设备'}</h3>
            <p>{joinProgress.phase === 'sas-ready'
              ? '请在已有管理设备上核对下面的 6 位安全码；只有两端一致时才批准。'
              : joinProgress.phase === 'rejected'
                ? '管理设备拒绝了这次加入。'
                : joinProgress.phase === 'expired'
                  ? '这次设备加入已过期，请重新验证手机号。'
                  : joinProgress.phase === 'cancelled'
                    ? '这次设备加入已取消。'
                    : '请在已有 AWiki Me 或 CLI 管理设备上处理加入请求。'}</p>
          </div>
          {joinProgress.phase === 'sas-ready' && <strong className={css.sas}>{joinProgress.sas}</strong>}
          {!terminal && <small className={css.notice} role="status">有效期至 {joinProgress.expiresAt}</small>}
          <button type="button" className={terminal ? css.primary : css.secondary} disabled={props.pending} onClick={() => { void cancelJoin() }}>
            {terminal ? '返回身份入口' : '取消加入'}
          </button>
          {error !== null && <small className={css.error} role="alert">{error}</small>}
        </div>
      </AwikiIdentityPage>
    )
  }

  if (props.sessionStatus === 'unregistered' && joinContext !== null) {
    return (
      <AwikiIdentityPage>
        <div className={css.accessFlow}>
          <div className={css.identityIcon}><IconUserOutline16 size={24} /></div>
          <div className={css.headingGroup}>
            <h3>这个 Handle 已存在</h3>
            <p>推荐把当前 DSH 作为新设备加入，原身份和其他设备会继续有效。</p>
          </div>
          <button type="button" className={css.primary} disabled={props.pending} onClick={() => { void beginJoin() }}>加入新设备（推荐）</button>
          {props.handleRecoveryPhoneEnabled && (
            <button type="button" className={css.dangerLink} disabled={props.pending} onClick={() => { void chooseRecovery() }}>恢复 Handle（会替换 DID）</button>
          )}
          <button type="button" className={css.secondary} disabled={props.pending} onClick={() => { void cancelJoin() }}>取消</button>
          {error !== null && <small className={css.error} role="alert">{error}</small>}
        </div>
      </AwikiIdentityPage>
    )
  }

  if (props.sessionStatus === 'signed-out') {
    if (signedOutAlternative === 'recover') {
      return <Recovery {...props} onExit={returnToSignedOutHome} onExitLabel="返回本机身份" />
    }
    if (signedOutAlternative === 'replace') {
      return (
        <AwikiIdentityPage onBack={returnToSignedOutHome} backLabel="返回本机身份" backDisabled={props.pending}>
          <div className={css.accessFlow}>
            <div className={css.identityIcon}><IconUserOutline16 size={24} /></div>
            <div className={css.headingGroup}>
              <h3>使用其他身份</h3>
              <p>继续前需要先清除这台设备上保留的 AWiki 身份和本地数据。</p>
            </div>
            <div className={css.dangerPanel}>
              <strong>此操作只清除本机数据，并且无法撤销</strong>
              <p>本机私钥、消息、附件索引和身份缓存将永久删除；服务端账户不会删除，但本地数据无法恢复。</p>
              <label className={css.confirmation}>
                <input type="checkbox" checked={replaceConfirmed} onChange={event => { setReplaceConfirmed(event.target.checked) }} />
                <span>我已了解本地数据会被永久清除</span>
              </label>
            </div>
            <button type="button" className={css.dangerButton} disabled={props.pending || !replaceConfirmed} onClick={() => { void clearLocalIdentity() }}>
              清除并使用其他身份
            </button>
            {error !== null && <small className={css.error} role="alert">{error}</small>}
          </div>
        </AwikiIdentityPage>
      )
    }
    return (
      <AwikiIdentityPage>
        <div className={css.accessFlow}>
          <div className={css.identityIcon}><IconUserOutline16 size={24} /></div>
          <div className={css.headingGroup}>
            <h3>已退出 AWiki</h3>
            <p>这台设备仍安全保留原身份和本地消息，重新进入不会创建新身份。</p>
          </div>
          <div className={css.actionStack}>
            <button type="button" className={css.primary} disabled={props.pending} onClick={() => { void login() }}>
              重新进入本机身份
            </button>
            <button type="button" className={css.dangerLink} disabled={props.pending} onClick={() => { setSignedOutAlternative('replace'); setLoginFailed(false); setError(null) }}>
              使用其他身份
            </button>
          </div>
          {error !== null && <small className={css.error} role="alert">{error}</small>}
          {loginFailed && (
            <div className={css.recoveryHelp}>
              <p>如果本机身份凭证已经损坏或不可用，可以验证原绑定手机号后恢复这个身份。</p>
              <button type="button" className={css.secondary} disabled={props.pending} onClick={() => { setSignedOutAlternative('recover'); setError(null) }}>
                恢复本机原有身份
              </button>
            </div>
          )}
        </div>
      </AwikiIdentityPage>
    )
  }

  return (
    <AwikiIdentityPage
      {...registrationOtpSent ? { onBack: resetIdentityEntry, backLabel: '修改身份信息' } : {}}
      backDisabled={props.pending}
    >
      <form className={css.accessFlow} onSubmit={(event) => { event.preventDefault(); void (registrationOtpSent ? completeRegistration() : requestIdentityOtp()) }}>
        <div className={css.identityIcon}><IconUserOutline16 size={24} /></div>
        <div className={css.headingGroup}>
          <h3>{registrationOtpSent ? '验证身份' : deviceRejoinHandle === null ? '进入 AWiki' : '重新加入设备'}</h3>
          <p>{registrationOtpSent
            ? '输入注册验证码。新 Handle 会创建身份，已有 Handle 会进入设备加入选择。'
            : deviceRejoinHandle === null
              ? '输入 Handle 和手机号，统一获取注册验证码。'
              : '验证绑定手机号后，这台设备会以一把新密钥重新申请加入；本机消息数据不会清除。'}</p>
        </div>
        <label className={css.field}>Handle<input value={handle} onChange={event => { setHandle(event.target.value) }} readOnly={registrationOtpSent || deviceRejoinHandle !== null} autoComplete="username" placeholder="例如 alice" autoFocus={props.autoFocusHandle} /></label>
        <label className={css.field}>手机号<input value={phone} onChange={event => { setPhone(event.target.value) }} readOnly={registrationOtpSent} type="tel" autoComplete="tel" /></label>
        {registrationOtpSent && <label className={css.field}>注册验证码<input value={otp} onChange={event => { setOtp(event.target.value) }} inputMode="numeric" autoComplete="one-time-code" autoFocus /></label>}
        <button type="submit" className={css.primary} disabled={props.pending || handle.trim() === '' || phone.trim() === '' || (registrationOtpSent && otp.trim() === '')}>
          {registrationOtpSent ? '继续' : '获取验证码'}
        </button>
        {registrationOtpSent && (
          <button type="button" className={css.linkButton} disabled={props.pending || retrySeconds > 0} onClick={() => { void requestRegistrationOtp() }}>
            {retrySeconds > 0 ? `${retrySeconds} 秒后重新获取` : '重新获取注册验证码'}
          </button>
        )}
        {notice !== null && <small className={css.notice} role="status">{notice}</small>}
        {error !== null && <small className={css.error} role="alert">{error}</small>}
      </form>
    </AwikiIdentityPage>
  )
}
