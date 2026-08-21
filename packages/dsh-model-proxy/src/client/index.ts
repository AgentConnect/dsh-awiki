/** Model Proxy browser plugin: Quick Recharge settings and hosted-model onboarding. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { AwikiClientBridge } from '@awiki/dsh-plugin/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import { AwikiOnboarding, type AwikiOnboardingInjected } from './AwikiOnboarding.tsx'
import { ModelProxySettingsSection, type ModelProxySettingsInjected } from './ModelProxySettingsSection.tsx'
import { ModelAvailabilityController } from './model-availability-controller.ts'
import { AwikiModelProxyController } from './model-proxy-controller.ts'
import { AWIKI_RECHARGE_ENABLED } from './recharge-availability.ts'
import { en, zh } from './settings-locales.ts'

export type { AwikiOnboardingInjected, AwikiOnboardingProps } from './AwikiOnboarding.tsx'
export type { ModelProxySettingsInjected, ModelProxySettingsSectionProps } from './ModelProxySettingsSection.tsx'
export type { ModelAvailabilityView } from './model-availability-controller.ts'
export type { AwikiModelProxyView } from './model-proxy-controller.ts'

/** Required services supplied by the main AWiki client and DSH browser runtime. */
export const inject = ['slots', 'remote', 'connection', 'locale', 'awikiClient']

/** Register Model Proxy-owned Browser surfaces only when this package is installed. */
export async function apply(ctx: ClientContext): Promise<() => void> {
  const connection = ctx.get('connection') as unknown as ConnectionHandle | undefined
  if (connection === undefined) throw new Error('ui-awiki-model-proxy: Connection service is unavailable')
  const awikiClient = ctx.get('awikiClient') as unknown as AwikiClientBridge | undefined
  if (awikiClient === undefined) throw new Error('ui-awiki-model-proxy: AWiki client bridge is unavailable')

  const identity = awikiClient.identity
  const availability = new ModelAvailabilityController(connection)
  const models = new AwikiModelProxyController(connection, identity, AWIKI_RECHARGE_ENABLED)
  let disposeSettings: (() => void) | undefined
  let disposeOnboarding: (() => void) | undefined
  try {
    await models.probe()
    ctx.effect(() => {
      const disposeZh = ctx.locale.register('settings.awiki-model-proxy', 'zh', zh)
      const disposeEn = ctx.locale.register('settings.awiki-model-proxy', 'en', en)
      return () => { disposeEn(); disposeZh() }
    }, 'ui-awiki-model-proxy: settings dictionaries')
    ctx.effect(() => {
      const refresh = (): void => { availability.refreshIfLoaded() }
      const disposers = [
        ctx.remote.$on('settings/document-updated', refresh),
        ctx.remote.$on('credentials/updated', refresh),
        ctx.remote.$on('llm/adapters-updated', refresh),
        ctx.on('connection/reset', refresh),
      ]
      return () => { for (const dispose of disposers) dispose() }
    }, 'ui-awiki-model-proxy: model availability invalidations')

    disposeSettings = ctx.slots.inject('settings.section', () => ctx.slots.register({
      name: 'settings.section',
      id: 'awiki-model-proxy',
      order: 31,
      label: () => ctx.locale.bind('settings.awiki-model-proxy')('nav'),
      locale: 'settings.awiki-model-proxy',
      inject: (): ModelProxySettingsInjected => ({
        hooks: { awikiModelProxy: models, awikiSession: identity },
        identity,
        models,
        rechargeEnabled: AWIKI_RECHARGE_ENABLED,
      }),
    }, ModelProxySettingsSection))
    disposeOnboarding = ctx.slots.inject('settings.onboarding', () => ctx.slots.register({
      name: 'settings.onboarding',
      id: 'awiki-model-proxy',
      order: -10,
      locale: 'settings.awiki-model-proxy',
      inject: (): AwikiOnboardingInjected => ({
        hooks: { awikiOnboarding: identity, awikiModelAvailability: availability, awikiModelProxy: models },
        identity,
        IdentityAccess: awikiClient.IdentityAccess,
        clearLocalIdentity: awikiClient.clearLocalIdentity,
        availability,
        models,
        rechargeEnabled: AWIKI_RECHARGE_ENABLED,
      }),
    }, AwikiOnboarding))
  } catch (error) {
    const cleanupErrors = cleanupModelProxy(disposeOnboarding, disposeSettings, models, availability)
    throw combineSetupAndCleanupErrors(error, cleanupErrors)
  }

  return () => {
    throwCleanupErrors(cleanupModelProxy(disposeOnboarding, disposeSettings, models, availability))
  }
}

function cleanupModelProxy(
  disposeOnboarding: (() => void) | undefined,
  disposeSettings: (() => void) | undefined,
  models: AwikiModelProxyController,
  availability: ModelAvailabilityController,
): unknown[] {
  const errors: unknown[] = []
  for (const dispose of [
    disposeOnboarding,
    disposeSettings,
    () => { models.dispose() },
    () => { availability.dispose() },
  ]) {
    if (dispose === undefined) continue
    try {
      dispose()
    } catch (error) {
      errors.push(error)
    }
  }
  return errors
}

function combineSetupAndCleanupErrors(setupError: unknown, cleanupErrors: readonly unknown[]): unknown {
  if (cleanupErrors.length === 0) return setupError
  return new AggregateError(
    [setupError, ...cleanupErrors],
    'ui-awiki-model-proxy setup failed and cleanup also failed',
    { cause: setupError },
  )
}

function throwCleanupErrors(errors: readonly unknown[]): void {
  if (errors.length === 0) return
  if (errors.length === 1) throw errors[0]
  throw new AggregateError(errors, 'ui-awiki-model-proxy cleanup failed')
}
