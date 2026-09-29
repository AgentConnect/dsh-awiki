import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import type { AwikiDid, AwikiDisplayProfile, AwikiGroupSnapshot, AwikiProfile } from '../types.ts'
import type { AwikiOverlayProps } from './slots.ts'
import { avatarCache, safeAvatarUrl } from './avatar-cache.ts'
import css from './AwikiAvatar.module.css'

type Sources = Pick<AwikiOverlayProps, 'avatarDisplayProfiles' | 'avatarGroup'>
interface Projection {
  owner: string; self: AwikiProfile | null
  profiles: ReadonlyMap<string, AwikiDisplayProfile>; groups: ReadonlyMap<string, AwikiGroupSnapshot>
  demand: (did: AwikiDid, force?: boolean) => void; demandGroup: (did: AwikiDid) => void
  subscribe: (key: string, listener: () => void) => () => void
}
const Context = createContext<Projection | undefined>(undefined)
export function AwikiAvatarProvider(props: Sources & { owner: string; profile: AwikiProfile | null; children: ReactNode }) {
  const profiles = useRef(new Map<string, AwikiDisplayProfile>())
  const groups = useRef(new Map<string, AwikiGroupSnapshot>())
  const checked = useRef(new Map<string, number>())
  const peers = useRef(new Set<AwikiDid>())
  const scheduled = useRef(false)
  const groupQueue = useRef<Array<{ did: AwikiDid; operation: number }>>([])
  const groupRunning = useRef(0)
  const generation = useRef(0)
  const listeners = useRef(new Map<string, Set<() => void>>())
  const subscribe = useCallback((key: string, listener: () => void) => {
    const values = listeners.current.get(key) ?? new Set<() => void>()
    values.add(listener); listeners.current.set(key, values)
    return () => { values.delete(listener); if (values.size === 0) listeners.current.delete(key) }
  }, [])
  const emit = useCallback((key: string) => { listeners.current.get(key)?.forEach(listener => { listener() }) }, [])
  useLayoutEffect(() => {
    generation.current++; scheduled.current = false; profiles.current.clear(); groups.current.clear(); checked.current.clear(); peers.current.clear(); groupQueue.current.length = 0; avatarCache.reset()
    for (const values of listeners.current.values()) values.forEach(listener => { listener() })
    return () => { generation.current++; avatarCache.reset() }
  }, [props.owner])
  const demand = useCallback((did: AwikiDid, force = false) => {
    if (props.owner === '' || did === props.profile?.did || (checked.current.get(did) ?? 0) > Date.now() - (force ? 5_000 : 300_000)) return
    peers.current.add(did)
    if (scheduled.current) return
    scheduled.current = true
    const operation = generation.current
    const flush = () => {
      if (operation !== generation.current) return
      const batch = [...peers.current].slice(0, 100)
      batch.forEach(peer => { peers.current.delete(peer); checked.current.set(peer, Date.now()) })
      while (checked.current.size > 8192) checked.current.delete(checked.current.keys().next().value!)
      if (batch.length === 0) { scheduled.current = false; return }
      void props.avatarDisplayProfiles(batch).then(values => {
        if (operation !== generation.current) return
        const received = new Set<string>()
        for (const value of values) if (value.cacheHit) { profiles.current.set(value.did, value); received.add(value.did); emit(`peer:${value.did}`) }
        for (const peer of batch) if (!received.has(peer)) checked.current.set(peer, Date.now() - 270_000)
        while (profiles.current.size > 2048) { const key = profiles.current.keys().next().value!; profiles.current.delete(key); emit(`peer:${key}`) }
      }).catch(() => { if (operation === generation.current) for (const peer of batch) checked.current.set(peer, Date.now() - 270_000) })
        .finally(() => { if (operation === generation.current) queueMicrotask(flush) })
    }
    queueMicrotask(flush)
  }, [props.owner, props.profile?.did, props.avatarDisplayProfiles, emit])
  const demandGroup = useCallback((did: AwikiDid) => {
    const key = `group:${did}`
    if (props.owner === '' || (checked.current.get(key) ?? 0) > Date.now() - 300_000) return
    checked.current.set(key, Date.now())
    while (checked.current.size > 8192) checked.current.delete(checked.current.keys().next().value!)
    groupQueue.current.push({ did, operation: generation.current })
    const pump = () => {
      while (groupRunning.current < 4 && groupQueue.current.length > 0) {
        const job = groupQueue.current.shift()!
        if (job.operation !== generation.current) continue
        groupRunning.current++
        void props.avatarGroup(job.did).then(value => {
          if (job.operation !== generation.current) return
          if (value === null) { checked.current.set(`group:${job.did}`, Date.now() - 270_000); return }
          const old = groups.current.get(job.did)?.groupStateVersion
          const next = value.groupStateVersion
          if (old !== undefined && next !== undefined && /^(0|[1-9][0-9]*)$/u.test(old) && /^(0|[1-9][0-9]*)$/u.test(next) && BigInt(next) < BigInt(old)) return
          groups.current.set(job.did, value)
          emit(`group:${job.did}`)
          while (groups.current.size > 2048) { const key = groups.current.keys().next().value!; groups.current.delete(key); emit(`group:${key}`) }
        }).catch(() => { if (job.operation === generation.current) checked.current.set(`group:${job.did}`, Date.now() - 270_000) })
          .finally(() => { groupRunning.current--; pump() })
      }
    }
    pump()
  }, [props.owner, props.avatarGroup, emit])
  const context = useMemo(() => ({ owner: props.owner, self: props.profile, profiles: profiles.current, groups: groups.current, demand, demandGroup, subscribe }), [props.owner, props.profile, demand, demandGroup, subscribe])
  return <Context.Provider value={context}>{props.children}</Context.Provider>
}

