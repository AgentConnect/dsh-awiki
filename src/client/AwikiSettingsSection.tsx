import { AwikiUpdates } from './AwikiUpdates.tsx'
import { AwikiDraftProvider, useDraftState, type AwikiDraftStore } from './drafts.tsx'
/** AWiki tenant, local-data, and optional-integration settings. */

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { HostObservable, InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SettingsScope } from '@deepseek-ai/dsh-client-ui-settings/client'
import { normalizeAwikiDomain } from '../domain.ts'
import type { AwikiSettings } from '../settings.ts'
import type { AwikiGroupSnapshot, AwikiIntegrationFields, AwikiIntegrationView } from '../types.ts'
import type { AwikiTenantRpcProfile } from '../settings-rpc-contract.ts'
import type { AwikiActionResult, AwikiView } from './controller.ts'
import type { AwikiTenantScope, AwikiTenantScopeSnapshot } from './settings-controller.ts'
import { AwikiDevices, type AwikiDevicesProps } from './AwikiDevices.tsx'
import { AwikiIntegrationSettings } from './AwikiIntegrationSettings.tsx'
import css from './AwikiSettingsSection.module.css'

export interface AwikiSettingsInjected extends Omit<AwikiDevicesProps, 'active' | 'pending'> {
  drafts?: AwikiDraftStore
  hooks: {
    awikiTenants: AwikiTenantScope
    awikiSettings: SettingsScope<AwikiSettings>
    awiki: HostObservable<AwikiView>
  }
  /** Legacy migration setting retained for older browser bundles. */
  saveDomain: (domain: string) => Promise<void>
  /** Legacy migration setting retained for older browser bundles. */
  resetDomain: () => Promise<void>
  createTenant: (displayName: string, domain: string) => Promise<void>
  renameTenant: (tenantId: string, displayName: string) => Promise<void>
  switchTenant: (tenantId: string) => Promise<void>
  archiveTenant: (tenantId: string) => Promise<void>
  refreshUpdatePolicy: () => Promise<void>
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

export type AwikiSettingsSectionProps = PropsRuntime<'settings.section'>
  & PropsLocale<'settings.awiki'>
  & InjectFace<AwikiSettingsInjected>

type Tab = 'tenants' | 'updates' | 'devices' | 'local' | 'integration'
type Message = { readonly kind: 'saved' | 'error'; readonly text: string }

export function AwikiSettingsSection(props: AwikiSettingsSectionProps): ReactNode {
  return <AwikiDraftProvider store={props.drafts}><AwikiSettingsContent {...props} /></AwikiDraftProvider>
}

function AwikiSettingsContent(props: AwikiSettingsSectionProps): ReactNode {
  const [tab, setTab] = useState<Tab>('tenants')
  const tenantSnapshot = props.useAwikiTenants(value => value)
  const awiki = props.useAwiki(value => value)
  const restricted = tenantSnapshot.status === 'ready' && tenantSnapshot.update?.restricted === true
  const tabs: readonly { readonly id: Tab; readonly label: string }[] = restricted ? [
    { id: 'tenants', label: props.t('tenantTab') },
    { id: 'updates', label: props.t('updatesTab') },
  ] : [
    { id: 'tenants', label: props.t('tenantTab') },
    { id: 'updates', label: props.t('updatesTab') },
    { id: 'devices', label: props.t('devicesTab') },
    { id: 'local', label: props.t('localDataTab') },
    { id: 'integration', label: props.t('integrationTab') },
  ]
  useEffect(() => {
    if (restricted && tab !== 'tenants' && tab !== 'updates') setTab('updates')
  }, [restricted, tab])
  useEffect(() => {
    if (!restricted && (tab === 'devices' || tab === 'integration') && awiki.status === 'cold') void props.loadAwiki()
  }, [awiki.status, props.loadAwiki, restricted, tab])
  return (
    <section className={css.section}>
      <div className={css.heading}>
        <h2 className={css.title}>{props.t('nav')}</h2>
        <p className={css.intro}>{props.t('intro')}</p>
      </div>
      {restricted && <p className={css.error} role="alert">{props.t('updateRequired')} <Button type="button" variant="outline" onClick={() => { setTab('updates') }}>{props.t('updatesTab')}</Button></p>}
      <div className={css.tabs} role="tablist" aria-label={props.t('tabsLabel')}>
        {tabs.map(item => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={`${css.tab} ${tab === item.id ? css.tabActive : ''}`} onClick={() => { setTab(item.id) }}>{item.label}{item.id === 'updates' && (tenantSnapshot.update?.updateAvailable || tenantSnapshot.desktop?.updateAvailable || restricted) && <span aria-hidden="true"> ●</span>}</button>)}
      </div>
      <div role="tabpanel">
        {tab === 'tenants' && <TenantPanel {...props} />}
        {tab === 'updates' && <AwikiUpdates {...props} snapshot={tenantSnapshot} />}
        {!restricted && tab === 'devices' && (awiki.status === 'cold' || awiki.status === 'loading'
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
              : <p className={css.notice}>{props.t('devicesUnavailable')}</p>)}
        {!restricted && tab === 'local' && <LocalDataPanel key={tenantSnapshot.status === 'ready' ? `${tenantSnapshot.value.activeTenantId}:${tenantSnapshot.value.generation}:${tenantSnapshot.value.switching}` : 'unavailable'} {...props} disabled={tenantSnapshot.status !== 'ready' || tenantSnapshot.value.switching} />}
        {!restricted && tab === 'integration' && (tenantSnapshot.status !== 'ready' || tenantSnapshot.value.switching || awiki.status === 'cold' || awiki.status === 'loading'
          ? <p className={css.status} role="status">{props.t('integrationLoading')}</p>
          : <AwikiIntegrationSettings key={`${tenantSnapshot.status === 'ready' ? tenantSnapshot.value.activeTenantId : 'unavailable'}:${awiki.identity?.did ?? 'no-identity'}`} {...props} />)}
      </div>
    </section>
  )
}

function TenantPanel(props: AwikiSettingsSectionProps): ReactNode {
  const snapshot = props.useAwikiTenants(value => value)
  const [name, setName] = useDraftState('settings:tenant-name', '')
  const [domain, setDomain] = useDraftState('settings:tenant-domain', '')
  const [pending, setPending] = useDraftState('settings:tenant-pending', false, false)
  const [status, setStatus] = useState<Message | null>(null)

  if (snapshot.status === 'loading') return <p className={css.status}>{props.t('tenantLoading')}</p>
  if (snapshot.status !== 'ready') return <p className={`${css.status} ${css.error}`} role="alert">{props.t('tenantUnavailable')}</p>
  const disabled = pending || snapshot.value.switching
  const restricted = snapshot.update?.restricted === true
  const create = async (event: FormEvent): Promise<void> => {
    event.preventDefault()
    let normalized: string
    try { normalized = normalizeAwikiDomain(domain) } catch {
      setStatus({ kind: 'error', text: props.t('invalidDomain') })
      return
    }
    setPending(true)
    setStatus(null)
    try {
      await props.createTenant(name.trim(), normalized)
      setName('')
      setDomain('')
      setStatus({ kind: 'saved', text: props.t('tenantCreated') })
    } catch (error) {
      setStatus({ kind: 'error', text: error instanceof Error ? error.message : props.t('tenantChangeFailed') })
    } finally { setPending(false) }
  }
  return (
    <div className={css.panel}>
      {snapshot.value.diagnostic !== undefined && <p className={`${css.notice} ${css.error}`} role="alert">{props.t('tenantDiagnostic')}</p>}
      <div className={css.tenantList}>
        {snapshot.value.tenants.filter(tenant => tenant.lifecycle !== 'archived').map(tenant => <TenantRow key={tenant.tenantId} {...props} tenant={tenant} disabled={disabled} managementDisabled={restricted} setPending={setPending} setStatus={setStatus} />)}
      </div>
      {!restricted && <form className={css.card} onSubmit={(event) => { void create(event) }}>
        <h3 className={css.cardTitle}>{props.t('tenantAdd')}</h3>
        <label className={css.label} htmlFor="awiki-tenant-name">{props.t('tenantName')}</label>
        <input id="awiki-tenant-name" className={css.input} value={name} disabled={disabled} maxLength={80} onChange={event => { setName(event.target.value) }} />
        <label className={css.label} htmlFor="awiki-tenant-domain">{props.t('tenantDomain')}</label>
        <input id="awiki-tenant-domain" className={css.input} value={domain} disabled={disabled} spellCheck={false} autoCapitalize="none" autoCorrect="off" inputMode="url" placeholder="tenant.example" onChange={event => { setDomain(event.target.value) }} />
        <p className={css.description}>{props.t('tenantDomainHelp')}</p>
        <div className={css.actions}><Button type="submit" disabled={disabled || name.trim() === '' || domain.trim() === ''}>{props.t('tenantCreate')}</Button></div>
      </form>}
      <p className={`${css.status} ${status?.kind === 'error' ? css.error : ''}`} role="status">{status?.text ?? (snapshot.value.switching ? props.t('tenantSwitching') : '')}</p>
    </div>
  )
}


function TenantRow(props: AwikiSettingsSectionProps & { readonly tenant: AwikiTenantRpcProfile; readonly disabled: boolean; readonly managementDisabled: boolean; readonly setPending: (value: boolean) => void; readonly setStatus: (value: Message | null) => void }): ReactNode {
  const [draftName, setDraftName] = useState(props.tenant.displayName)
  const run = async (operation: () => Promise<void>, success: string): Promise<void> => {
    props.setPending(true)
    props.setStatus(null)
    try {
      await operation()
      props.setStatus({ kind: 'saved', text: success })
    } catch (error) {
      props.setStatus({ kind: 'error', text: error instanceof Error ? error.message : props.t('tenantChangeFailed') })
    } finally { props.setPending(false) }
  }
  const current = props.tenant.lifecycle === 'active'
  const localizedDisplayName = props.tenant.displayNames === undefined
    ? props.tenant.displayName
    : (typeof document !== 'undefined' && document.documentElement.lang.toLowerCase().startsWith('zh')
        ? props.tenant.displayNames['zh-CN']
        : props.tenant.displayNames.en)
  return (
    <article className={`${css.tenantRow} ${current ? css.tenantCurrent : ''}`}>
      <div className={css.tenantCopy}>
        {props.tenant.kind === 'custom' && !props.managementDisabled ? <input aria-label={props.t('tenantName')} className={css.inlineInput} value={draftName} disabled={props.disabled} maxLength={80} onChange={event => { setDraftName(event.target.value) }} /> : <strong>{localizedDisplayName}</strong>}
        <span className={css.tenantMeta}>{props.tenant.didHost}</span>
        <span className={css.tenantBadges}><span>{props.tenant.kind === 'built_in' ? props.t('tenantOfficial') : props.t('tenantCustom')}</span>{current && <span>{props.t('tenantCurrent')}</span>}</span>
      </div>
      <div className={css.actions}>
        {!current && <Button type="button" disabled={props.disabled} onClick={() => { void run(() => props.switchTenant(props.tenant.tenantId), props.t('tenantSwitched')) }}>{props.t('tenantSwitch')}</Button>}
        {props.tenant.kind === 'custom' && !props.managementDisabled && <>
          <Button type="button" variant="outline" disabled={props.disabled || draftName.trim() === '' || draftName === props.tenant.displayName} onClick={() => { void run(() => props.renameTenant(props.tenant.tenantId, draftName.trim()), props.t('tenantRenamed')) }}>{props.t('save')}</Button>
          {!current && <Button type="button" variant="outline" disabled={props.disabled} onClick={() => { void run(() => props.archiveTenant(props.tenant.tenantId), props.t('tenantArchived')) }}>{props.t('tenantArchive')}</Button>}
        </>}
      </div>
    </article>
  )
}

function LocalDataPanel(props: AwikiSettingsSectionProps & { readonly disabled: boolean }): ReactNode {
  const [clearOpen, setClearOpen] = useState(false)
  const [clearDraft, setClearDraft] = useState('')
  const [clearing, setClearing] = useState(false)
  const [status, setStatus] = useState<Message | null>(null)
  const close = (): void => {
    if (clearing) return
    setClearOpen(false)
    setClearDraft('')
  }
  const clear = async (): Promise<void> => {
    if (props.disabled || clearDraft !== props.t('clearConfirmationPhrase')) return
    setClearing(true)
    setStatus(null)
    try {
      await props.clearLocalData()
      setClearOpen(false)
      setClearDraft('')
      setStatus({ kind: 'saved', text: props.t('clearSucceeded') })
    } catch { setStatus({ kind: 'error', text: props.t('clearFailed') }) } finally { setClearing(false) }
  }
  return <div className={css.panel}>
    <p className={css.notice}>{props.t('localDataNotice')}</p>
    <section className={css.dangerZone} aria-labelledby="awiki-danger-zone-title">
      <div className={css.dangerCopy}><h3 id="awiki-danger-zone-title" className={css.dangerTitle}>{props.t('dangerTitle')}</h3><p className={css.dangerDescription}>{props.t('dangerDescription')}</p></div>
      <Button type="button" variant="outline" className={css.dangerButton} disabled={clearing || props.disabled} onClick={() => { setStatus(null); setClearOpen(true) }}>{props.t('clearLocalData')}</Button>
      <p className={`${css.status} ${status?.kind === 'error' ? css.error : ''}`} role="status">{status?.text ?? ''}</p>
    </section>
    <Modal open={clearOpen} onClose={close} title={props.t('clearDialogTitle')} closeLabel={props.t('cancel')} description={props.t('clearDialogDescription')} className={css.clearDialog ?? ''} footer={<><Button type="button" variant="outline" disabled={clearing} onClick={close}>{props.t('cancel')}</Button><Button type="button" variant="outline" className={css.clearConfirmButton} disabled={clearing || clearDraft !== props.t('clearConfirmationPhrase')} onClick={() => { void clear() }}>{clearing ? props.t('clearing') : props.t('clearConfirm')}</Button></>}>
      <div className={css.clearWarning}><p>{props.t('clearScope')}</p><p>{props.t('clearRemoteNotice')}</p></div>
      <label className={css.confirmLabel} htmlFor="awiki-clear-confirmation">{props.t('clearConfirmationLabel', { phrase: props.t('clearConfirmationPhrase') })}</label>
      <input id="awiki-clear-confirmation" className={css.input} value={clearDraft} disabled={clearing} autoComplete="off" spellCheck={false} autoFocus onChange={event => { setClearDraft(event.target.value) }} />
    </Modal>
  </div>
}
