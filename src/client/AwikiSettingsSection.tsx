/** AWiki tenant, local-data, and optional-integration settings. */

import { useState, type FormEvent, type ReactNode } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import { normalizeAwikiDomain } from '../domain.ts'
import type { AwikiSettings } from '../settings.ts'
import type { AwikiGroupSnapshot, AwikiIntegrationFields, AwikiIntegrationView } from '../types.ts'
import type { AwikiTenantRpcProfile } from '../settings-rpc-contract.ts'
import type { AwikiActionResult } from './controller.ts'
import type { AwikiTenantScope, AwikiTenantScopeSnapshot } from './settings-controller.ts'
import { AwikiIntegrationSettings } from './AwikiIntegrationSettings.tsx'
import css from './AwikiSettingsSection.module.css'

export interface AwikiSettingsInjected {
  hooks: { awikiTenants: AwikiTenantScope; awikiSettings: SettingsScope<AwikiSettings> }
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

type Tab = 'tenants' | 'local' | 'integration'
type Message = { readonly kind: 'saved' | 'error'; readonly text: string }

export function AwikiSettingsSection(props: AwikiSettingsSectionProps): ReactNode {
  const [tab, setTab] = useState<Tab>('tenants')
  const tabs: readonly { readonly id: Tab; readonly label: string }[] = [
    { id: 'tenants', label: props.t('tenantTab') },
    { id: 'local', label: props.t('localDataTab') },
    { id: 'integration', label: props.t('integrationTab') },
  ]
  return (
    <section className={css.section}>
      <div className={css.heading}>
        <h2 className={css.title}>{props.t('nav')}</h2>
        <p className={css.intro}>{props.t('intro')}</p>
      </div>
      <div className={css.tabs} role="tablist" aria-label={props.t('nav')}>
        {tabs.map(item => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={`${css.tab} ${tab === item.id ? css.tabActive : ''}`} onClick={() => { setTab(item.id) }}>{item.label}</button>)}
      </div>
      <div role="tabpanel">
        {tab === 'tenants' && <TenantPanel {...props} />}
        {tab === 'local' && <LocalDataPanel {...props} />}
        {tab === 'integration' && <AwikiIntegrationSettings {...props} />}
      </div>
    </section>
  )
}

function TenantPanel(props: AwikiSettingsSectionProps): ReactNode {
  const snapshot = props.useAwikiTenants(value => value)
  const [name, setName] = useState('')
  const [domain, setDomain] = useState('')
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<Message | null>(null)

  if (snapshot.status === 'loading') return <p className={css.status}>{props.t('tenantLoading')}</p>
  if (snapshot.status !== 'ready') return <p className={`${css.status} ${css.error}`} role="alert">{props.t('tenantUnavailable')}</p>
  const disabled = pending || snapshot.value.switching
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
        {snapshot.value.tenants.filter(tenant => tenant.lifecycle !== 'archived').map(tenant => <TenantRow key={tenant.tenantId} {...props} tenant={tenant} disabled={disabled} setPending={setPending} setStatus={setStatus} />)}
      </div>
      <UpdatePolicyCard {...props} snapshot={snapshot} disabled={disabled} />
      <form className={css.card} onSubmit={(event) => { void create(event) }}>
        <h3 className={css.cardTitle}>{props.t('tenantAdd')}</h3>
        <label className={css.label} htmlFor="awiki-tenant-name">{props.t('tenantName')}</label>
        <input id="awiki-tenant-name" className={css.input} value={name} disabled={disabled} maxLength={80} onChange={event => { setName(event.target.value) }} />
        <label className={css.label} htmlFor="awiki-tenant-domain">{props.t('tenantDomain')}</label>
        <input id="awiki-tenant-domain" className={css.input} value={domain} disabled={disabled} spellCheck={false} autoCapitalize="none" autoCorrect="off" inputMode="url" placeholder="tenant.example" onChange={event => { setDomain(event.target.value) }} />
        <p className={css.description}>{props.t('tenantDomainHelp')}</p>
        <div className={css.actions}><Button type="submit" disabled={disabled || name.trim() === '' || domain.trim() === ''}>{props.t('tenantCreate')}</Button></div>
      </form>
      <p className={`${css.status} ${status?.kind === 'error' ? css.error : ''}`} role="status">{status?.text ?? (snapshot.value.switching ? props.t('tenantSwitching') : '')}</p>
    </div>
  )
}

