import { decodeDesktopDistribution, type AwikiDesktopDistribution } from '../desktop-distribution.ts'
/** Reactive browser mirror for AWiki's loopback-only settings channel. */

import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { AWIKI_DOMAIN_FIELD, normalizeAwikiDomain } from '../domain.ts'
import type { AwikiSettings } from '../settings.ts'
import {
  AWIKI_SETTINGS_RPC_CHANNEL,
  AWIKI_SETTINGS_RPC_ENDPOINTS,
  decodeAwikiSettingsRpcView,
  decodeAwikiTenantRpcView,
  decodeAwikiUpdatePolicyRpcView,
  type AwikiTenantRpcView,
  type AwikiUpdatePolicyRpcView,
} from '../settings-rpc-contract.ts'

const INITIAL_HOST_SNAPSHOT: SettingsScopeSnapshot<AwikiSettings> = {
  status: 'loading',
  value: undefined,
  base: undefined,
  user: undefined,
  revision: undefined,
  writable: false,
  mode: 'host',
}

const REMOTE_SNAPSHOT: SettingsScopeSnapshot<AwikiSettings> = {
  ...INITIAL_HOST_SNAPSHOT,
  status: 'unavailable',
  mode: 'memory',
}

const INITIAL_TENANTS: AwikiTenantRpcView = {
  schemaVersion: 1,
  officialCatalogVersion: 1,
  generation: 0,
  activeTenantId: '',
  tenants: [],
  switching: false,
}

export interface AwikiTenantScopeSnapshot {
  readonly status: 'loading' | 'ready' | 'unavailable'
  readonly value: AwikiTenantRpcView
  readonly updateStatus: 'loading' | 'ready' | 'unavailable'
  readonly update?: AwikiUpdatePolicyRpcView | undefined
  readonly desktop?: AwikiDesktopDistribution | undefined
  readonly desktopStatus?: 'loading' | 'ready' | 'unavailable'
}

export interface AwikiTenantScope {
  getSnapshot(): AwikiTenantScopeSnapshot
  subscribe(listener: () => void): () => void
}

/** Plugin-owned SettingsScope implementation independent of the core settings allowlist. */
export class AwikiSettingsController implements SettingsScope<AwikiSettings> {
  private snapshot: SettingsScopeSnapshot<AwikiSettings>
  private readonly listeners = new Set<() => void>()
  private tenantSnapshot: AwikiTenantScopeSnapshot
  private readonly tenantListeners = new Set<() => void>()
  private readonly abort = new AbortController()
  private readonly disposeHostDescription: () => void
  private writeTail: Promise<void> = Promise.resolve()
  private requestVersion = 0
  private disposed = false
  private updateRequestVersion = 0
  private desktopRequestVersion = 0
  private tenantRequestVersion = 0
  private updatePolling: ReturnType<typeof setInterval> | undefined

  constructor(private readonly connection: ConnectionHandle) {
    this.snapshot = connection.isLoopback ? INITIAL_HOST_SNAPSHOT : REMOTE_SNAPSHOT
    this.tenantSnapshot = {
      status: connection.isLoopback ? 'loading' : 'unavailable',
      value: INITIAL_TENANTS,
      updateStatus: connection.isLoopback ? 'loading' : 'unavailable',
    }
    this.disposeHostDescription = connection.isLoopback
      ? connection.hostDescription.subscribe(() => { void this.load() })
      : () => {}
  }

  getSnapshot(): SettingsScopeSnapshot<AwikiSettings> {
    return this.snapshot
  }

