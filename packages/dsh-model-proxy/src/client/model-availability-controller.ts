/** Model Proxy projection of whether any Harness model provider can serve requests. */

import type { LlmConfigurableProvider, SettingsNamespaceView } from '@deepseek-ai/dsh-api-remotes/client'
import type { ClientRemote } from '@deepseek-ai/dsh-api-remotes/client'
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'

export interface ModelAvailabilityView {
  readonly status: 'idle' | 'loading' | 'ready' | 'unavailable'
  readonly usable: boolean
  readonly error: string | null
}

const INITIAL: ModelAvailabilityView = Object.freeze({
  status: 'idle',
  usable: false,
  error: null,
})

/**
 * Join the public provider, settings, and credential APIs into one onboarding fact.
 * Active routes without a credential reference authenticate through their provider's own path.
 */
export class ModelAvailabilityController implements HostObservable<ModelAvailabilityView> {
  private view = INITIAL
  private readonly listeners = new Set<() => void>()
  private generation = 0
  private disposed = false

  constructor(private readonly remote: Pick<ClientRemote, 'llm' | 'settings' | 'credentials'>) {}

  getSnapshot = (): ModelAvailabilityView => this.view

  subscribe = (listener: () => void): (() => void) => {
    if (this.disposed) return () => {}
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  async load(): Promise<void> {
    if (this.disposed) return
    const generation = ++this.generation
    this.publish({ ...this.view, status: 'loading', error: null })
    try {
      const [providersResponse, configurableResponse, settingsResponse] = await Promise.all([
        this.remote.llm.listProviders(),
        this.remote.llm.listConfigurableProviders(),
        this.remote.settings.describe(),
      ])
      if (!providersResponse.ok) throw new Error(providersResponse.error.message)
      if (!configurableResponse.ok) throw new Error(configurableResponse.error.message)
      if (!settingsResponse.ok) throw new Error(settingsResponse.error.message)

      const namespaces = new Map(
        settingsResponse.value.namespaces.map(namespace => [namespace.ns, namespace]),
      )
      const configurations = new Map(configurableResponse.value.map(provider => [provider.provider, provider]))
      const credentialRefs = providersResponse.value.map(provider => {
        const configuration = configurations.get(provider.id)
        return configuration === undefined ? undefined : credentialRef(configuration, namespaces)
      })
      let usable = credentialRefs.some(ref => ref === undefined)

      if (!usable) {
        const refs = [...new Set(credentialRefs.filter((ref): ref is string => ref !== undefined))]
        if (refs.length > 0) {
          const credentialsResponse = await this.remote.credentials.describe(refs)
          const credentialsResult = credentialsResponse
          if (!credentialsResult.ok) throw new Error(credentialsResult.error.message)
          const credentials = credentialsResult.value
          usable = refs.some(ref => credentials[ref]?.configured === true)
        }
      }

      if (generation !== this.generation || this.disposed) return
      this.publish({ status: 'ready', usable, error: null })
    } catch (error) {
      if (generation !== this.generation || this.disposed) return
      this.publish({ status: 'unavailable', usable: false, error: message(error) })
    }
  }

  refreshIfLoaded(): void {
    if (this.view.status === 'idle') return
    void this.load()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.generation += 1
    this.listeners.clear()
  }

  private publish(view: ModelAvailabilityView): void {
    if (this.disposed) return
    this.view = view
    for (const listener of this.listeners) listener()
  }
}

function credentialRef(
  provider: LlmConfigurableProvider,
  namespaces: ReadonlyMap<string, SettingsNamespaceView>,
): string | undefined {
  const namespace = namespaces.get(provider.settingsNs)
  if (namespace === undefined) return undefined
  const profile = valueAtPath(namespace.value, provider.settingsPath)
  if (!isRecord(profile)) return undefined
  const value = profile.apiKeyEnv
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function valueAtPath(value: unknown, path: readonly string[]): unknown {
  let current = value
  for (const segment of path) {
    if (!isRecord(current)) return undefined
    current = current[segment]
  }
  return current
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function message(error: unknown): string {
  return error instanceof Error && error.message !== '' ? error.message : '模型可用性暂时无法确认'
}
