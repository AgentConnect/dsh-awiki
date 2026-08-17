/** Reactive browser mirror for AWiki's loopback-only settings channel. */

import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { AWIKI_DOMAIN_FIELD, normalizeAwikiDomain } from '../domain.ts'
import type { AwikiSettings } from '../settings.ts'
import {
  AWIKI_SETTINGS_RPC_CHANNEL,
  AWIKI_SETTINGS_RPC_ENDPOINTS,
  decodeAwikiSettingsRpcView,
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

/** Plugin-owned SettingsScope implementation independent of the core settings allowlist. */
export class AwikiSettingsController implements SettingsScope<AwikiSettings> {
  private snapshot: SettingsScopeSnapshot<AwikiSettings>
  private readonly listeners = new Set<() => void>()
  private readonly abort = new AbortController()
  private readonly disposeHostDescription: () => void
  private writeTail: Promise<void> = Promise.resolve()
  private requestVersion = 0
  private disposed = false

  constructor(private readonly connection: ConnectionHandle) {
    this.snapshot = connection.isLoopback ? INITIAL_HOST_SNAPSHOT : REMOTE_SNAPSHOT
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

  /** Load or reload the Host view; transport failures become a disabled UI state. */
  async load(): Promise<void> {
    if (!this.connection.isLoopback || this.disposed) return
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
    this.requestVersion += 1
    this.abort.abort()
    this.disposeHostDescription()
    this.listeners.clear()
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
}
