/** Foreground-only ready-admin device management. SAS remains component-local. */

import { useEffect, useId, useState } from 'react'
import { Button, IconRefreshOutline16 } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  AwikiAdminJoinProgress,
  AwikiDeviceManagementSnapshot,
  AwikiRootTransferPreparation,
  AwikiRootTransferReceipt,
} from '@awiki/dsh-plugin/types'
import type { AwikiActionResult } from './controller.ts'
import css from './AwikiDevices.module.css'

export interface AwikiDevicesProps {
  readonly active: boolean
  readonly pending: boolean
  refreshDeviceManagement: () => Promise<AwikiActionResult<AwikiDeviceManagementSnapshot>>
  startDeviceJoinVerification: (request: { readonly requestRef: string }) => Promise<AwikiActionResult<AwikiAdminJoinProgress>>
  approveDeviceJoin: (request: { readonly requestRef: string; readonly enteredSas: string; readonly confirmation: string }) => Promise<AwikiActionResult<AwikiAdminJoinProgress>>
  rejectDeviceJoin: (request: { readonly requestRef: string; readonly reason: 'user_rejected' }) => Promise<AwikiActionResult<AwikiAdminJoinProgress>>
  revokeDevice: (request: { readonly deviceRef: string; readonly confirmation: string }) => Promise<AwikiActionResult<AwikiDeviceManagementSnapshot>>
  prepareRootTransfer: (request: { readonly deviceRef: string }) => Promise<AwikiActionResult<AwikiRootTransferPreparation>>
  confirmRootTransfer: (request: { readonly transferRef: string }) => Promise<AwikiActionResult<AwikiRootTransferReceipt>>
}

const requestStateLabels: Record<string, string> = {
  pending: '待验证',
  verifying: '验证中',
  'sas-ready': '待核对',
  authorized: '已授权',
  cancelled: '已取消',
  rejected: '已拒绝',
  expired: '已过期',
}

function readableDate(value: string): string {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short', hour12: false })
}

function DeviceGlyph() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="6" y="3.5" width="12" height="17" rx="2.5" /><path d="M10 17.5h4" /></svg>
}

