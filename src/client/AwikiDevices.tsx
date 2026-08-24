/** Foreground-only ready-admin device management. SAS remains component-local. */

import { useEffect, useState, type ReactNode } from 'react'
import type {
  AwikiAdminJoinProgress,
  AwikiDeviceManagementSnapshot,
} from '@awiki/dsh-plugin/types'
import type { AwikiActionResult } from './controller.ts'
import css from './AwikiDevices.module.css'

export interface AwikiDevicesProps {
  readonly active: boolean
  readonly pending: boolean
  readonly modeTabs: ReactNode
  refreshDeviceManagement: () => Promise<AwikiActionResult<AwikiDeviceManagementSnapshot>>
  startDeviceJoinVerification: (request: { readonly requestRef: string }) => Promise<AwikiActionResult<AwikiAdminJoinProgress>>
  approveDeviceJoin: (request: { readonly requestRef: string; readonly enteredSas: string; readonly confirmation: string }) => Promise<AwikiActionResult<AwikiAdminJoinProgress>>
  rejectDeviceJoin: (request: { readonly requestRef: string; readonly reason: 'user_rejected' }) => Promise<AwikiActionResult<AwikiAdminJoinProgress>>
  revokeDevice: (request: { readonly deviceRef: string; readonly confirmation: string }) => Promise<AwikiActionResult<AwikiDeviceManagementSnapshot>>
}

export function AwikiDevices(props: AwikiDevicesProps) {
  const [snapshot, setSnapshot] = useState<AwikiDeviceManagementSnapshot | null>(null)
  const [progress, setProgress] = useState<AwikiAdminJoinProgress | null>(null)
  const [enteredSas, setEnteredSas] = useState('')
  const [approval, setApproval] = useState('')
  const [revokeRef, setRevokeRef] = useState<string | null>(null)
  const [revokeConfirmation, setRevokeConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    const result = await props.refreshDeviceManagement()
    if (!result.ok) return setError(result.error)
    setSnapshot(result.value)
    if (progress !== null && !['authorized', 'cancelled', 'rejected', 'expired'].includes(progress.phase)) {
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
    await refresh()
  }

  const reject = async (requestRef: string) => {
    const result = await props.rejectDeviceJoin({ requestRef, reason: 'user_rejected' })
    if (!result.ok) return setError(result.error)
    setProgress(null)
    await refresh()
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

  return (
    <section className={css.page} aria-label="AWiki 设备管理">
      {props.modeTabs}
      <header className={css.heading}><div><h3>设备</h3><p>只有当前 ready-admin 可以批准或撤销设备。</p></div><button type="button" disabled={props.pending} onClick={() => { void refresh() }}>刷新</button></header>
      {snapshot === null && <p role="status">正在读取设备状态…</p>}
      {snapshot !== null && !snapshot.canManage && <p>当前设备不是可用的管理设备，不能批准或撤销其他设备。</p>}
      {snapshot?.canManage && (
        <>
          <section><h4>待加入</h4>{snapshot.requests.length === 0 && <p>没有待处理请求。</p>}
            {snapshot.requests.map(request => <article className={css.card} key={request.requestRef}>
              <code>{request.candidateKeyFingerprint}</code><small>{request.state} · 有效期至 {request.expiresAt}</small>
              <div className={css.actions}>
                <button type="button" disabled={props.pending || (!request.canStartVerification && !request.claimedByCurrentDevice)} onClick={() => { void start(request.requestRef) }}>开始验证</button>
                <button type="button" disabled={props.pending} onClick={() => { void reject(request.requestRef) }}>拒绝</button>
              </div>
            </article>)}
          </section>
          {progress?.phase === 'sas-ready' && <section className={css.card}><h4>核对安全码</h4><strong className={css.sas}>{progress.sas}</strong><p>输入手机显示的 6 位码，并输入 APPROVE。</p>
            <input aria-label="手机安全码" value={enteredSas} inputMode="numeric" maxLength={6} onChange={event => { setEnteredSas(event.target.value) }} />
            <input aria-label="批准确认词" value={approval} autoComplete="off" onChange={event => { setApproval(event.target.value) }} placeholder="APPROVE" />
            <button type="button" disabled={props.pending || enteredSas.length !== 6 || approval !== 'APPROVE'} onClick={() => { void approve() }}>批准为 member</button>
          </section>}
          <section><h4>已登记设备</h4>{snapshot.devices.map(device => <article className={css.card} key={device.deviceRef}>
            <span>{device.isCurrent ? '当前设备' : '其他设备'} · {device.role} · {device.status}</span>
            {!device.isCurrent && device.status === 'active' && (revokeRef === device.deviceRef
              ? <div className={css.actions}><input aria-label="撤销确认词" value={revokeConfirmation} onChange={event => { setRevokeConfirmation(event.target.value) }} placeholder="REVOKE" /><button type="button" disabled={props.pending || revokeConfirmation !== 'REVOKE'} onClick={() => { void revoke() }}>确认撤销</button></div>
              : <button type="button" disabled={props.pending} onClick={() => { setRevokeRef(device.deviceRef); setRevokeConfirmation('') }}>撤销</button>)}
          </article>)}</section>
        </>
      )}
      {error !== null && <p className={css.error} role="alert">{error}</p>}
    </section>
  )
}
