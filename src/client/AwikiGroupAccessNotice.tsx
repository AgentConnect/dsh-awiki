import {
  IconLoadingOutline16,
  IconRefreshOutline16,
  IconWarningOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { AwikiGroupAccessView } from './controller.ts'
import css from './AwikiOverlay.module.css'

function accessCopy(status: AwikiGroupAccessView['status']): { readonly title: string; readonly detail: string } {
  switch (status) {
    case 'loading':
      return { title: '正在确认群成员权限', detail: '本机已有消息会先保留显示。' }
    case 'recovering':
      return { title: '正在恢复此群聊的身份关联', detail: '完成后即可继续同步和发送消息。' }
    case 'blocked':
      return { title: '此群聊无法自动恢复', detail: '旧成员记录没有绑定 Handle。本机已有消息仍可查看，也可以尝试重新加入。' }
    case 'not-member':
      return { title: '当前身份暂时无法访问此群聊', detail: '服务器尚未确认当前身份是群成员。本机已有消息仍可查看。' }
    case 'network-error':
      return { title: '暂时无法确认群成员权限', detail: '请检查网络后重新确认。本机已有消息不受影响。' }
    case 'available':
      return { title: '群聊可用', detail: '' }
  }
}

/** Group-scoped access state with bounded recovery and navigation actions. */
export function AwikiGroupAccessNotice(props: {
  readonly access: AwikiGroupAccessView
  readonly pending: boolean
  readonly onRetry: () => void
  readonly onRejoin: () => void
  readonly onBack?: () => void
  readonly compact?: boolean
}) {
  if (props.access.status === 'available') return null
  const copy = accessCopy(props.access.status)
  const loading = props.access.status === 'loading'
  const canRejoin = props.access.status === 'blocked' || props.access.status === 'not-member'
  return (
    <section
      className={css.groupAccessNotice}
      data-status={props.access.status}
      data-compact={props.compact || undefined}
      role={loading || props.access.status === 'recovering' ? 'status' : 'alert'}
      aria-live="polite"
    >
      <span className={css.groupAccessIcon}>
        {loading || props.access.status === 'recovering'
          ? <IconLoadingOutline16 size={16} />
          : <IconWarningOutline16 size={16} />}
      </span>
      <span className={css.groupAccessCopy}><strong>{copy.title}</strong><small>{copy.detail}</small></span>
      {!loading && (
        <span className={css.groupAccessActions}>
          <button type="button" disabled={props.pending} onClick={props.onRetry}><IconRefreshOutline16 size={14} />重新检查</button>
          {canRejoin && <button type="button" disabled={props.pending} onClick={props.onRejoin}>尝试重新加入</button>}
          {props.onBack !== undefined && <button type="button" disabled={props.pending} onClick={props.onBack}>返回会话列表</button>}
        </span>
      )}
    </section>
  )
}
