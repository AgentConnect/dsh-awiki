import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { AwikiProfile } from '../types.ts'
import type { AwikiOverlayProps } from './slots.ts'
import { AwikiAvatar } from './AwikiAvatar.tsx'
import { avatarJpeg, avatarPreview, drawAvatarCrop, type AvatarCrop } from './avatar-image.ts'
import css from './AwikiAvatar.module.css'
import shared from './AwikiOverlay.module.css'

type Actions = Pick<AwikiOverlayProps, 'setAvatar' | 'clearAvatar' | 'refreshAvatarProfile'>
export function AwikiAvatarEditor(props: Actions & { profile: AwikiProfile | null; owner: string; onClose: () => void }) {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null)
  const [crop, setCrop] = useState<AvatarCrop>({ zoom: 1, x: 0.5, y: 0.5 })
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [operation, setOperation] = useState<{ requestId: string; expectedProfileVersion: string; imageBase64?: string } | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const alive = useRef(true)
  const pointer = useRef<{ x: number; y: number; crop: AvatarCrop } | null>(null)
  useEffect(() => {
    alive.current = true
    void props.refreshAvatarProfile().then(result => { if (alive.current) { if (!result.ok) setError(result.error); setBusy(false) } })
    return () => { alive.current = false }
  }, [props.owner, props.refreshAvatarProfile])
  useEffect(() => () => { bitmap?.close() }, [bitmap])
  useEffect(() => { if (bitmap !== null && canvas.current !== null) drawAvatarCrop(canvas.current, bitmap, crop) }, [bitmap, crop])
  useEffect(() => {
    if (operation !== null && !busy && props.profile?.profileVersion !== undefined && props.profile.profileVersion !== operation.expectedProfileVersion) {
      setOperation(null); setBitmap(null); setError('已读取最新头像，请确认当前结果后再操作。')
    }
  }, [operation, busy, props.profile?.profileVersion])
  const choose = async (file: File | undefined) => {
    if (file === undefined) return
    setBusy(true); setError(null); setConfirmClear(false)
    try {
      const image = await avatarPreview(file)
      if (!alive.current) { image.close(); return }
      setBitmap(image); setCrop({ zoom: 1, x: 0.5, y: 0.5 })
    } catch (error) { if (alive.current) setError(error instanceof Error ? error.message : '无法读取图片，请换一张照片') }
    finally { if (alive.current) setBusy(false) }
  }
  const save = async (clear = false) => {
    const version = props.profile?.profileVersion
    if (version === undefined || props.profile?.avatarUploadEnabled !== true || busy) return
    setBusy(true); setError(null)
    try {
      const pending = operation ?? {
        requestId: crypto.randomUUID(), expectedProfileVersion: version,
        ...clear || bitmap === null ? {} : { imageBase64: await avatarJpeg(bitmap, crop) },
      }
      if (!alive.current) return
      setOperation(pending)
      const result = pending.imageBase64 === undefined ? await props.clearAvatar(pending) : await props.setAvatar({ ...pending, imageBase64: pending.imageBase64 })
      if (!alive.current) return
      if (result.ok) props.onClose()
      else setError('尚未确认保存结果。请检查网络后重试；重试会继续同一次保存。')
    } catch { if (alive.current) setError('无法处理或保存头像，请重试或换一张照片。') }
    finally { if (alive.current) setBusy(false) }
  }
  const drag = (event: PointerEvent<HTMLCanvasElement>) => {
    const start = pointer.current
    if (start === null || bitmap === null || busy) return
    const edge = Math.min(bitmap.width, bitmap.height) / crop.zoom
    const size = event.currentTarget.getBoundingClientRect().width
    const dx = (event.clientX - start.x) * edge / size, dy = (event.clientY - start.y) * edge / size
    setCrop({ ...crop, x: bitmap.width === edge ? 0.5 : Math.max(0, Math.min(1, start.crop.x - dx / (bitmap.width - edge))), y: bitmap.height === edge ? 0.5 : Math.max(0, Math.min(1, start.crop.y - dy / (bitmap.height - edge))) })
  }
  const enabled = !busy && props.profile?.avatarUploadEnabled === true
  return <Modal open onClose={() => { if (!busy) props.onClose() }} title="设置头像" closeLabel="取消设置头像" className={shared.compactModal ?? ''}>
    <div className={css.editor} aria-busy={busy}>
      {bitmap === null ? <AwikiAvatar name={props.profile?.displayName ?? '头像'} {...props.profile?.did === undefined ? {} : { did: props.profile.did }} uri={props.profile?.avatarUri} size={112} /> : <>
        <canvas ref={canvas} className={css.crop} width={512} height={512} tabIndex={0} role="img" aria-label="头像裁剪预览，可拖动或使用方向键调整位置"
          onPointerDown={event => { if (!busy) { event.currentTarget.setPointerCapture(event.pointerId); pointer.current = { x: event.clientX, y: event.clientY, crop } } }}
          onPointerMove={drag} onPointerUp={() => { pointer.current = null }} onPointerCancel={() => { pointer.current = null }}
          onKeyDown={event => {
            if (busy || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return
            event.preventDefault(); setCrop({ ...crop, x: Math.max(0, Math.min(1, crop.x + (event.key === 'ArrowRight' ? 0.03 : event.key === 'ArrowLeft' ? -0.03 : 0))), y: Math.max(0, Math.min(1, crop.y + (event.key === 'ArrowDown' ? 0.03 : event.key === 'ArrowUp' ? -0.03 : 0))) })
          }} />
        <label className={css.controls}>缩放<input type="range" aria-label="缩放头像" min={1} max={4} step={0.01} disabled={busy} value={crop.zoom} onChange={event => { setCrop({ ...crop, zoom: Number(event.target.value) }) }} /></label>
      </>}
      <p className={css.hint}>{bitmap === null ? '选择 JPEG、PNG 或静态 WebP 图片，最大 20 MB。' : '拖动图片调整位置，圆形区域即为头像预览。'}</p>
      {bitmap !== null && Math.min(bitmap.width, bitmap.height) < 512 && <p className={css.hint}>图片尺寸较小，头像可能模糊。建议选择至少 512×512 的图片。</p>}
      {busy && <p role="status">正在处理头像…</p>}
      {error !== null && <p role="alert" className={css.hint}>{error}</p>}
      {confirmClear && <p className={css.hint}>确定恢复默认头像？</p>}
      {!busy && props.profile?.avatarUploadEnabled !== true && <p className={css.hint}>当前账号或服务暂不支持修改头像。</p>}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden aria-label="选择头像图片" onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; void choose(file) }} />
      <div className={css.actions}>
        <button type="button" className={shared.secondary} disabled={!enabled || operation !== null} onClick={() => { input.current?.click() }}>选择照片</button>
        {operation !== null ? <button type="button" className={shared.primary} disabled={!enabled} onClick={() => { void save() }}>重试保存</button> : bitmap !== null ? <button type="button" className={shared.primary} disabled={!enabled} onClick={() => { void save() }}>保存头像</button> : props.profile?.avatarUri != null && <button type="button" className={shared.secondary} disabled={!enabled} onClick={() => { if (confirmClear) void save(true); else setConfirmClear(true) }}>{confirmClear ? '确认恢复默认头像' : '恢复默认头像'}</button>}
        <button type="button" className={shared.secondary} disabled={busy} onClick={props.onClose}>取消</button>
      </div>
    </div>
  </Modal>
}