export function AwikiDevices(props: AwikiDevicesProps) {
  const sasHelpId = useId()
  const sasInputId = useId()
  const approvalHelpId = useId()
  const approvalInputId = useId()
  const revokeHelpId = useId()
  const revokeInputId = useId()
  const [snapshot, setSnapshot] = useState<AwikiDeviceManagementSnapshot | null>(null)
  const [progress, setProgress] = useState<AwikiAdminJoinProgress | null>(null)
  const [enteredSas, setEnteredSas] = useState('')
  const [approval, setApproval] = useState('')
  const [revokeRef, setRevokeRef] = useState<string | null>(null)
  const [revokeConfirmation, setRevokeConfirmation] = useState('')
  const [rootPreparation, setRootPreparation] = useState<AwikiRootTransferPreparation | null>(null)
  const [rootReceipt, setRootReceipt] = useState<AwikiRootTransferReceipt | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = async (advanceJoin = true) => {
    const result = await props.refreshDeviceManagement()
    if (!result.ok) return setError(result.error)
    setSnapshot(result.value)
    if (advanceJoin && progress !== null && !['authorized', 'cancelled', 'rejected', 'expired'].includes(progress.phase)) {
      const advanced = await props.startDeviceJoinVerification({ requestRef: progress.requestRef })
      if (advanced.ok) setProgress(advanced.value)
    }
    setError(null)
  }

  useEffect(() => {
    if (!props.active) return
    let alive = true
    void props.refreshDeviceManagement().then((result) => {
      if (!alive) return
      if (result.ok) setSnapshot(result.value)
      else setError(result.error)
    })
    const timer = setInterval(() => { if (alive) void refresh() }, 3_000)
    return () => { alive = false; clearInterval(timer) }
  }, [props.active, progress?.phase, progress?.requestRef])

  const start = async (requestRef: string) => {
    const result = await props.startDeviceJoinVerification({ requestRef })
    if (!result.ok) return setError(result.error)
    setProgress(result.value)
    setError(null)
  }

  const approve = async () => {
    if (progress === null) return
    const result = await props.approveDeviceJoin({
      requestRef: progress.requestRef,
      enteredSas,
      confirmation: approval,
    })
    if (!result.ok) return setError(result.error)
    setProgress(null)
    setEnteredSas('')
    setApproval('')
    await refresh(false)
  }

  const reject = async (requestRef: string) => {
    const result = await props.rejectDeviceJoin({ requestRef, reason: 'user_rejected' })
    if (!result.ok) return setError(result.error)
    setProgress(null)
    await refresh(false)
  }

  const revoke = async () => {
    if (revokeRef === null) return
    const result = await props.revokeDevice({ deviceRef: revokeRef, confirmation: revokeConfirmation })
    if (!result.ok) return setError(result.error)
    setSnapshot(result.value)
    setRevokeRef(null)
    setRevokeConfirmation('')
    setError(null)
  }

  const prepareRootTransfer = async (deviceRef: string) => {
    const result = await props.prepareRootTransfer({ deviceRef })
    if (!result.ok) return setError(result.error)
    setRootPreparation(result.value)
    setRootReceipt(null)
    setError(null)
  }

  const confirmRootTransfer = async () => {
    if (rootPreparation === null) return
    const result = await props.confirmRootTransfer({ transferRef: rootPreparation.transferRef })
    if (!result.ok) {
      setRootPreparation(null)
      return setError(result.error)
    }
    setRootPreparation(null)
    setRootReceipt(result.value)
    setError(null)
    await refresh()
  }

  return (
    <section className={css.page} aria-label="AWiki 设备管理">
      <header className={css.heading}>
        <div><h3>设备</h3><p>只有当前 ready-admin 可以批准加入或管理其他设备。</p></div>
        <Button className={css.button} type="button" variant="outline" icon={<IconRefreshOutline16 />} disabled={props.pending} onClick={() => { void refresh() }}>刷新</Button>
      </header>
      {snapshot === null && <div className={css.loading} role="status"><span aria-hidden="true" />正在读取设备状态…</div>}
      {snapshot !== null && !snapshot.canManage && <div className={css.notice}>当前设备不是可用的管理设备，不能批准或撤销其他设备。</div>}
      {snapshot?.canManage && (
        <>
          <section className={css.section} aria-labelledby="awiki-pending-devices">
            <div className={css.sectionHeading}>
              <h4 id="awiki-pending-devices">待加入</h4>
              <span className={css.count}>{snapshot.requests.length}</span>
            </div>
            {snapshot.requests.length === 0 && <div className={css.empty}>暂时没有待处理的设备请求。</div>}
            {snapshot.requests.map(request => <article className={css.card} key={request.requestRef}>
              <div className={css.cardHeader}>
                <div className={css.cardIdentity}>
                  <span className={css.deviceIcon}><DeviceGlyph /></span>
                  <div><strong>新设备请求</strong><code title={request.candidateKeyFingerprint}>{request.candidateKeyFingerprint}</code></div>
                </div>
                <span className={css.badge} data-tone={request.state}>{requestStateLabels[request.state] ?? request.state}</span>
              </div>
              <p className={css.metadata}>有效期至 {readableDate(request.expiresAt)}</p>
              <div className={css.actions}>
                <Button className={css.button} type="button" variant="primary" disabled={props.pending || (!request.canStartVerification && !request.claimedByCurrentDevice)} onClick={() => { void start(request.requestRef) }}>开始验证</Button>
                <Button className={`${css.button} ${css.dangerButton}`} type="button" variant="outline" disabled={props.pending} onClick={() => { void reject(request.requestRef) }}>拒绝</Button>
              </div>
            </article>)}
          </section>
          {progress?.phase === 'sas-ready' && <section className={`${css.card} ${css.verificationCard}`} aria-labelledby="awiki-device-sas-title">
            <div className={css.verificationHeading}><span>第 2 步</span><h4 id="awiki-device-sas-title">核对安全码</h4></div>
            <strong className={css.sas} aria-label={`安全码 ${progress.sas ?? ''}`}>{progress.sas}</strong>
            <p className={css.verificationIntro}>确认手机显示相同号码后，再完成下面两项确认。</p>
            <div className={css.fields}>
              <div className={css.field}>
                <label htmlFor={sasInputId}>手机安全码</label>
                <input id={sasInputId} className={`${css.input} ${css.numericInput}`} aria-describedby={sasHelpId} value={enteredSas} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="请输入 6 位数字" onChange={event => { setEnteredSas(event.target.value.replace(/\D/gu, '').slice(0, 6)) }} />
                <small id={sasHelpId}>填写手机上显示的 6 位数字。</small>
              </div>
              <div className={css.field}>
                <label htmlFor={approvalInputId}>批准确认词</label>
                <input id={approvalInputId} className={css.input} aria-describedby={approvalHelpId} value={approval} autoComplete="off" spellCheck={false} onChange={event => { setApproval(event.target.value) }} placeholder="输入 APPROVE" />
                <small id={approvalHelpId}>输入 APPROVE，确认你同意加入此设备。</small>
              </div>
            </div>
            <Button className={`${css.button} ${css.fullButton}`} type="button" variant="primary" disabled={props.pending || enteredSas.length !== 6 || approval !== 'APPROVE'} onClick={() => { void approve() }}>批准为 member</Button>
          </section>}
          {rootPreparation !== null && <section className={`${css.card} ${css.verificationCard}`}><h4>授予设备管理权</h4><p className={css.metadata}>系统将验证本机用户身份，再向目标 member 发送管理能力。有效期至 {readableDate(rootPreparation.expiresAt)}。</p><Button className={css.button} type="button" variant="primary" disabled={props.pending} onClick={() => { void confirmRootTransfer() }}>使用系统认证并发送</Button></section>}
          {rootReceipt !== null && <div className={css.successNotice} role="status">管理能力已发送；目标设备完成接收后会显示为 admin。接受时间：{readableDate(rootReceipt.acceptedAt)}</div>}
          {!snapshot.rootTransferSupported && <div className={css.notice}><strong>管理权转移暂不可用</strong><span>该功能目前只能在配备 Intel 芯片的 Mac 上通过系统身份验证使用。</span></div>}
          <section className={css.section} aria-labelledby="awiki-registered-devices">
            <div className={css.sectionHeading}><h4 id="awiki-registered-devices">已登记设备</h4><span className={css.count}>{snapshot.devices.length}</span></div>
            <div className={css.deviceList}>{snapshot.devices.map(device => <article className={css.deviceCard} key={device.deviceRef}>
            <div className={css.deviceSummary}>
              <span className={css.deviceIcon}><DeviceGlyph /></span>
              <div><strong>{device.isCurrent ? '当前设备' : '其他设备'}</strong><span>{device.role === 'admin' ? '管理设备' : '成员设备'}</span></div>
              <div className={css.badgeGroup}>
                {device.managementReady && <span className={css.badge} data-tone="admin">管理就绪</span>}
                <span className={css.badge} data-tone={device.status}>{device.status === 'active' ? '正常' : '已撤销'}</span>
              </div>
            </div>
            {snapshot.rootTransferSupported && !device.isCurrent && device.status === 'active' && device.role === 'member' && !device.managementReady
              && <Button className={css.button} type="button" variant="outline" disabled={props.pending} onClick={() => { void prepareRootTransfer(device.deviceRef) }}>授予管理权</Button>}
            {!device.isCurrent && device.status === 'active' && (revokeRef === device.deviceRef
              ? <div className={css.revokePanel}><div className={css.field}><label htmlFor={revokeInputId}>撤销确认词</label><input id={revokeInputId} className={css.input} aria-describedby={revokeHelpId} value={revokeConfirmation} autoComplete="off" spellCheck={false} onChange={event => { setRevokeConfirmation(event.target.value) }} placeholder="输入 REVOKE" /><small id={revokeHelpId}>撤销后，这台设备将无法继续访问当前身份。</small></div><div className={css.actions}><Button className={`${css.button} ${css.dangerButton}`} type="button" variant="outline" disabled={props.pending || revokeConfirmation !== 'REVOKE'} onClick={() => { void revoke() }}>确认撤销</Button><Button className={css.button} type="button" variant="ghost" disabled={props.pending} onClick={() => { setRevokeRef(null); setRevokeConfirmation('') }}>取消</Button></div></div>
              : <Button className={`${css.button} ${css.dangerButton}`} type="button" variant="outline" disabled={props.pending} onClick={() => { setRevokeRef(device.deviceRef); setRevokeConfirmation('') }}>撤销</Button>)}
          </article>)}</div></section>
        </>
      )}
      {error !== null && <div className={css.error} role="alert"><strong>操作未完成</strong><span>{error}</span></div>}
    </section>
  )
}
