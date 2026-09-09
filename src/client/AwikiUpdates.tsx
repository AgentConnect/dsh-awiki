/** One settings surface; tenant compatibility and Desktop release discovery retain separate owners. */
import { useState, type ReactNode } from 'react'
import { Button, writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives'
import { DSH_AWIKI_PACKAGE_VERSION } from '../package-version.generated.ts'
import { compareVersions } from '../version.ts'
import type { AwikiSettingsSectionProps } from './AwikiSettingsSection.tsx'
import type { AwikiTenantScopeSnapshot } from './settings-controller.ts'
import css from './AwikiSettingsSection.module.css'

type Props = Pick<AwikiSettingsSectionProps, 't' | 'refreshUpdatePolicy'> & { snapshot: AwikiTenantScopeSnapshot }

export function AwikiUpdates(props: Props): ReactNode {
  const { snapshot, t } = props
  const desktop = snapshot.desktop
  const busy = snapshot.updateStatus === 'loading' || snapshot.desktopStatus === 'loading'
  return <div className={css.panel}>
    <div className={css.actions}><Button type="button" variant="outline" disabled={busy || snapshot.value.switching}
      onClick={() => { void props.refreshUpdatePolicy() }}>{busy ? t('updateLoading') : t('updateCheck')}</Button></div>
    {desktop !== undefined && <section className={css.card} aria-label={t('desktopUpdateTitle')}>
      <h3 className={css.cardTitle}>{t('desktopUpdateTitle')}</h3>
      <p className={css.description}>{t('updateCurrent', { version: desktop.currentVersion })}</p>
      <p className={css.description} role="status">{t(snapshot.desktopStatus === 'unavailable' || desktop.state === 'failed' ? 'updateFailed'
        : desktop.state === 'checking' || snapshot.desktopStatus === 'loading' ? 'updateLoading'
          : desktop.state === 'unchecked' ? 'updateUnchecked' : desktop.noRelease ? 'desktopNoRelease'
            : desktop.updateAvailable ? 'updateAvailable' : 'updateLatest', { version: desktop.latestVersion })}</p>
      {desktop.latestVersion !== undefined && !desktop.noRelease && <p className={css.description}>{t('updateRecommended', { version: desktop.latestVersion })}</p>}
      {desktop.usedCache && <p className={css.description}>{t('updateCached')}</p>}
      <p className={css.description}>{t('desktopInstallHelp')}</p>
      <a href={desktop.downloadPageUrl} target="_blank" rel="noopener noreferrer">{t('desktopDownloadPage')}</a>
      <code className={css.updateCommand}>{desktop.downloadPageUrl}</code>
    </section>}
    <PluginUpdate key={`${snapshot.value.activeTenantId}:${snapshot.value.generation}:${snapshot.update?.upgradeCommand ?? ''}:${desktop?.distributionId ?? ''}`} {...props} />
  </div>
}

function PluginUpdate({ snapshot, t }: Props): ReactNode {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const tenant = snapshot.value.tenants.find(value => value.tenantId === snapshot.value.activeTenantId)
  const update = snapshot.update?.tenantId === snapshot.value.activeTenantId ? snapshot.update : undefined
  const desktop = snapshot.desktop
  // The ordinary DSH CLI requires an explicit profile; only Desktop's terminal shim supplies it.
  const command = desktop === undefined
    ? update?.upgradeCommand?.replace(/^dsh plugin add /u, 'dsh plugin --profile YOUR_PROFILE add ')
    : update?.upgradeCommand
  const switching = snapshot.value.switching
  const state = update?.checkState ?? (update === undefined ? 'unchecked' : update.offline ? 'failed' : update.policyUnavailable ? 'unavailable' : 'ready')
  let desktopResolves = false
  try {
    const bundled = desktop?.bundledVersions
    desktopResolves = desktop?.updateAvailable === true && bundled !== undefined
      && update?.recommendedPluginVersion !== undefined
      && compareVersions(bundled.plugin, update.recommendedPluginVersion) >= 0
      && (update.currentModelProxyVersion === undefined || (update.recommendedModelProxyVersion !== undefined
        && bundled.modelProxy !== undefined && compareVersions(bundled.modelProxy, update.recommendedModelProxyVersion) >= 0))
  } catch { /* Incomplete release metadata cannot promise a compatible upgrade. */ }
  const copy = async (): Promise<void> => {
    if (command === undefined || switching) return
    try {
      setCopyState(await writeClipboard(command) ? 'copied' : 'failed')
    } catch { setCopyState('failed') }
  }
  return <section className={css.card} aria-label={t('updateTitle')}>
    <h3 className={css.cardTitle}>{t('updateTitle')}</h3>
    <p className={css.description}>{t('updateTenant', { tenant: tenant?.displayName ?? '' })}</p>
    <p className={css.description}>{t('updateCurrent', { version: update?.currentPluginVersion ?? DSH_AWIKI_PACKAGE_VERSION })}</p>
    {update !== undefined && <>
      {update.currentModelProxyVersion !== undefined && <p className={css.description}>{t('updateModelCurrent', { version: update.currentModelProxyVersion })}</p>}
    </>}
    <p className={css.description} role="status">{t(switching ? 'tenantSwitching'
      : snapshot.updateStatus === 'loading' ? 'updateLoading'
        : snapshot.updateStatus === 'unavailable' || state === 'failed' ? 'updateFailed'
          : state === 'unchecked' ? 'updateUnchecked' : state === 'unavailable' ? 'updateNoPolicy'
            : update?.restricted || update?.modelProxyRestricted ? 'updateRequired'
              : update?.updateAvailable ? 'updateAvailable' : 'updateLatest', { version: update?.recommendedPluginVersion })}</p>
    {update?.recommendedPluginVersion !== undefined && <p className={css.description}>{t('updateRecommended', { version: update.recommendedPluginVersion })}</p>}
    {update?.currentModelProxyVersion !== undefined && update.recommendedModelProxyVersion !== undefined && <p className={css.description}>{t('updateModelRecommended', { version: update.recommendedModelProxyVersion })}</p>}
    {update?.restricted && <p className={`${css.description} ${css.error}`} role="alert">{t('updateRestricted', {
      current: update.currentPluginVersion, minimum: update.minimumPluginVersion, tenant: tenant?.displayName,
    })}</p>}
    {update?.modelProxyRestricted && <p className={`${css.description} ${css.error}`} role="alert">{t('updateModelRestricted', { minimum: update.minimumModelProxyVersion })}</p>}
    {update?.usedCache && <p className={css.description}>{t('updateCached')}</p>}
    {desktop !== undefined && <p className={css.description}>{t(desktopResolves ? 'desktopResolvesPlugin' : 'desktopPluginHelp')}</p>}
    {state === 'ready' && update?.updateAvailable && command === undefined && <p className={css.description}>{t('updateNoCommand')}</p>}
    {command !== undefined && !switching && <>
      <code className={css.updateCommand} tabIndex={0}>{command}</code>
      <p className={css.description}>{t(desktop === undefined ? 'pluginInstallHelp' : 'desktopPluginCommandHelp')}</p>
      <div className={css.actions}><Button type="button" variant="outline" onClick={() => { void copy() }}>{t('updateCopy')}</Button></div>
      <p className={css.description} role="status">{copyState === 'idle' ? '' : t(copyState === 'copied' ? 'updateCopied' : 'updateCopyFailed')}</p>
    </>}
    {<a href={update?.releaseNotesUrl || 'https://github.com/AgentConnect/dsh-awiki#install'} target="_blank" rel="noopener noreferrer">{t('updateGuide')}</a>}
  </section>
}
