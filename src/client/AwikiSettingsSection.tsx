/** AWiki settings page contributed to the DSH settings navigation. */

import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  AWIKI_DOMAIN_FIELD,
  DEFAULT_AWIKI_DOMAIN,
  normalizeAwikiDomain,
} from '../domain.ts'
import type { AwikiSettings } from '../settings.ts'
import type { AwikiSettingsKey } from './settings-locales.ts'
import css from './AwikiSettingsSection.module.css'

/** Browser actions and reactive Host settings state. */
export interface AwikiSettingsInjected {
  hooks: {
    /** Host-backed AWiki settings namespace. */
    awikiSettings: SettingsScope<AwikiSettings>
  }
  /** Persist a normalized domain. */
  saveDomain: (domain: string) => Promise<void>
  /** Remove the user override and restore the composition default. */
  resetDomain: () => Promise<void>
}

/** Full composed settings-section props. */
export type AwikiSettingsSectionProps =
  PropsRuntime<'settings.section'>
  & PropsLocale<'settings.awiki'>
  & InjectFace<AwikiSettingsInjected>

function hasDomainOverride(snapshot: SettingsScopeSnapshot<AwikiSettings>): boolean {
  return typeof snapshot.user === 'object'
    && snapshot.user !== null
    && !Array.isArray(snapshot.user)
    && Object.hasOwn(snapshot.user, AWIKI_DOMAIN_FIELD)
}

/** Render a durable default-domain editor in the native DSH settings shell. */
export function AwikiSettingsSection(props: AwikiSettingsSectionProps): ReactNode {
  const { t, useAwikiSettings } = props
  const settings = useAwikiSettings(value => value)
  const current = settings.value?.domain ?? DEFAULT_AWIKI_DOMAIN
  const overridden = hasDomainOverride(settings)
  const [draft, setDraft] = useState(current)
  const [edited, setEdited] = useState(false)
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<{ kind: 'saved' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (edited) return
    setDraft(current)
  }, [current, edited])

  if (settings.status === 'loading') {
    return <p className={css.status}>{t('loading')}</p>
  }

  const unavailable = settings.status !== 'ready' || settings.mode !== 'host'
  const disabled = unavailable || !settings.writable || pending

  const save = async (event?: FormEvent): Promise<void> => {
    event?.preventDefault()
    let normalized: string
    try {
      normalized = normalizeAwikiDomain(draft)
    } catch {
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
    } catch {
      setStatus({ kind: 'error', text: t('saveFailed') })
    } finally {
      setPending(false)
    }
  }

  const reset = async (): Promise<void> => {
    setPending(true)
    setStatus(null)
    try {
      await props.resetDomain()
      setEdited(false)
      setStatus({ kind: 'saved', text: `${t('saved')} ${t('restartNotice')}` })
    } catch {
      setStatus({ kind: 'error', text: t('saveFailed') })
    } finally {
      setPending(false)
    }
  }

  return (
    <section className={css.section}>
      <div className={css.heading}>
        <h2 className={css.title}>{t('nav')}</h2>
        <p className={css.intro}>{t('intro')}</p>
      </div>
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
          onChange={(event) => {
            setDraft(event.target.value)
            setEdited(true)
            setStatus(null)
          }}
        />
        <p className={css.defaultValue}>{t('defaultValue', { domain: DEFAULT_AWIKI_DOMAIN })}</p>
        <div className={css.actions}>
          <Button type="submit" disabled={disabled || !edited || draft.trim() === ''}>
            {pending ? t('saving') : t('save')}
          </Button>
          <Button type="button" variant="outline" disabled={disabled || !overridden} onClick={() => { void reset() }}>
            {t('reset')}
          </Button>
        </div>
        {unavailable
          ? <p className={`${css.status} ${css.error}`} role="alert">{t('unavailable')}</p>
          : !settings.writable
            ? <p className={`${css.status} ${css.error}`} role="alert">{t('readOnly')}</p>
            : <p className={`${css.status} ${status?.kind === 'error' ? css.error : ''}`} role="status">{status?.text ?? ''}</p>}
      </form>
      <p className={css.notice}>{t('identityNotice')}</p>
    </section>
  )
}

export { hasDomainOverride }