  subscribe(listener: () => void): () => void {
    if (this.disposed) return () => {}
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  getTenantSnapshot(): AwikiTenantScopeSnapshot {
    return this.tenantSnapshot
  }

  subscribeTenants(listener: () => void): () => void {
    if (this.disposed) return () => {}
    this.tenantListeners.add(listener)
    return () => { this.tenantListeners.delete(listener) }
  }

  readonly tenantScope: AwikiTenantScope = {
    getSnapshot: () => this.getTenantSnapshot(),
    subscribe: listener => this.subscribeTenants(listener),
  }

  /** Load or reload the Host view; transport failures become a disabled UI state. */
  async load(): Promise<void> {
    if (!this.connection.isLoopback || this.disposed) return
    await Promise.all([this.loadSettings(), this.loadDesktopUpdate(), (async () => {
      await this.loadTenants()
      await this.loadUpdatePolicy()
    })()])
    // Version discovery must not delay mounting the launcher or settings UI.
    void this.loadUpdatePolicy(true)
    if (!this.disposed && this.updatePolling === undefined) {
      this.updatePolling = setInterval(() => {
        if (this.tenantSnapshot.updateStatus !== 'loading') void this.loadUpdatePolicy()
        if (this.tenantSnapshot.desktopStatus !== 'loading') void this.loadDesktopUpdate()
      }, 30_000)
    }
  }

  private async loadSettings(): Promise<void> {
    const version = ++this.requestVersion
    try {
      const result = await this.connection.rpc.call(
        AWIKI_SETTINGS_RPC_CHANNEL,
        AWIKI_SETTINGS_RPC_ENDPOINTS.describe,
        {},
        this.abort.signal,
      )
      const view = result.ok ? decodeAwikiSettingsRpcView(result.value) : undefined
      if (view === undefined) throw new Error('AWiki settings view is unavailable')
      if (version !== this.requestVersion || this.disposed) return
      this.publish({
        status: 'ready',
        value: view.value,
        base: view.base,
        user: view.user,
        revision: view.revision,
        writable: view.writable,
        mode: 'host',
      })
    } catch {
      if (version !== this.requestVersion || this.disposed) return
      this.publish({ ...this.snapshot, status: 'unavailable', writable: false, mode: 'host' })
    }
  }

  async loadTenants(): Promise<void> {
    if (!this.connection.isLoopback || this.disposed) return
    const request = ++this.tenantRequestVersion
    try {
      const result = await this.connection.rpc.call(AWIKI_SETTINGS_RPC_CHANNEL,
        AWIKI_SETTINGS_RPC_ENDPOINTS.describeTenants, {}, this.abort.signal)
      if (this.disposed || request !== this.tenantRequestVersion) return
      const value = result.ok ? decodeAwikiTenantRpcView(result.value) : undefined
      if (value === undefined) throw new Error('AWiki tenant catalog is unavailable')
      const changed = value.activeTenantId !== this.tenantSnapshot.value.activeTenantId
        || value.generation !== this.tenantSnapshot.value.generation
      if (changed) this.updateRequestVersion++
      this.publishTenants({ ...this.tenantSnapshot, status: 'ready', value,
        ...changed ? { update: undefined, updateStatus: 'loading' } : {} })
    } catch {
      if (!this.disposed && request === this.tenantRequestVersion) this.publishTenants({ ...this.tenantSnapshot, status: 'unavailable' })
    }
  }

  async loadUpdatePolicy(refresh = false): Promise<void> {
    if (!this.connection.isLoopback || this.disposed || this.tenantSnapshot.value.switching) return
    const tenantId = this.tenantSnapshot.value.activeTenantId
    if (tenantId === '') return
    const request = ++this.updateRequestVersion
    if (refresh) this.publishTenants({ ...this.tenantSnapshot, updateStatus: 'loading' })
    try {
      const result = await this.connection.rpc.call(AWIKI_SETTINGS_RPC_CHANNEL,
        refresh ? AWIKI_SETTINGS_RPC_ENDPOINTS.refreshUpdatePolicy : AWIKI_SETTINGS_RPC_ENDPOINTS.describeUpdatePolicy,
        {}, this.abort.signal)
      if (this.disposed || request !== this.updateRequestVersion || this.tenantSnapshot.value.activeTenantId !== tenantId) return
      const update = result.ok ? decodeAwikiUpdatePolicyRpcView(result.value) : undefined
      const tenant = this.tenantSnapshot.value.tenants.find(value => value.tenantId === tenantId)
      if (update === undefined || update.tenantId !== tenantId
        || (tenant !== undefined && update.policyOrigin !== new URL(tenant.backendBaseUrl).origin)) throw new Error('AWiki update scope mismatch')
      this.publishTenants({ ...this.tenantSnapshot, updateStatus: 'ready', update })
    } catch {
      if (!this.disposed && request === this.updateRequestVersion) {
        this.publishTenants({ ...this.tenantSnapshot, updateStatus: 'unavailable' })
      }
    }
  }

  async loadDesktopUpdate(refresh = false): Promise<void> {
    if (!this.connection.isLoopback || this.disposed) return
    const request = ++this.desktopRequestVersion
    if (refresh) this.publishTenants({ ...this.tenantSnapshot, desktopStatus: 'loading' })
    try {
      const result = await this.connection.rpc.call(AWIKI_SETTINGS_RPC_CHANNEL,
        refresh ? AWIKI_SETTINGS_RPC_ENDPOINTS.refreshDesktopUpdate : AWIKI_SETTINGS_RPC_ENDPOINTS.describeDesktopUpdate,
        {}, this.abort.signal)
      if (this.disposed || request !== this.desktopRequestVersion) return
      if (!result.ok) throw new Error('Desktop update service unavailable')
      const desktop = result.value === null ? undefined : decodeDesktopDistribution(result.value)
      if (result.value !== null && desktop === undefined) throw new Error('Invalid Desktop update response')
      this.publishTenants({ ...this.tenantSnapshot, desktopStatus: 'ready', desktop })
    } catch {
      if (!this.disposed && request === this.desktopRequestVersion) this.publishTenants({ ...this.tenantSnapshot, desktopStatus: 'unavailable' })
    }
  }

  async refreshUpdatePolicy(): Promise<void> {
    await Promise.all([this.loadUpdatePolicy(true), this.loadDesktopUpdate(true)])
  }

  createTenant(displayName: string, domain: string): Promise<void> {
    return this.writeTenant(AWIKI_SETTINGS_RPC_ENDPOINTS.createTenant, { displayName, domain })
  }

  renameTenant(tenantId: string, displayName: string): Promise<void> {
    return this.writeTenant(AWIKI_SETTINGS_RPC_ENDPOINTS.renameTenant, { tenantId, displayName })
  }

  switchTenant(tenantId: string): Promise<void> {
    return this.writeTenant(AWIKI_SETTINGS_RPC_ENDPOINTS.switchTenant, { tenantId })
  }

  archiveTenant(tenantId: string): Promise<void> {
    return this.writeTenant(AWIKI_SETTINGS_RPC_ENDPOINTS.archiveTenant, { tenantId })
  }

  set(field: string, value: unknown): Promise<void> {
    if (field !== AWIKI_DOMAIN_FIELD || typeof value !== 'string') {
      return Promise.reject(new TypeError('AWiki settings only supports a string domain field'))
    }
    const domain = normalizeAwikiDomain(value)
    return this.enqueue(AWIKI_SETTINGS_RPC_ENDPOINTS.setDomain, { domain })
  }

  unset(field: string): Promise<void> {
    if (field !== AWIKI_DOMAIN_FIELD) {
      return Promise.reject(new TypeError('AWiki settings only supports the domain field'))
    }
    return this.enqueue(AWIKI_SETTINGS_RPC_ENDPOINTS.resetDomain, {})
  }

  /** Stop reconnect reads and cancel outstanding transport calls. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    if (this.updatePolling !== undefined) clearInterval(this.updatePolling)
    this.requestVersion += 1
    this.abort.abort()
    this.disposeHostDescription()
    this.listeners.clear()
    this.tenantListeners.clear()
  }

  private enqueue(endpoint: string, payload: Record<string, unknown>): Promise<void> {
    const run = this.writeTail.catch(() => undefined).then(() => this.write(endpoint, payload))
    this.writeTail = run
    return run
  }

  private async write(endpoint: string, payload: Record<string, unknown>): Promise<void> {
    const revision = this.snapshot.revision
    if (this.disposed
      || !this.connection.isLoopback
      || this.snapshot.status !== 'ready'
      || !this.snapshot.writable
      || revision === undefined) {
      throw new Error('AWiki settings are not writable')
    }
    const version = ++this.requestVersion
    try {
      const result = await this.connection.rpc.call(
        AWIKI_SETTINGS_RPC_CHANNEL,
        endpoint,
        { ...payload, expectedRevision: revision },
        this.abort.signal,
      )
      const view = result.ok ? decodeAwikiSettingsRpcView(result.value) : undefined
      if (view === undefined) throw new Error('AWiki settings change was rejected')
      if (version !== this.requestVersion || this.disposed) return
      this.publish({
        status: 'ready',
        value: view.value,
        base: view.base,
        user: view.user,
        revision: view.revision,
        writable: view.writable,
        mode: 'host',
      })
    } catch {
      if (!this.disposed) await this.load()
      throw new Error('AWiki settings change was rejected')
    }
  }

  private publish(next: SettingsScopeSnapshot<AwikiSettings>): void {
    this.snapshot = next
    for (const listener of [...this.listeners]) listener()
  }

  private async writeTenant(endpoint: string, payload: Record<string, unknown>): Promise<void> {
    if (this.disposed || !this.connection.isLoopback || this.tenantSnapshot.status !== 'ready') {
      throw new Error('AWiki tenant catalog is unavailable')
    }
    if (this.tenantSnapshot.value.switching) throw new Error('AWiki tenant switch is already in progress')
    const switching = endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.switchTenant
    if (switching) { this.updateRequestVersion++; this.tenantRequestVersion++ }
    this.publishTenants({ ...this.tenantSnapshot, ...switching ? { update: undefined, updateStatus: 'loading' as const } : {}, value: { ...this.tenantSnapshot.value, switching: endpoint === AWIKI_SETTINGS_RPC_ENDPOINTS.switchTenant } })
    try {
      const result = await this.connection.rpc.call(
        AWIKI_SETTINGS_RPC_CHANNEL,
        endpoint,
        payload,
        this.abort.signal,
      )
      const value = result.ok ? decodeAwikiTenantRpcView(result.value) : undefined
      if (value === undefined) {
        const message = result.ok ? undefined : (result.error as { message?: unknown }).message
        throw new Error(typeof message === 'string' ? message : 'AWiki tenant change was rejected')
      }
      if (!this.disposed) this.publishTenants({ ...this.tenantSnapshot, status: 'ready', value })
      if (switching) {
        // Apply the target's cached gate immediately, then await a bounded refresh.
        await this.loadUpdatePolicy()
        await this.loadUpdatePolicy(true)
      }
    } catch (error) {
      if (!this.disposed) {
        await this.loadTenants()
        if (switching) { await this.loadUpdatePolicy(); void this.loadUpdatePolicy(true) }
      }
      throw error
    }
  }

  private publishTenants(next: AwikiTenantScopeSnapshot): void {
    this.tenantSnapshot = next
    for (const listener of [...this.tenantListeners]) listener()
  }
}