/** Shared source selection for badges and profile-image previews. */
export function useAvatarReference(props: { did?: AwikiDid | undefined; uri?: string | null | undefined; thumbnail?: string | null | undefined }) {
  const context = useContext(Context)
  const peer = useSyncExternalStore(
    useCallback(listener => context?.subscribe(`peer:${props.did}`, listener) ?? (() => {}), [context?.subscribe, props.did]),
    () => props.did === undefined ? undefined : context?.profiles.get(props.did), () => undefined)
  const profile = props.did === context?.self?.did ? context?.self : peer
  return { context, profile, main: profile !== undefined && profile !== null ? profile.avatarUri : props.uri,
    thumbnail: profile !== undefined && profile !== null ? profile.avatarThumbnailUri : props.thumbnail }
}

export function AwikiAvatar(props: { name: string; did?: AwikiDid; groupDid?: AwikiDid; uri?: string | null | undefined; thumbnail?: string | null | undefined; size?: number }) {
  const context = useContext(Context)
  const element = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(typeof IntersectionObserver === 'undefined')
  const [loaded, setLoaded] = useState<{ owner: string; uri: string; image: string } | undefined>()
  const size = props.size ?? 36
  const { profile, main: peerMain, thumbnail } = useAvatarReference(props)
  const group = useSyncExternalStore(
    useCallback(listener => context?.subscribe(`group:${props.groupDid}`, listener) ?? (() => {}), [context?.subscribe, props.groupDid]),
    () => props.groupDid === undefined ? undefined : context?.groups.get(props.groupDid), () => undefined)
  const main = profile !== undefined && profile !== null ? peerMain : group !== undefined ? group.avatarUri : peerMain
  const uri = main === null ? undefined : safeAvatarUrl(size <= 64 ? thumbnail ?? main : main)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || element.current === null) return
    const observer = new IntersectionObserver(entries => { setVisible(entries.some(entry => entry.isIntersecting)) }, { rootMargin: '96px' })
    observer.observe(element.current); return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!visible) return
    const refresh = () => {
      if (document.visibilityState === 'hidden') return
      if (props.did !== undefined) context?.demand(props.did)
      if (props.groupDid !== undefined) context?.demandGroup(props.groupDid)
    }
    refresh(); const timer = setInterval(refresh, 30_000)
    document.addEventListener('visibilitychange', refresh)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', refresh) }
  }, [visible, props.did, props.groupDid, context?.demand, context?.demandGroup])
  useEffect(() => {
    setLoaded(undefined)
    if (!visible || uri === undefined || context?.owner === undefined || context.owner === '') return
    let active = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = async () => {
      if (!active) return
      if (document.visibilityState === 'hidden') { timer = setTimeout(() => { void load() }, 30_000); return }
      const value = await avatarCache.load(context.owner, uri, size <= 64 ? 128 : 512)
      if (!active) return
      if (value !== undefined) setLoaded({ owner: context.owner, uri, image: value })
      timer = setTimeout(() => { void load() }, value === undefined ? 30_000 : 300_000)
    }
    void load()
    return () => { active = false; clearTimeout(timer) }
  }, [context?.owner, uri, visible, size])
  const image = loaded?.owner === context?.owner && loaded?.uri === uri ? loaded?.image : undefined
  const members = uri === undefined ? group?.avatarMembers : undefined
  const label = Array.from(props.name.trim()).slice(0, 2).join('') || (props.groupDid === undefined ? '人' : '群')
  return <span ref={element} className={css.avatar} style={{ width: size, height: size, fontSize: size / 3 }} aria-label={props.name}>
    {members !== undefined && members.length > 0 && members.length <= 4 ? <span className={css.mosaic} data-count={members.length}>
      {members.map(member => <AwikiAvatar key={member.memberKey} name={member.memberHandle ?? member.memberDid} did={member.memberDid} size={members.length === 1 ? size : (size - 6) / 2} />)}
    </span> : image === undefined ? label : <img src={image} alt="" width={size} height={size} draggable={false} onError={() => { setLoaded(undefined) }} />}
  </span>
}
