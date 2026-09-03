/** AWiki identity and installation settings contributed to DSH settings. */

import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { HostObservable, InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  AWIKI_DOMAIN_FIELD,
  DEFAULT_AWIKI_DOMAIN,
  normalizeAwikiDomain,
} from '../domain.ts'
import type { AwikiSettings } from '../settings.ts'
import type {
  AwikiGroupSnapshot,
  AwikiIntegrationFields,
  AwikiIntegrationView,
} from '../types.ts'
import type { AwikiActionResult, AwikiView } from './controller.ts'
import { AwikiDevices, type AwikiDevicesProps } from './AwikiDevices.tsx'
import { AwikiIntegrationSettings } from './AwikiIntegrationSettings.tsx'
import css from './AwikiSettingsSection.module.css'

/** Browser actions and reactive Host-owned AWiki settings state. */
export interface AwikiSettingsInjected extends Omit<AwikiDevicesProps, 'active' | 'pending'> {
  hooks: {
    /** Host-backed AWiki settings namespace. */
    awikiSettings: SettingsScope<AwikiSettings>
    /** Shared identity state determines whether device management is available. */
    awiki: HostObservable<AwikiView>
  }
  /** Persist a normalized domain. */
  saveDomain: (domain: string) => Promise<void>
  /** Remove the user override and restore the composition default. */
  resetDomain: () => Promise<void>
  /** Permanently remove the Host installation's local AWiki state. */
  clearLocalData: () => Promise<void>
  /** Load the shared identity state when settings is opened before the AWiki overlay. */
  loadAwiki: () => Promise<AwikiActionResult>
  loadIntegration: () => Promise<AwikiActionResult<AwikiIntegrationView | null>>
  saveIntegration: (fields: AwikiIntegrationFields, current: AwikiIntegrationView | null) => Promise<AwikiActionResult<AwikiIntegrationView>>
  rotateIntegrationId: (current: AwikiIntegrationView) => Promise<AwikiActionResult<AwikiIntegrationView>>
  closeIntegration: (current: AwikiIntegrationView) => Promise<AwikiActionResult<AwikiIntegrationView>>
  reopenIntegration: (fields: AwikiIntegrationFields, current: AwikiIntegrationView) => Promise<AwikiActionResult<AwikiIntegrationView>>
  listOwnedGroups: () => Promise<AwikiActionResult<readonly AwikiGroupSnapshot[]>>
  openIntegrationGuide: () => void
}

/** Full composed settings-section props. */
export type AwikiSettingsSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.awiki'>
  & InjectFace<AwikiSettingsInjected>

type Message = { readonly kind: 'saved' | 'error'; readonly text: string }

function hasDomainOverride(snapshot: SettingsScopeSnapshot<AwikiSettings>): boolean {
  return typeof snapshot.user === 'object'
    && snapshot.user !== null
    && !Array.isArray(snapshot.user)
    && Object.hasOwn(snapshot.user, AWIKI_DOMAIN_FIELD)
}

/** Render only the settings owned by the main AWiki identity and messaging plugin. */
export function AwikiSettingsSection(props: AwikiSettingsSectionProps): ReactNode {
  const settings = props.useAwikiSettings(value => value)
  const awiki = props.useAwiki(value => value)
  const [tab, setTab] = useState<'basic' | 'devices' | 'integration'>('basic')
  const tabsId = useId()
  useEffect(() => {
    if (tab === 'devices' && awiki.status === 'cold') void props.loadAwiki()
  }, [awiki.status, props.loadAwiki, tab])
  return (
    <section className={css.section}>
      <div className={css.heading}>
        <h2 className={css.title}>{props.t('nav')}</h2>
        <p className={css.intro}>{props.t('intro')}</p>
      </div>
      <div className={css.tabs} role="tablist" aria-label={props.t('tabsLabel')}>
        <button id={`${tabsId}-basic-tab`} type="button" role="tab" aria-selected={tab === 'basic'} aria-controls={`${tabsId}-basic-panel`} onClick={() => { setTab('basic') }}>{props.t('basicTab')}</button>
        <button id={`${tabsId}-devices-tab`} type="button" role="tab" aria-selected={tab === 'devices'} aria-controls={`${tabsId}-devices-panel`} onClick={() => { setTab('devices') }}>{props.t('devicesTab')}</button>
        <button id={`${tabsId}-integration-tab`} type="button" role="tab" aria-selected={tab === 'integration'} aria-controls={`${tabsId}-integration-panel`} onClick={() => { setTab('integration') }}>{props.t('integrationTab')}</button>
      </div>
      {tab === 'basic' && <div id={`${tabsId}-basic-panel`} role="tabpanel" aria-labelledby={`${tabsId}-basic-tab`}><AdvancedPanel {...props} settings={settings} /></div>}
      {tab === 'devices' && <div id={`${tabsId}-devices-panel`} role="tabpanel" aria-labelledby={`${tabsId}-devices-tab`}>
        {awiki.status === 'cold' || awiki.status === 'loading'
          ? <p className={css.status} role="status">{props.t('devicesLoading')}</p>
          : awiki.status === 'error'
            ? <p className={`${css.status} ${css.error}`} role="alert">{awiki.error}</p>
            : awiki.sessionStatus === 'active'
          ? <AwikiDevices
              active
              pending={awiki.pending !== null}
              refreshDeviceManagement={props.refreshDeviceManagement}
              startDeviceJoinVerification={props.startDeviceJoinVerification}
              approveDeviceJoin={props.approveDeviceJoin}
              rejectDeviceJoin={props.rejectDeviceJoin}
              revokeDevice={props.revokeDevice}
              prepareRootTransfer={props.prepareRootTransfer}
              confirmRootTransfer={props.confirmRootTransfer}
            />
            : <p className={css.notice}>{props.t('devicesUnavailable')}</p>}
      </div>}
      {tab === 'integration' && <div id={`${tabsId}-integration-panel`} role="tabpanel" aria-labelledby={`${tabsId}-integration-tab`}><AwikiIntegrationSettings {...props} /></div>}
    </section>
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
    <div className={css.panel}>
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

export { hasDomainOverride }
