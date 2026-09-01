/** Isolated Integration management panel for the full AWiki plugin. */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  AwikiGroupSnapshot,
  AwikiIntegrationFields,
  AwikiIntegrationGroupTargetInput,
  AwikiIntegrationView,
} from '@awiki/dsh-plugin/types'
import type { AwikiActionResult } from './controller.ts'
import type { AwikiSettingsKey } from './settings-locales.ts'
import css from './AwikiSettingsSection.module.css'

export interface AwikiIntegrationSettingsActions {
  loadIntegration: () => Promise<AwikiActionResult<AwikiIntegrationView | null>>
  saveIntegration: (
    fields: AwikiIntegrationFields,
    current: AwikiIntegrationView | null,
  ) => Promise<AwikiActionResult<AwikiIntegrationView>>
  rotateIntegrationId: (current: AwikiIntegrationView) => Promise<AwikiActionResult<AwikiIntegrationView>>
  closeIntegration: (current: AwikiIntegrationView) => Promise<AwikiActionResult<AwikiIntegrationView>>
  listOwnedGroups: () => Promise<AwikiActionResult<readonly AwikiGroupSnapshot[]>>
  openIntegrationGuide: () => void
}

interface Props extends AwikiIntegrationSettingsActions {
  readonly t: (key: AwikiSettingsKey, params?: Record<string, string>) => string
}

function emptyFields(): AwikiIntegrationFields {
  return { productName: '', description: '', contactEnabled: true, contactDescription: '', groupTargets: [] }
}

function fieldsFrom(value: AwikiIntegrationView): AwikiIntegrationFields {
  return {
    productName: value.productName,
    description: value.description,
    contactEnabled: value.contactEnabled,
    contactDescription: value.contactDescription,
    groupTargets: value.groupTargets.map(target => ({ id: target.id, groupDid: target.groupDid, description: target.description })),
  }
}

