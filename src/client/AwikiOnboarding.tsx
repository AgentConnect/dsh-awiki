/** AWiki identity and model opt-in step shown before the official API-key step. */

import { useEffect, type ReactNode } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { AwikiController, AwikiView } from './controller.ts'
import type { AwikiModelProxyController, AwikiModelProxyView } from './model-proxy-controller.ts'
import { AwikiRegistrationForm } from './AwikiOverlay.tsx'
import css from './AwikiOnboarding.module.css'

export interface AwikiOnboardingInjected {
  hooks: {
    awikiOnboarding: AwikiController
    awikiModelProxy: AwikiModelProxyController
  }
  identity: AwikiController
  models: AwikiModelProxyController
}

export type AwikiOnboardingProps =
  PropsRuntime<'settings.onboarding'>
  & { readonly dismiss?: () => void }
  & PropsLocale<'settings.awiki'>
  & InjectFace<AwikiOnboardingInjected>

export function AwikiOnboarding(props: AwikiOnboardingProps): ReactNode {
  const { t } = props
  const dismiss = props.dismiss ?? props.complete
  const identity = props.useAwikiOnboarding((value: AwikiView) => value)
  const models = props.useAwikiModelProxy((value: AwikiModelProxyView) => value)

  useEffect(() => {
    if (identity.status === 'cold') void props.identity.loadSession()
  }, [identity.status, props.identity])

  useEffect(() => {
    if (identity.status === 'ready' && identity.sessionStatus === 'active' && models.status === 'idle') {
      void props.models.load()
    }
  }, [identity.sessionStatus, identity.status, models.status, props.models])

  useEffect(() => {
    if (models.account?.enabled === true) props.complete()
  }, [models.account?.enabled, props.complete])

  if (identity.status === 'cold' || identity.status === 'loading' || models.account?.enabled === true) return null

  const alternatives = <>
    <Button type="button" variant="outline" onClick={props.complete}>{t('onboardingUseApiKey')}</Button>
    <Button type="button" variant="outline" onClick={dismiss}>{t('onboardingLater')}</Button>
  </>

  if (identity.status === 'error') {
    return (
      <OnboardingModal title={t('onboardingConnectTitle')} closeLabel={t('onboardingClose')} onClose={dismiss}>
        <p className={css.description}>{identity.error ?? t('onboardingIdentityUnavailable')}</p>
        <div className={css.actions}>{alternatives}</div>
      </OnboardingModal>
    )
  }

  if (identity.sessionStatus === 'unregistered') {
    return (
      <OnboardingModal title={t('onboardingModelTitle')} closeLabel={t('onboardingClose')} onClose={dismiss}>
        <p className={css.description}>{t('onboardingRegistrationDescription')}</p>
        <AwikiRegistrationForm
          pending={identity.pending !== null}
          autoFocusHandle
          sendRegistrationOtp={request => props.identity.sendRegistrationOtp(request)}
          registerIdentity={request => props.identity.registerIdentity(request)}
        />
        <div className={css.actions}>{alternatives}</div>
      </OnboardingModal>
    )
  }

  if (identity.sessionStatus === 'signed-out') {
    return (
      <OnboardingModal title={t('onboardingRestoreTitle')} closeLabel={t('onboardingClose')} onClose={dismiss}>
        <p className={css.description}>{t('onboardingRestoreDescription')}</p>
        <div className={css.actions}>
          <Button type="button" disabled={identity.pending !== null} onClick={() => { void props.identity.login() }}>{t('onboardingRestore')}</Button>
          {alternatives}
        </div>
      </OnboardingModal>
    )
  }

  if (models.status === 'idle' || models.status === 'loading') return null
  const account = models.account?.account
  return (
    <OnboardingModal title={t('onboardingEnableTitle')} closeLabel={t('onboardingClose')} onClose={dismiss}>
      {models.status === 'unavailable' || account === undefined ? (
        <p className={css.error} role="alert">{models.error ?? t('modelAccountUnavailable')}</p>
      ) : (
        <>
          <div className={css.accountRow}>
            <span>{t('accountBalance')}</span>
            <strong>{account.balance} {account.currency}</strong>
          </div>
          <p className={css.description}>
            {account.billing_mode === 'development_bypass'
              ? t('onboardingBypassDescription')
              : t('onboardingStrictDescription')}
          </p>
          {!account.payments_available && <p className={css.notice}>{t('paymentsUnavailable')}</p>}
        </>
      )}
      <div className={css.actions}>
        <Button
          type="button"
          disabled={account?.model_access_available !== true || models.pending !== null}
          onClick={() => { void props.models.setEnabled(true) }}
        >
          {models.pending === 'enable' ? t('enablingModels') : t('enableModels')}
        </Button>
        {account?.model_access_available === false
          ? <Button type="button" variant="outline" onClick={() => { props.openSection('awiki') }}>{t('tabAccount')}</Button>
          : alternatives}
      </div>
    </OnboardingModal>
  )
}

function OnboardingModal({ title, closeLabel, onClose, children }: {
  title: string
  closeLabel: string
  onClose: () => void
  children: ReactNode
}): ReactNode {
  useEffect(() => {
    const root = document.getElementById('root')
    if (root === null) return
    const previous = root.inert
    root.inert = true
    return () => { root.inert = previous }
  }, [])
  return (
    <Modal open title={title} closeLabel={closeLabel} onClose={onClose} className={css.dialog ?? ''} contentClassName={css.modalContent as string}>
      <div className={css.content}>
        {children}
      </div>
    </Modal>
  )
}
