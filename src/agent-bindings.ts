import { randomUUID } from 'node:crypto'
import { chmod, lstat, mkdir, open, readFile, rename, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import type {
  AwikiAgentBindingScope,
  AwikiAgentIdentityBinding,
  AwikiBindingId,
  AwikiIdentity,
  AwikiIdentityId,
} from './types.ts'

const SCHEMA_VERSION = 1
const BINDING_FILE = 'agent-bindings-v1.json'
const BINDING_TEMP_FILE = '.agent-bindings-v1.tmp'

type BindingStatus = AwikiAgentIdentityBinding['status']

export interface BindingRecord {
  readonly bindingId: AwikiBindingId
  readonly displayName: string
  readonly status: BindingStatus
  readonly createdAt: number
  readonly source: 'provisioned' | 'adopted'
  readonly identityId?: AwikiIdentityId
}

interface BindingState {
  readonly schemaVersion: 1
  readonly bindings: Readonly<Record<string, BindingRecord>>
  readonly presetRoutes: Readonly<Record<string, AwikiBindingId>>
  readonly sessionRoutes: Readonly<Record<string, AwikiBindingId>>
}

export interface BindingRoute {
  readonly scope: AwikiAgentBindingScope
  readonly key: string
}

export interface BindingCreation {
  readonly binding: BindingRecord
  readonly created: boolean
}

export interface BindingReconciliation {
  readonly bindings: readonly AwikiAgentIdentityBinding[]
  readonly unboundIdentities: readonly AwikiIdentity[]
}

function emptyState(): BindingState {
  return { schemaVersion: SCHEMA_VERSION, bindings: {}, presetRoutes: {}, sessionRoutes: {} }
}

function plainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function bindingRecord(value: unknown, key: string): BindingRecord | undefined {
  if (!plainRecord(value)) return undefined
  const bindingId = value.bindingId
  const displayName = value.displayName
  const status = value.status
  const createdAt = value.createdAt
  const identityId = value.identityId
  const source = value.source
  if (bindingId !== key || !/^agbind_[a-f0-9]{32}$/u.test(key)
    || typeof displayName !== 'string' || displayName.trim() !== displayName || displayName.length === 0
    || !['creating', 'ready', 'failed', 'broken'].includes(String(status))
    || !Number.isSafeInteger(createdAt) || Number(createdAt) < 0
    || !['provisioned', 'adopted'].includes(String(source))
    || (identityId !== undefined && (typeof identityId !== 'string' || identityId.length === 0))) {
    return undefined
  }
  return {
    bindingId: bindingId as AwikiBindingId,
    displayName,
    status: status as BindingStatus,
    createdAt: Number(createdAt),
    source: source as BindingRecord['source'],
    ...identityId === undefined ? {} : { identityId: identityId as AwikiIdentityId },
  }
}

function routes(value: unknown, bindings: Readonly<Record<string, BindingRecord>>): Record<string, AwikiBindingId> | undefined {
  if (!plainRecord(value)) return undefined
  const output: Record<string, AwikiBindingId> = {}
  for (const [key, bindingId] of Object.entries(value)) {
    if (key.trim() !== key || key.length === 0 || typeof bindingId !== 'string' || bindings[bindingId] === undefined) {
      return undefined
    }
    output[key] = bindingId as AwikiBindingId
  }
  return output
}

function decode(raw: string): BindingState {
  const value: unknown = JSON.parse(raw)
  if (!plainRecord(value) || value.schemaVersion !== SCHEMA_VERSION || !plainRecord(value.bindings)) {
    throw new TypeError('awiki: Agent binding state is invalid')
  }
  const bindings: Record<string, BindingRecord> = {}
  for (const [key, item] of Object.entries(value.bindings)) {
    const parsed = bindingRecord(item, key)
    if (parsed === undefined) throw new TypeError('awiki: Agent binding state is invalid')
    bindings[key] = parsed
  }
  const presetRoutes = routes(value.presetRoutes, bindings)
  const sessionRoutes = routes(value.sessionRoutes, bindings)
  if (presetRoutes === undefined || sessionRoutes === undefined) {
    throw new TypeError('awiki: Agent binding state is invalid')
  }
  return { schemaVersion: SCHEMA_VERSION, bindings, presetRoutes, sessionRoutes }
}

function routeMap(state: BindingState, scope: AwikiAgentBindingScope): Readonly<Record<string, AwikiBindingId>> {
  return scope === 'preset' ? state.presetRoutes : state.sessionRoutes
}

function withRoute(
  state: BindingState,
  route: BindingRoute,
  bindingId: AwikiBindingId,
): BindingState {
  return route.scope === 'preset'
    ? { ...state, presetRoutes: { ...state.presetRoutes, [route.key]: bindingId } }
    : { ...state, sessionRoutes: { ...state.sessionRoutes, [route.key]: bindingId } }
}

/** Host-private, non-secret DSH Agent-to-identity binding persistence. */
export class AwikiAgentBindingStore {
  private readonly hostDirectory: string
  private readonly path: string
  private readonly tempPath: string
  private mutation: Promise<void> = Promise.resolve()

  public constructor(stateRoot: string) {
    this.hostDirectory = join(stateRoot, '.host')
    this.path = join(this.hostDirectory, BINDING_FILE)
    this.tempPath = join(this.hostDirectory, BINDING_TEMP_FILE)
  }

  private async privateDirectory(): Promise<void> {
    await mkdir(this.hostDirectory, { recursive: true, mode: 0o700 })
    const metadata = await lstat(this.hostDirectory)
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new TypeError('awiki: Host state directory is invalid')
    }
    await chmod(this.hostDirectory, 0o700)
  }

  private async state(): Promise<BindingState> {
    await this.privateDirectory()
    try {
      const metadata = await lstat(this.path)
      if (!metadata.isFile() || metadata.isSymbolicLink()) {
        throw new TypeError('awiki: Agent binding state is invalid')
      }
      await chmod(this.path, 0o600)
      return decode(await readFile(this.path, 'utf8'))
    } catch (error) {
      if (plainRecord(error) && error.code === 'ENOENT') return emptyState()
      throw error
    }
  }

  private async persist(state: BindingState): Promise<void> {
    await this.privateDirectory()
    try {
      const metadata = await lstat(this.tempPath)
      if (!metadata.isFile() || metadata.isSymbolicLink()) {
        throw new TypeError('awiki: Agent binding temporary state is invalid')
      }
      await unlink(this.tempPath)
    } catch (error) {
      if (!(plainRecord(error) && error.code === 'ENOENT')) throw error
    }
    const file = await open(this.tempPath, 'wx', 0o600)
    try {
      await file.writeFile(`${JSON.stringify(state, null, 2)}\n`, 'utf8')
      await file.sync()
    } finally {
      await file.close()
    }
    await chmod(this.tempPath, 0o600)
    await rename(this.tempPath, this.path)
    await chmod(this.path, 0o600)
    if (process.platform !== 'win32') {
      const directory = await open(this.hostDirectory, 'r')
      try { await directory.sync() } finally { await directory.close() }
    }
  }

  private mutate<Value>(operation: (state: BindingState) => Promise<readonly [BindingState, Value]>): Promise<Value> {
    let resolveResult!: (value: Value | PromiseLike<Value>) => void
    let rejectResult!: (reason?: unknown) => void
    const result = new Promise<Value>((resolve, reject) => {
      resolveResult = resolve
      rejectResult = reject
    })
    const run = async (): Promise<void> => {
      try {
        const [next, value] = await operation(await this.state())
        await this.persist(next)
        resolveResult(value)
      } catch (error) {
        rejectResult(error)
      }
    }
    this.mutation = this.mutation.then(run, run)
    return result
  }

  /** Resolve the effective binding using session override before preset route. */
  public async resolve(sessionId: string, presetId?: string): Promise<BindingRecord | undefined> {
    await this.mutation
    const state = await this.state()
    const bindingId = state.sessionRoutes[sessionId]
      ?? (presetId === undefined ? undefined : state.presetRoutes[presetId])
    return bindingId === undefined ? undefined : state.bindings[bindingId]
  }

  /** Create one pending binding and route, or return the route's existing binding. */
  public create(displayName: string, route: BindingRoute): Promise<BindingCreation> {
    return this.mutate<BindingCreation>(async (state) => {
      const existingId = routeMap(state, route.scope)[route.key]
      if (existingId !== undefined) {
        const existing = state.bindings[existingId]
        if (existing === undefined) throw new TypeError('awiki: Agent binding route is invalid')
        return [state, { binding: existing, created: false }]
      }
      const bindingId = `agbind_${randomUUID().replaceAll('-', '')}` as AwikiBindingId
      const binding: BindingRecord = {
        bindingId,
        displayName,
        status: 'creating',
        createdAt: Date.now(),
        source: 'provisioned',
      }
      const next = withRoute(
        { ...state, bindings: { ...state.bindings, [bindingId]: binding } },
        route,
        bindingId,
      )
      return [next, { binding, created: true }]
    })
  }

  /** Commit the exact Core identity selected by one provisioning operation. */
  public markReady(bindingId: AwikiBindingId, identityId: AwikiIdentityId): Promise<void> {
    return this.mutate(async (state) => {
      const current = state.bindings[bindingId]
      if (current === undefined) throw new TypeError('awiki: Agent binding does not exist')
      if (current.identityId !== undefined && current.identityId !== identityId) {
        throw new TypeError('awiki: Agent binding identity conflicts with committed state')
      }
      return [{
        ...state,
        bindings: {
          ...state.bindings,
          [bindingId]: { ...current, identityId, status: 'ready' },
        },
      }, undefined]
    })
  }

  public markFailed(bindingId: AwikiBindingId): Promise<void> {
    return this.mutate(async (state) => {
      const current = state.bindings[bindingId]
      if (current === undefined || current.status === 'ready') return [state, undefined]
      return [{
        ...state,
        bindings: { ...state.bindings, [bindingId]: { ...current, status: 'failed' } },
      }, undefined]
    })
  }

  /** Attach an existing binding to one explicit route. */
  public attach(bindingId: AwikiBindingId, route: BindingRoute, replace: boolean): Promise<void> {
    return this.mutate(async (state) => {
      if (state.bindings[bindingId] === undefined) throw new TypeError('awiki: Agent binding does not exist')
      const existing = routeMap(state, route.scope)[route.key]
      if (existing !== undefined && existing !== bindingId && !replace) {
        throw new TypeError('awiki: Agent binding route already exists')
      }
      return [withRoute(state, route, bindingId), undefined]
    })
  }

  /** Create a binding for one locally present orphan identity and attach it. */
  public adopt(
    identityId: AwikiIdentityId,
    displayName: string,
    route: BindingRoute,
    replace: boolean,
  ): Promise<BindingRecord> {
    return this.mutate(async (state) => {
      const existingBinding = Object.values(state.bindings)
        .find(binding => binding.identityId === identityId)
      if (existingBinding !== undefined) {
        const existingRoute = routeMap(state, route.scope)[route.key]
        if (existingRoute !== undefined && existingRoute !== existingBinding.bindingId && !replace) {
          throw new TypeError('awiki: Agent binding route already exists')
        }
        return [withRoute(state, route, existingBinding.bindingId), existingBinding]
      }
      const existingRoute = routeMap(state, route.scope)[route.key]
      if (existingRoute !== undefined && !replace) throw new TypeError('awiki: Agent binding route already exists')
      const bindingId = `agbind_${randomUUID().replaceAll('-', '')}` as AwikiBindingId
      const binding: BindingRecord = {
        bindingId,
        displayName,
        status: 'ready',
        createdAt: Date.now(),
        source: 'adopted',
        identityId,
      }
      return [withRoute(
        { ...state, bindings: { ...state.bindings, [bindingId]: binding } },
        route,
        bindingId,
      ), binding]
    })
  }

  /** Join binding records to current Core identities without deleting DSH routes. */
  public async reconcile(identities: readonly AwikiIdentity[]): Promise<BindingReconciliation> {
    await this.mutation
    const state = await this.state()
    const byIdentity = new Map(identities.map(item => [item.identityId, item] as const))
    const referenced = new Set<string>()
    const presetRoutes = new Map<string, string[]>()
    const sessionCounts = new Map<string, number>()
    for (const [preset, bindingId] of Object.entries(state.presetRoutes)) {
      presetRoutes.set(bindingId, [...presetRoutes.get(bindingId) ?? [], preset])
    }
    for (const bindingId of Object.values(state.sessionRoutes)) {
      sessionCounts.set(bindingId, (sessionCounts.get(bindingId) ?? 0) + 1)
    }
    let changed = false
    const bindings: Record<string, BindingRecord> = { ...state.bindings }
    const projected = Object.values(state.bindings).map((binding): AwikiAgentIdentityBinding => {
      const selected = binding.identityId === undefined ? undefined : byIdentity.get(binding.identityId)
      if (binding.identityId !== undefined) referenced.add(binding.identityId)
      let status = binding.status
      if (binding.identityId !== undefined && selected === undefined && status === 'ready') status = 'broken'
      if (selected !== undefined && status === 'broken') status = 'ready'
      if (status !== binding.status) {
        bindings[binding.bindingId] = { ...binding, status }
        changed = true
      }
      return {
        bindingId: binding.bindingId,
        displayName: binding.displayName,
        status,
        ...selected === undefined ? {} : { identity: selected },
        presetRoutes: Object.freeze([...(presetRoutes.get(binding.bindingId) ?? [])].sort()),
        sessionRouteCount: sessionCounts.get(binding.bindingId) ?? 0,
        createdAt: binding.createdAt,
      }
    }).sort((left, right) => left.createdAt - right.createdAt)
    if (changed) await this.persist({ ...state, bindings })
    return {
      bindings: Object.freeze(projected),
      unboundIdentities: Object.freeze(identities.filter(item => !item.isDefault && !referenced.has(item.identityId))),
    }
  }

  /** Delete Host-owned binding state; SDK-owned identity removal is separate. */
  public async clear(): Promise<boolean> {
    await this.mutation
    await this.privateDirectory()
    let cleared = false
    for (const path of [this.path, this.tempPath]) {
      try {
        const metadata = await lstat(path)
        if (!metadata.isFile() || metadata.isSymbolicLink()) {
          throw new TypeError('awiki: Agent binding state is invalid')
        }
        await unlink(path)
        cleared = true
      } catch (error) {
        if (!(plainRecord(error) && error.code === 'ENOENT')) throw error
      }
    }
    return cleared
  }
}
