import { useEffect, useState } from 'react'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { AwikiDid } from '../types.ts'
import { AwikiAvatar, useAvatarReference } from './AwikiAvatar.tsx'
import { avatarCache, safeAvatarUrl } from './avatar-cache.ts'
import { useAvatarDialogEscape } from './avatar-dialog.ts'
import css from './AwikiAvatar.module.css'

export function AwikiAvatarPreview(props: { did: AwikiDid; name: string; uri?: string | null | undefined; thumbnail?: string | null | undefined }) {
  const [open, setOpen] = useState(false)
  useAvatarDialogEscape(open, () => { setOpen(false) })
  const { context, main, thumbnail, subjectType } = useAvatarReference(props)
  const uri = safeAvatarUrl(main)
  useEffect(() => { context?.demand(props.did) }, [context?.demand, props.did])
  useEffect(() => { setOpen(false) }, [context?.owner, props.did])
  return <>
    {uri === undefined ? <AwikiAvatar {...props} /> : <button type="button" className={css.avatarAction} aria-label={`查看${props.name}的头像`} title="查看头像"
      onClick={() => { context?.demand(props.did, true); setOpen(true) }}><AwikiAvatar {...props} /></button>}
    {open && <Modal open title="头像" closeLabel="关闭头像" onClose={() => { setOpen(false) }}>
      <AvatarLargeImage owner={context?.owner ?? ''} uri={uri} poster={safeAvatarUrl(thumbnail)} animate={subjectType === 'agent'} name={props.name} />
    </Modal>}
  </>
}

function AvatarLargeImage(props: { owner: string; uri: string | undefined; poster: string | undefined; animate: boolean; name: string }) {
  const [retry, setRetry] = useState(0)
  const [motion, setMotion] = useState(false)
  const [failed, setFailed] = useState(false)
  const [state, setState] = useState<{ owner: string; uri: string; animate: boolean; image?: string | undefined; loading: boolean }>()
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const update = () => { setMotion(!media?.matches && document.visibilityState !== 'hidden') }
    update(); media?.addEventListener('change', update); document.addEventListener('visibilitychange', update)
    return () => { media?.removeEventListener('change', update); document.removeEventListener('visibilitychange', update) }
  }, [])
  const animate = props.animate && motion && !failed
  const uri = animate ? props.uri : props.poster ?? props.uri
  useEffect(() => {
    const { owner } = props
    if (uri === undefined || owner === '') return
    let active = true
    let loading = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const load = async (force = false) => {
      if (!active || loading) return
      clearTimeout(timer)
      loading = true
      const image = await avatarCache.load(owner, uri, 512, force, animate).catch(() => undefined)
      loading = false
      if (!active) return
      if (image === undefined && animate && props.poster !== undefined) { setFailed(true); return }
      setState(previous => ({ owner, uri, animate, image: image ?? (previous?.owner === owner && previous.uri === uri && previous.animate === animate ? previous.image : undefined), loading: false }))
      timer = setTimeout(() => { void load() }, 300_000)
    }
    const online = () => { clearTimeout(timer); void load(true) }
    window.addEventListener('online', online)
    void load(true)
    return () => { active = false; clearTimeout(timer); window.removeEventListener('online', online) }
  }, [props.owner, uri, retry, animate, props.poster])
  const current = state?.owner === props.owner && state?.uri === uri && state.animate === animate ? state : undefined
  return <div className={css.previewBody}>
    {props.uri === undefined ? <p>尚未设置头像</p> : current?.image !== undefined ? <img className={css.previewImage} src={current.image} alt="头像大图" draggable={false} onError={() => {
      if (animate && props.poster !== undefined) setFailed(true)
      else setState({ owner: props.owner, uri: uri!, animate, loading: false })
    }} /> : <><span role="img" aria-label={props.name}>{Array.from(props.name).slice(0, 2).join('')}</span>
      <p role={current === undefined ? "status" : "alert"}>{current === undefined ? '正在加载头像…' : '头像加载失败，请重试。'}</p>
      <button type="button" onClick={() => { setFailed(false); setRetry(value => value + 1) }}>重试</button></>}
  </div>
}