function UpdatePolicyCard(
  props: AwikiSettingsSectionProps & {
    readonly snapshot: AwikiTenantScopeSnapshot
    readonly disabled: boolean
  },
): ReactNode {
  const update = props.snapshot.update
  const command = update === undefined
    ? ''
    : `dsh plugin --profile web add @awiki/dsh-plugin@${update.recommendedPluginVersion ?? update.currentPluginVersion}${update.currentModelProxyVersion === undefined ? '' : ` @awiki/dsh-model-proxy@${update.recommendedModelProxyVersion ?? update.currentModelProxyVersion}`}`
  const copy = async (): Promise<void> => {
    if (command !== '') await navigator.clipboard.writeText(command)
  }
  return <section className={css.card} aria-labelledby="awiki-update-title">
    <h3 id="awiki-update-title" className={css.cardTitle}>{props.t('updateTitle')}</h3>
    {props.snapshot.updateStatus === 'loading' && <p className={css.description}>{props.t('updateLoading')}</p>}
    {props.snapshot.updateStatus === 'unavailable' && <p className={css.description}>{props.t('updateUnavailable')}</p>}
    {update?.policyUnavailable === true && <p className={css.description}>{props.t('updateNoPolicy')}</p>}
    {update !== undefined && !update.policyUnavailable && <>
      <p className={css.description}>{props.t(update.restricted ? 'updateRestricted' : 'updateVersions', {
        current: update.currentPluginVersion,
        recommended: update.recommendedPluginVersion ?? update.currentPluginVersion,
        minimum: update.minimumPluginVersion ?? update.currentPluginVersion,
      })}</p>
      {command !== '' && <code className={css.updateCommand}>{command}</code>}
      <p className={css.description}>{props.t('updateRestart')}</p>
    </>}
    <div className={css.actions}>
      <Button type="button" variant="outline" disabled={props.disabled || props.snapshot.updateStatus === 'loading'} onClick={() => { void props.refreshUpdatePolicy() }}>{props.t('updateCheck')}</Button>
      {command !== '' && <Button type="button" variant="outline" disabled={props.disabled} onClick={() => { void copy() }}>{props.t('updateCopy')}</Button>}
    </div>
  </section>
}

function TenantRow(props: AwikiSettingsSectionProps & { readonly tenant: AwikiTenantRpcProfile; readonly disabled: boolean; readonly setPending: (value: boolean) => void; readonly setStatus: (value: Message | null) => void }): ReactNode {
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
  return (
    <article className={`${css.tenantRow} ${current ? css.tenantCurrent : ''}`}>
      <div className={css.tenantCopy}>
        {props.tenant.kind === 'custom' ? <input aria-label={props.t('tenantName')} className={css.inlineInput} value={draftName} disabled={props.disabled} maxLength={80} onChange={event => { setDraftName(event.target.value) }} /> : <strong>{props.tenant.displayName}</strong>}
        <span className={css.tenantMeta}>{props.tenant.didHost}</span>
        <span className={css.tenantBadges}><span>{props.tenant.kind === 'built_in' ? props.t('tenantOfficial') : props.t('tenantCustom')}</span>{current && <span>{props.t('tenantCurrent')}</span>}</span>
      </div>
      <div className={css.actions}>
        {!current && <Button type="button" disabled={props.disabled} onClick={() => { void run(() => props.switchTenant(props.tenant.tenantId), props.t('tenantSwitched')) }}>{props.t('tenantSwitch')}</Button>}
        {props.tenant.kind === 'custom' && <>
          <Button type="button" variant="outline" disabled={props.disabled || draftName.trim() === '' || draftName === props.tenant.displayName} onClick={() => { void run(() => props.renameTenant(props.tenant.tenantId, draftName.trim()), props.t('tenantRenamed')) }}>{props.t('save')}</Button>
          {!current && <Button type="button" variant="outline" disabled={props.disabled} onClick={() => { void run(() => props.archiveTenant(props.tenant.tenantId), props.t('tenantArchived')) }}>{props.t('tenantArchive')}</Button>}
        </>}
      </div>
    </article>
  )
}

function LocalDataPanel(props: AwikiSettingsSectionProps): ReactNode {
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
    if (clearDraft !== props.t('clearConfirmationPhrase')) return
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
      <Button type="button" variant="outline" className={css.dangerButton} disabled={clearing} onClick={() => { setStatus(null); setClearOpen(true) }}>{props.t('clearLocalData')}</Button>
      <p className={`${css.status} ${status?.kind === 'error' ? css.error : ''}`} role="status">{status?.text ?? ''}</p>
    </section>
    <Modal open={clearOpen} onClose={close} title={props.t('clearDialogTitle')} closeLabel={props.t('cancel')} description={props.t('clearDialogDescription')} className={css.clearDialog ?? ''} footer={<><Button type="button" variant="outline" disabled={clearing} onClick={close}>{props.t('cancel')}</Button><Button type="button" variant="outline" className={css.clearConfirmButton} disabled={clearing || clearDraft !== props.t('clearConfirmationPhrase')} onClick={() => { void clear() }}>{clearing ? props.t('clearing') : props.t('clearConfirm')}</Button></>}>
      <div className={css.clearWarning}><p>{props.t('clearScope')}</p><p>{props.t('clearRemoteNotice')}</p></div>
      <label className={css.confirmLabel} htmlFor="awiki-clear-confirmation">{props.t('clearConfirmationLabel', { phrase: props.t('clearConfirmationPhrase') })}</label>
      <input id="awiki-clear-confirmation" className={css.input} value={clearDraft} disabled={clearing} autoComplete="off" spellCheck={false} autoFocus onChange={event => { setClearDraft(event.target.value) }} />
    </Modal>
  </div>
}
