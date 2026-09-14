/** Public services editor. Core owns authorization, protected fields and durable writes. */
import { useEffect, useRef, useState } from 'react'
import type { AwikiIdentityDocumentService, AwikiIdentityServicesRequest, AwikiIdentityServicesSnapshot, AwikiUpdateIdentityServicesRequest } from '../types.ts'
import type { AwikiActionResult } from './controller.ts'
import css from './AwikiDevices.module.css'

export interface AwikiIdentityServicesActions {
  getIdentityServices: () => Promise<AwikiActionResult<AwikiIdentityServicesSnapshot>>
  updateIdentityServices: (request: AwikiUpdateIdentityServicesRequest) => Promise<AwikiActionResult<AwikiIdentityServicesSnapshot>>
  resumeIdentityServicesUpdate: (request: AwikiIdentityServicesRequest) => Promise<AwikiActionResult<AwikiIdentityServicesSnapshot>>
}

const protectedTypes = new Set(['AgentDescription', 'ANPHandleService', 'ANPMessageService'])

export function AwikiIdentityServices(props: AwikiIdentityServicesActions) {
  const [snapshot, setSnapshot] = useState<AwikiIdentityServicesSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<AwikiIdentityDocumentService | null>(null)
  const [existingId, setExistingId] = useState<string | null>(null)
  const alive = useRef(false)
  const writing = useRef(false)
  const canEdit = snapshot?.canManage === true && !snapshot.pending && !busy

  const read = async () => {
    const result = await props.getIdentityServices()
    if (!alive.current) return
    if (result.ok) setSnapshot(result.value)
    else { setSnapshot(null); setError(result.error) }
  }

  useEffect(() => {
    alive.current = true
    void read()
    return () => { alive.current = false }
  }, [])

  const write = async (services?: readonly AwikiIdentityDocumentService[]) => {
    if (writing.current || snapshot?.canManage !== true) return
    if (services !== undefined && snapshot.pending) return
    writing.current = true
    setBusy(true)
    setError(null)
    try {
      const result = services === undefined
        ? await props.resumeIdentityServicesUpdate({ did: snapshot.did })
        : await props.updateIdentityServices({ did: snapshot.did, services })
      if (!alive.current) return
      if (result.ok) { setSnapshot(result.value); setEditing(null) }
      else setError(result.error)
      // Re-read even after a lost response; a new write stays closed while Core has pending work.
      await read()
    } finally {
      writing.current = false
      if (alive.current) setBusy(false)
    }
  }

  return <section className={css.section} aria-label="身份服务">
    <div className={css.sectionHeading}><h4>身份服务</h4><button type="button" disabled={busy} onClick={() => { void read() }}>重新检查服务</button></div>
    {snapshot?.pending && <div className={css.notice} role="status"><strong>服务更新尚未确认</strong><span>已保存原更新，关闭或重新打开页面不会重复提交。</span>
      {snapshot.canManage && <button type="button" disabled={busy} onClick={() => { void write() }}>继续原服务更新</button>}
    </div>}
    {snapshot?.services.map(service => <article className={css.card} key={service.id}>
      <strong>{service.type}</strong><p>{service.id}</p><p>{service.serviceEndpoint}</p>
      {protectedTypes.has(service.type) ? <small>系统服务，只读</small> : canEdit && <div className={css.actions}>
        <button type="button" onClick={() => { setExistingId(service.id); setEditing(service) }}>编辑服务</button>
        <button type="button" onClick={() => { void write(snapshot.services.filter(value => value.id !== service.id)) }}>删除服务</button>
      </div>}
    </article>)}
    {canEdit && <button type="button" onClick={() => { setExistingId(null); setEditing({ id: `${snapshot.did}#`, type: '', serviceEndpoint: '' }) }}>添加服务</button>}
    {canEdit && editing !== null && <form className={css.card} onSubmit={event => {
      event.preventDefault()
      const services = existingId === null ? [...snapshot.services, editing] : snapshot.services.map(value => value.id === existingId ? editing : value)
      void write(services)
    }}>
      <label className={css.field}>服务标识<input aria-label="服务标识" value={editing.id} readOnly={existingId !== null} onChange={event => { setEditing({ ...editing, id: event.target.value }) }} required /></label>
      <label className={css.field}>服务类型<input aria-label="服务类型" value={editing.type} onChange={event => { setEditing({ ...editing, type: event.target.value }) }} required /></label>
      <label className={css.field}>服务地址<input aria-label="服务地址" value={editing.serviceEndpoint} onChange={event => { setEditing({ ...editing, serviceEndpoint: event.target.value }) }} required /></label>
      <button type="submit">保存服务</button><button type="button" onClick={() => { setEditing(null) }}>取消编辑</button>
    </form>}
    {error !== null && <p className={css.error} role="alert">{error}</p>}
  </section>
}