/** Render management independently so Gateway errors never disable ordinary AWiki settings. */
export function AwikiIntegrationSettings(props: Props): ReactNode {
  const [current, setCurrent] = useState<AwikiIntegrationView | null>(null)
  const [fields, setFields] = useState<AwikiIntegrationFields>(emptyFields)
  const [groups, setGroups] = useState<readonly AwikiGroupSnapshot[]>([])
  const [groupsUnavailable, setGroupsUnavailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const reload = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    setGroupsUnavailable(false)
    try {
      const [integration, ownedGroups] = await Promise.all([props.loadIntegration(), props.listOwnedGroups()])
      if (!integration.ok) setError(integration.error)
      else {
        setCurrent(integration.value)
        setFields(integration.value === null ? emptyFields() : fieldsFrom(integration.value))
      }
      if (ownedGroups.ok) setGroups(ownedGroups.value)
      else setGroupsUnavailable(true)
    } catch {
      setError(props.t('unavailable'))
      setGroupsUnavailable(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [])

  const availableGroups = useMemo(() => groups.filter(group => (
    !fields.groupTargets.some(target => target.groupDid === group.groupDid)
  )), [fields.groupTargets, groups])

  const mutate = async (operation: () => Promise<AwikiActionResult<AwikiIntegrationView>>): Promise<void> => {
    setPending(true)
    setError(null)
    setSaved(false)
    try {
      const result = await operation()
      if (result.ok) {
        setCurrent(result.value)
        setFields(fieldsFrom(result.value))
        setSaved(true)
      } else setError(result.error)
    } catch {
      setError(props.t('unavailable'))
    } finally {
      setPending(false)
    }
  }

  const addGroup = (groupDid: string): void => {
    const next: AwikiIntegrationGroupTargetInput = { groupDid, description: '' }
    setFields(value => ({ ...value, groupTargets: [...value.groupTargets, next] }))
  }

  if (loading) return <p className={css.status}>{props.t('integrationLoading')}</p>

  return (
    <section className={css.integrationCard} aria-labelledby="awiki-integration-title">
      <div className={css.integrationHeader}>
        <div>
          <h3 id="awiki-integration-title" className={css.dangerTitle}>{props.t('integrationTitle')}</h3>
          <p className={css.description}>{props.t('integrationDescription')}</p>
        </div>
        <Button type="button" variant="outline" onClick={props.openIntegrationGuide}>{props.t('integrationGuide')}</Button>
      </div>

      <label className={css.label} htmlFor="awiki-integration-name">{props.t('integrationName')}</label>
      <input id="awiki-integration-name" className={css.input} placeholder={props.t('integrationNamePlaceholder')} maxLength={80} disabled={pending || current?.status === 'closed'} value={fields.productName} onChange={event => { setFields(value => ({ ...value, productName: event.target.value })); setSaved(false) }} />

      <label className={css.label} htmlFor="awiki-integration-description">{props.t('integrationIntroduction')}</label>
      <textarea id="awiki-integration-description" className={css.textarea} placeholder={props.t('integrationIntroductionPlaceholder')} maxLength={1000} disabled={pending || current?.status === 'closed'} value={fields.description} onChange={event => { setFields(value => ({ ...value, description: event.target.value })); setSaved(false) }} />

      <label className={css.checkLabel}>
        <input type="checkbox" disabled={pending || current?.status === 'closed'} checked={fields.contactEnabled} onChange={event => { setFields(value => ({ ...value, contactEnabled: event.target.checked })); setSaved(false) }} />
        {props.t('integrationContactDeveloper')}
      </label>
      {fields.contactEnabled && <textarea className={css.textarea} aria-label={props.t('integrationContactIntroduction')} placeholder={props.t('integrationContactIntroductionPlaceholder')} maxLength={500} disabled={pending || current?.status === 'closed'} value={fields.contactDescription} onChange={event => { setFields(value => ({ ...value, contactDescription: event.target.value })); setSaved(false) }} />}

      <div className={css.groupHeader}><strong>{props.t('integrationGroups')}</strong></div>
      {fields.groupTargets.map((target, index) => {
        const group = groups.find(candidate => candidate.groupDid === target.groupDid)
        const stored = current?.groupTargets.find(candidate => candidate.groupDid === target.groupDid)
        const displayName = group?.title ?? stored?.displayName ?? target.groupDid
        return <div className={css.groupRow} key={target.groupDid}>
          <div className={css.groupSummary}>
            <div className={css.groupIdentity}>
              <strong className={css.groupName} title={displayName}>{displayName}</strong>
              <small className={css.groupDid} title={target.groupDid}>{target.groupDid}</small>
            </div>
            <Button type="button" variant="outline" disabled={pending || current?.status === 'closed'} onClick={() => setFields(value => ({ ...value, groupTargets: value.groupTargets.filter((_, itemIndex) => itemIndex !== index) }))}>{props.t('integrationRemove')}</Button>
          </div>
          <input aria-label={props.t('integrationGroupIntroduction')} placeholder={props.t('integrationGroupIntroductionPlaceholder')} className={css.input} maxLength={500} disabled={pending || current?.status === 'closed'} value={target.description} onChange={event => setFields(value => ({ ...value, groupTargets: value.groupTargets.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item) }))} />
        </div>
      })}
      {groupsUnavailable
        ? <p className={`${css.status} ${css.error}`}>{props.t('integrationGroupsUnavailable')}</p>
        : availableGroups.length > 0
        ? <select className={css.input} disabled={pending || current?.status === 'closed' || fields.groupTargets.length >= 20} value="" onChange={event => { if (event.target.value !== '') addGroup(event.target.value) }}>
            <option value="">{props.t('integrationAddGroup')}</option>
            {availableGroups.map(group => <option key={group.groupDid} value={group.groupDid}>{group.title}</option>)}
          </select>
        : <p className={css.status}>{props.t('integrationNoOwnedGroups')}</p>}

      {current?.integrationUrl !== null && current?.integrationUrl !== undefined && <div className={css.integrationUrl}>
        <code>{current.integrationUrl}</code>
        <Button type="button" variant="outline" onClick={() => { void navigator.clipboard.writeText(current.integrationUrl ?? '') }}>{props.t('integrationCopy')}</Button>
      </div>}

      <div className={css.actions}>
        <Button type="button" disabled={pending || current?.status === 'closed' || fields.productName.trim() === '' || (!fields.contactEnabled && fields.groupTargets.length === 0)} onClick={() => { void mutate(() => props.saveIntegration(fields, current)) }}>{pending ? props.t('saving') : current === null ? props.t('integrationCreate') : props.t('save')}</Button>
        {current?.status === 'active' && <Button type="button" variant="outline" disabled={pending} onClick={() => { if (window.confirm(props.t('integrationRotateConfirm'))) void mutate(() => props.rotateIntegrationId(current)) }}>{props.t('integrationRotate')}</Button>}
        {current?.status === 'active' && <Button type="button" variant="outline" disabled={pending} onClick={() => { if (window.confirm(props.t('integrationCloseConfirm'))) void mutate(() => props.closeIntegration(current)) }}>{props.t('integrationClose')}</Button>}
      </div>
      {saved && <p className={css.status} role="status">{props.t('saved')}</p>}
      {error !== null && <p className={`${css.status} ${css.error}`} role="alert">{error}</p>}
    </section>
  )
}
