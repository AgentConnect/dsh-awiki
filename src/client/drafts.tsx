/** UI-only memory. Never serialize authentication inputs, File objects, or grants. */
import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode, type SetStateAction } from 'react'

interface Cell { value: unknown; initial: unknown; dirty: boolean }

export class AwikiDraftStore {
  private scope = 'initial'
  private flowScope = 'initial'
  private tenant = 'initial'
  private readonly epochs = new Map<string, number>()
  epoch = (scope: string) => this.epochs.get(scope) ?? 0
  private drop(scope: string) { this.scopes.delete(scope); this.epochs.set(scope, this.epoch(scope) + 1) }
  private readonly scopes = new Map<string, Map<string, Cell>>()
  private readonly listeners = new Set<() => void>()
  private revision = 0

  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  getSnapshot = () => this.revision
  getScope = (key: string) => key.startsWith('settings:tenant-') ? 'tenant-settings'
    : key.startsWith('identity:') || key.startsWith('recovery:') ? this.flowScope : this.scope
  private publish() { this.revision++; for (const listener of this.listeners) listener() }

  setScope(tenant: string, owner: string = tenant) {
    const scope = JSON.stringify([tenant, owner])
    if (scope === this.scope) return
    const nextFlow = JSON.stringify([tenant, 'identity-flow'])
    if (tenant !== this.tenant) {
      this.drop(this.flowScope)
      this.drop(nextFlow)
    }
    this.tenant = tenant
    this.flowScope = nextFlow
    this.scope = scope
    this.publish()
  }

  read<Value>(scope: string, key: string, initial: Value, dirty: boolean): Value {
    let cells = this.scopes.get(scope)
    if (cells === undefined) { cells = new Map(); this.scopes.set(scope, cells) }
    let cell = cells.get(key)
    if (cell === undefined) { cell = { value: initial, initial, dirty }; cells.set(key, cell) }
    return cell.value as Value
  }

  write<Value>(scope: string, key: string, value: SetStateAction<Value>, initial: Value, dirty: boolean, epoch = this.epoch(scope)) {
    if (epoch !== this.epoch(scope)) return
    const previous = this.read(scope, key, initial, dirty)
    const next = typeof value === 'function' ? (value as (value: Value) => Value)(previous) : value
    if (Object.is(previous, next)) return
    this.scopes.get(scope)!.get(key)!.value = next
    this.publish()
  }

  clearFlow() { this.drop(this.flowScope); this.publish() }
  clearScope() { this.drop(this.scope); this.drop(this.flowScope); this.publish() }
  clear() { for (const scope of this.scopes.keys()) this.drop(scope); this.publish() }
  hasUnsavedChanges = () => [...this.scopes.values()].some(cells => [...cells.values()].some(cell => cell.dirty && !Object.is(cell.value, cell.initial)))
}

const DraftContext = createContext<AwikiDraftStore | undefined>(undefined)

export function AwikiDraftProvider({ store, children }: { store?: AwikiDraftStore | undefined; children: ReactNode }) {
  useEffect(() => {
    if (store === undefined) return
    const guard = (event: BeforeUnloadEvent) => {
      if (!store.hasUnsavedChanges()) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', guard)
    return () => { window.removeEventListener('beforeunload', guard) }
  }, [store])
  return <DraftContext.Provider value={store}>{children}</DraftContext.Provider>
}

/** Keyed by owner and form/conversation. Late callbacks retain their original scope. */
export function useDraftState<Value>(key: string, initial: Value, dirty = true): [Value, (value: SetStateAction<Value>) => void] {
  const store = useContext(DraftContext)
  const [local, setLocal] = useState(initial)
  useSyncExternalStore(store?.subscribe ?? (() => () => {}), store?.getSnapshot ?? (() => 0))
  const scope = store?.getScope(key) ?? ''
  const epoch = store?.epoch(scope) ?? 0
  const set = useCallback((value: SetStateAction<Value>) => {
    if (store === undefined) setLocal(value)
    else store.write(scope, key, value, initial, dirty, epoch)
  }, [store, scope, key, initial, dirty, epoch])
  return [store === undefined ? local : store.read(scope, key, initial, dirty), set]
}
