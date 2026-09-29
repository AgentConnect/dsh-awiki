import { useEffect, useRef, useState } from 'react'
import ReactCrop from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { AwikiProfile } from '../types.ts'
import type { AwikiOverlayProps } from './slots.ts'
import { AwikiAvatar } from './AwikiAvatar.tsx'
import { useAvatarDialogEscape } from './avatar-dialog.ts'
import { avatarJpeg, avatarPreview, drawAvatarCrop, initialAvatarCrop, avatarCropRectangle, type AvatarCrop } from './avatar-image.ts'
import css from './AwikiAvatar.module.css'
import shared from './AwikiOverlay.module.css'

type Actions = Pick<AwikiOverlayProps, 'setAvatar' | 'clearAvatar' | 'refreshAvatarProfile'>
export function AwikiAvatarEditor(props: Actions & { profile: AwikiProfile | null; owner: string; onClose: () => void }) {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null)
  const [crop, setCrop] = useState<AvatarCrop>({ edge: 1, x: 0, y: 0 })
  const [busy, setBusy] = useState(true)
  useAvatarDialogEscape(true, () => { if (!busy) props.onClose() })
  const [error, setError] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [operation, setOperation] = useState<{ requestId: string; expectedProfileVersion: string; imageBase64?: string } | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const alive = useRef(true)
  const sourceCanvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    alive.current = true
    void props.refreshAvatarProfile().then(result => { if (alive.current) { if (!result.ok) setError(result.error); setBusy(false) } })
    return () => { alive.current = false }
  }, [props.owner, props.refreshAvatarProfile])
  useEffect(() => () => { bitmap?.close() }, [bitmap])
  useEffect(() => { if (bitmap !== null && sourceCanvas.current !== null) {
    const target = sourceCanvas.current
    target.width = bitmap.width; target.height = bitmap.height
    target.getContext('2d')?.drawImage(bitmap, 0, 0)
  } }, [bitmap])
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
      setBitmap(image); setCrop(initialAvatarCrop(image))
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
  const enabled = !busy && props.profile?.avatarUploadEnabled === true
  return <Modal open onClose={() => { if (!busy) props.onClose() }} title="设置头像" closeLabel="取消设置头像" className={shared.compactModal ?? ''}>
    <div className={css.editor} aria-busy={busy}>
      {bitmap === null ? <AwikiAvatar name={props.profile?.displayName ?? '头像'} {...props.profile?.did === undefined ? {} : { did: props.profile.did }} uri={props.profile?.avatarUri} size={112} /> : <>
        <ReactCrop aspect={1} keepSelection minWidth={40} minHeight={40}
          disabled={busy || operation !== null}
          crop={{ unit: '%', x: crop.x / bitmap.width * 100, y: crop.y / bitmap.height * 100, width: crop.edge / bitmap.width * 100, height: crop.edge / bitmap.height * 100 }}
          onChange={(_, percent) => { setCrop(avatarCropRectangle(bitmap, { x: percent.x / 100 * bitmap.width, y: percent.y / 100 * bitmap.height, edge: percent.width / 100 * bitmap.width })) }}
          ariaLabels={{ cropArea: '头像选框，方向键移动，聚焦边角后用方向键调整大小', nwDragHandle: '左上角', nDragHandle: '上边', neDragHandle: '右上角', eDragHandle: '右边', seDragHandle: '右下角', sDragHandle: '下边', swDragHandle: '左下角', wDragHandle: '左边' }}>
          <canvas ref={sourceCanvas} className={css.cropSource} aria-label="固定的头像图片"
            style={{ width: Math.min(1, 340 / bitmap.width, 280 / bitmap.height) * bitmap.width }} />
        </ReactCrop>
        <div className={css.comparison}>
          <div><AwikiAvatar name={props.profile?.displayName ?? '头像'} {...props.profile?.did === undefined ? {} : { did: props.profile.did }} uri={props.profile?.avatarUri} size={72} /><small>当前头像</small></div>
          <div><canvas ref={canvas} className={css.cropPreview} width={128} height={128} role="img" aria-label="新头像预览" /><small>新头像预览</small></div>
        </div>
      </>}
      <p className={css.hint}>{bitmap === null ? '选择 JPEG、PNG 或静态 WebP 图片，最大 20 MB。' : '拖动正方形调整位置，拖动四角调整选框大小。'}</p>
      {bitmap !== null && <p className={css.hint} style={{ minHeight: 20 }}>{crop.edge < 512 ? '所选区域较小，头像可能模糊。' : '\u00a0'}</p>}
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
