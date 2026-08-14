import { Service, type Context } from '@deepseek-ai/cordis'

type Listener = () => void

export function defineStore<State extends object, Actions extends Record<string, (draft: State, ...args: never[]) => void>>(definition: {
  init: () => State
  actions: Actions
}) {
  return {
    create() {
      let state = definition.init()
      const listeners = new Set<Listener>()
      const actions = Object.fromEntries(Object.entries(definition.actions).map(([name, action]) => [name, (...args: never[]) => {
        const draft = { ...state }
        action(draft, ...args)
        state = draft
        for (const listener of listeners) listener()
      }])) as { [Key in keyof Actions]: (...args: Parameters<Actions[Key]> extends [State, ...infer Rest] ? Rest : never) => void }
      return {
        actions,
        getSnapshot: () => state,
        subscribe(listener: Listener) {
          listeners.add(listener)
          return () => { listeners.delete(listener) }
        },
        clearPersisted() {},
      }
    },
  }
}

interface StoredEntry {
  readonly options: Record<string, unknown>
  readonly component: unknown
  readonly store?: unknown
  readonly inject?: (...args: never[]) => unknown
}

interface Injection {
  readonly callback: () => (() => void) | void
  active?: () => void
}

export class SlotRegistry extends Service {
  private readonly declarations = new Set<string>()
  private readonly values = new Map<string, StoredEntry[]>()
  private readonly injections = new Map<string, Set<Injection>>()

  constructor(ctx: Context) {
    super(ctx, 'slots')
  }

  register(options: Record<string, unknown>, component: unknown): () => void {
    const children = options.children as Record<string, unknown> | undefined
    const declared = Object.keys(children ?? {})
    const name = options.name as string
    const entry = options.id === undefined ? undefined : {
      options,
      component,
      ...(options.store === undefined ? {} : { store: options.store }),
      ...(options.inject === undefined ? {} : { inject: options.inject as (...args: never[]) => unknown }),
    }
    if (entry !== undefined) this.values.set(name, [...this.values.get(name) ?? [], entry])
    for (const key of declared) {
      this.declarations.add(key)
      for (const injection of this.injections.get(key) ?? []) {
        injection.active = injection.callback() ?? undefined
      }
    }
    let disposed = false
    const dispose = () => {
      if (disposed) return
      disposed = true
      if (entry !== undefined) this.values.set(name, (this.values.get(name) ?? []).filter(value => value !== entry))
      for (const key of declared) {
        this.declarations.delete(key)
        for (const injection of this.injections.get(key) ?? []) {
          injection.active?.()
          injection.active = undefined
        }
      }
    }
    this.ctx.effect(() => dispose)
    return dispose
  }

  inject(key: string, callback: () => (() => void) | void): () => void {
    const injection: Injection = { callback }
    const values = this.injections.get(key) ?? new Set<Injection>()
    values.add(injection)
    this.injections.set(key, values)
    if (this.declarations.has(key)) injection.active = callback() ?? undefined
    const dispose = () => {
      injection.active?.()
      injection.active = undefined
      values.delete(injection)
    }
    this.ctx.effect(() => dispose)
    return dispose
  }

  entries(key: string): readonly StoredEntry[] {
    return this.values.get(key) ?? []
  }
}

export default SlotRegistry

export type ClientContext = Context & {
  slots: SlotRegistry
  remote: { $mount: (contribution: unknown) => Promise<() => Promise<void>> }
}

export type EngineStoreHandle<State extends object, Actions extends Record<string, (draft: State, ...args: never[]) => void>> = ReturnType<typeof defineStore<State, Actions>>
