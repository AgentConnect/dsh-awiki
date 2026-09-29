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
  const { context, main } = useAvatarReference(props)
  const uri = safeAvatarUrl(main)
  useEffect(() => { context?.demand(props.did) }, [context?.demand, props.did])
  useEffect(() => { setOpen(false) }, [context?.owner, props.did])
  return <>
    {uri === undefined ? <AwikiAvatar {...props} /> : <button type="button" className={css.avatarAction} aria-label={`查看${props.name}的头像`} title="查看头像"
      onClick={() => { context?.demand(props.did, true); setOpen(true) }}><AwikiAvatar {...props} /></button>}
    {open && <Modal open title="头像" closeLabel="关闭头像" onClose={() => { setOpen(false) }}>
      <AvatarLargeImage owner={context?.owner ?? ''} uri={uri} />
    </Modal>}
  </>
}

function AvatarLargeImage(props: { owner: string; uri: string | undefined }) {
  const [retry, setRetry] = useState(0)
  const [state, setState] = useState<{ owner: string; uri: string; image?: string | undefined; loading: boolean }>()
  useEffect(() => {
    const { uri, owner } = props
    if (uri === undefined || owner === '') return
    let active = true
    setState({ owner, uri, loading: true })
    void avatarCache.load(owner, uri, 512, retry > 0).then(image => {
      if (active) setState({ owner, uri, image, loading: false })
    }).catch(() => { if (active) setState({ owner, uri, loading: false }) })
    return () => { active = false }
  }, [props.owner, props.uri, retry])
  const current = state?.owner === props.owner && state?.uri === props.uri ? state : undefined
  return <div className={css.previewBody}>
    {props.uri === undefined ? <p>尚未设置头像</p> : current === undefined || current.loading ? <p role="status">正在加载头像…</p>
      : current.image !== undefined ? <img className={css.previewImage} src={current.image} alt="头像大图" draggable={false} onError={() => { setState({ owner: props.owner, uri: props.uri!, loading: false }) }} />
        : <><p role="alert">头像加载失败，请重试。</p><button type="button" onClick={() => { setRetry(value => value + 1) }}>重试</button></>}
  </div>
}
