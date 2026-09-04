/** Proactive ready-admin reminder for newly pending device join requests. */

import { useEffect, useRef, useState } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { AwikiDeviceManagementSnapshot } from '@awiki/dsh-plugin/types'
import type { AwikiDevicesProps } from './AwikiDevices.tsx'
import { AwikiDevices, TERMINAL_DEVICE_JOIN_STATES } from './AwikiDevices.tsx'
import css from './AwikiDeviceJoinReminder.module.css'

type PendingDeviceRequest = AwikiDeviceManagementSnapshot['requests'][number]

export interface AwikiDeviceJoinReminderProps extends Omit<AwikiDevicesProps, 'active'> {
  readonly active: boolean
  readonly identityKey: string | null
  /** Override only for deterministic component tests. */
  readonly pollIntervalMs?: number
}

/**
 * Poll for join requests while an admin identity is active, without exposing
 * pending device management to member devices or repeatedly prompting for the
 * same request during one identity session.
 */
export function AwikiDeviceJoinReminder(props: AwikiDeviceJoinReminderProps) {
  const [request, setRequest] = useState<PendingDeviceRequest | null>(null)
  const [managing, setManaging] = useState(false)
  const dismissedRequestRefs = useRef(new Set<string>())

  useEffect(() => {
    dismissedRequestRefs.current.clear()
    setRequest(null)
    setManaging(false)
  }, [props.identityKey])

  useEffect(() => {
    if (!props.active || props.identityKey === null || managing) return
    let alive = true
    let inFlight = false

    const poll = async () => {
      if (inFlight) return
      inFlight = true
      try {
        const result = await props.refreshDeviceManagement()
        if (!alive || !result.ok) return
        if (!result.value.canManage) {
          setRequest(null)
          return
        }
        const actionable = result.value.requests.filter(value => !TERMINAL_DEVICE_JOIN_STATES.has(value.state))
        const liveRequestRefs = new Set(actionable.map(value => value.requestRef))
        setRequest(current => {
          if (current !== null && liveRequestRefs.has(current.requestRef)) return current
          return actionable.find(value => !dismissedRequestRefs.current.has(value.requestRef)) ?? null
        })
      } finally {
        inFlight = false
      }
    }

    void poll()
    const timer = setInterval(() => { void poll() }, props.pollIntervalMs ?? 3_000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [managing, props.active, props.identityKey, props.pollIntervalMs, props.refreshDeviceManagement])

  const dismiss = () => {
    if (request !== null) dismissedRequestRefs.current.add(request.requestRef)
    setRequest(null)
  }

  const manage = () => {
    if (request !== null) dismissedRequestRefs.current.add(request.requestRef)
    setRequest(null)
    setManaging(true)
  }

  return (
    <>
      <Modal
        open={request !== null}
        onClose={dismiss}
        title="有新设备请求加入"
        closeLabel="稍后处理"
        description="检测到一台新设备正在请求加入当前 AWiki 身份。批准前请核对两台设备显示的安全码。"
        footer={(
          <>
            <Button type="button" variant="outline" onClick={dismiss}>稍后处理</Button>
            <Button type="button" onClick={manage}>立即处理</Button>
          </>
        )}
      >
        {request !== null && (
          <div className={css.request}>
            <span>设备密钥指纹</span>
            <code>{request.candidateKeyFingerprint}</code>
            <small>请求有效期至 {request.expiresAt}</small>
          </div>
        )}
      </Modal>
      <Modal
        open={managing}
        onClose={() => { setManaging(false) }}
        title="设备管理"
        closeLabel="关闭设备管理"
        className={css.managementModal ?? ''}
        contentClassName={css.managementContent ?? ''}
        footer={<Button type="button" variant="outline" onClick={() => { setManaging(false) }}>完成</Button>}
      >
        <AwikiDevices
          active={managing}
          pending={props.pending}
          refreshDeviceManagement={props.refreshDeviceManagement}
          startDeviceJoinVerification={props.startDeviceJoinVerification}
          approveDeviceJoin={props.approveDeviceJoin}
          rejectDeviceJoin={props.rejectDeviceJoin}
          revokeDevice={props.revokeDevice}
          prepareRootTransfer={props.prepareRootTransfer}
          confirmRootTransfer={props.confirmRootTransfer}
        />
      </Modal>
    </>
  )
}
