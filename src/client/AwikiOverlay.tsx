/** AWiki trigger, identity registration, and direct/group messaging drawer. */

import { useEffect, useId, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import {
  IconChevronLeftOutline14,
  IconCheckOutline16,
  IconChecklistOutline14,
  IconChevronDownOutline14,
  IconCloseOutline16,
  IconCopyOutline16,
  IconDataOutline16,
  IconDownloadOutline16,
  IconEditOutline16,
  IconGlobeOutline14,
  IconGoalOutline16,
  IconLoadingOutline16,
  IconPaperclipOutline16,
  IconPlusOutline16,
  IconRefreshOutline16,
  IconRefreshOutline14,
  IconSendOutline16,
  IconSparkle16,
  IconUserOutline16,
  Button,
  Menu,
  Modal,
  Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { AwikiConversation, AwikiConversationId, AwikiDownloadedAttachment, AwikiIdentity, AwikiMessage, AwikiMessageId } from '@awiki/dsh-plugin/types'
import type { AwikiSummaryView, AwikiView } from './controller.ts'
import { AWIKI_ME_APP_ICON_DATA_URL } from './assets.ts'
import { createAttachmentObjectUrl, fileToBase64, saveDownloadedAttachment } from './file.ts'
import type { AwikiOverlayProps } from './slots.ts'
import css from './AwikiOverlay.module.css'

export const AWIKI_LAUNCHER_POSITION_KEY = 'dsh-awiki-launcher-position-v1'
const LAUNCHER_SIZE = 48
const LAUNCHER_EDGE_GAP = 8
const LAUNCHER_RIGHT_OFFSET = 28
const LAUNCHER_BOTTOM_CLEARANCE = 152
const LAUNCHER_DRAG_THRESHOLD = 4
const DRAWER_LONG_PRESS_MS = 300
const DRAWER_ANCHOR_GAP = 8
const DRAWER_EDGE_GAP = 8
const DRAWER_NOMINAL_WIDTH = 720
const DRAWER_NOMINAL_HEIGHT = 720
const DRAWER_HORIZONTAL_RESERVE = 80
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const HISTORY_BOTTOM_THRESHOLD = 24

export interface AwikiLauncherPosition {
  readonly left: number
  readonly top: number
}

export type AwikiDrawerDirection = 'upper-left' | 'upper-right' | 'lower-left' | 'lower-right'

export interface AwikiDrawerPlacement extends AwikiLauncherPosition {
  readonly direction: AwikiDrawerDirection
}

/** Keep the floating launcher fully reachable inside the current viewport. */
export function clampAwikiLauncherPosition(position: AwikiLauncherPosition, width: number, height: number): AwikiLauncherPosition {
  return {
    left: Math.min(Math.max(position.left, LAUNCHER_EDGE_GAP), Math.max(LAUNCHER_EDGE_GAP, width - LAUNCHER_SIZE - LAUNCHER_EDGE_GAP)),
    top: Math.min(Math.max(position.top, LAUNCHER_EDGE_GAP), Math.max(LAUNCHER_EDGE_GAP, height - LAUNCHER_SIZE - LAUNCHER_EDGE_GAP)),
  }
}

function overflowAmount(
  position: AwikiLauncherPosition,
  panelWidth: number,
  panelHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): number {
  return Math.max(0, DRAWER_EDGE_GAP - position.left)
    + Math.max(0, DRAWER_EDGE_GAP - position.top)
    + Math.max(0, position.left + panelWidth + DRAWER_EDGE_GAP - viewportWidth)
    + Math.max(0, position.top + panelHeight + DRAWER_EDGE_GAP - viewportHeight)
}

/** Place the chat panel in the launcher corner quadrant with the least viewport overflow. */
export function resolveAwikiDrawerPlacement(
  launcher: AwikiLauncherPosition,
  panelWidth: number,
  panelHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  preferredDirection?: AwikiDrawerDirection,
): AwikiDrawerPlacement {
  const candidates: readonly AwikiDrawerPlacement[] = [
    {
      direction: 'upper-left',
      left: launcher.left - panelWidth - DRAWER_ANCHOR_GAP,
      top: launcher.top - panelHeight - DRAWER_ANCHOR_GAP,
    },
    {
      direction: 'upper-right',
      left: launcher.left + LAUNCHER_SIZE + DRAWER_ANCHOR_GAP,
      top: launcher.top - panelHeight - DRAWER_ANCHOR_GAP,
    },
    {
      direction: 'lower-left',
      left: launcher.left - panelWidth - DRAWER_ANCHOR_GAP,
      top: launcher.top + LAUNCHER_SIZE + DRAWER_ANCHOR_GAP,
    },
    {
      direction: 'lower-right',
      left: launcher.left + LAUNCHER_SIZE + DRAWER_ANCHOR_GAP,
      top: launcher.top + LAUNCHER_SIZE + DRAWER_ANCHOR_GAP,
    },
  ]
  const leastOverflow = candidates.reduce((best, candidate) => (
    overflowAmount(candidate, panelWidth, panelHeight, viewportWidth, viewportHeight)
      < overflowAmount(best, panelWidth, panelHeight, viewportWidth, viewportHeight)
      ? candidate
      : best
  ))
  const selected = preferredDirection === undefined
    ? leastOverflow
    : (candidates.find(candidate => candidate.direction === preferredDirection) ?? leastOverflow)
  return {
    direction: selected.direction,
    left: Math.min(Math.max(selected.left, DRAWER_EDGE_GAP), Math.max(DRAWER_EDGE_GAP, viewportWidth - panelWidth - DRAWER_EDGE_GAP)),
    top: Math.min(Math.max(selected.top, DRAWER_EDGE_GAP), Math.max(DRAWER_EDGE_GAP, viewportHeight - panelHeight - DRAWER_EDGE_GAP)),
  }
}

function defaultLauncherPosition(): AwikiLauncherPosition {
  return clampAwikiLauncherPosition({
    left: window.innerWidth - LAUNCHER_SIZE - LAUNCHER_RIGHT_OFFSET,
    top: window.innerHeight - LAUNCHER_SIZE - LAUNCHER_BOTTOM_CLEARANCE,
  }, window.innerWidth, window.innerHeight)
}

function readLauncherPosition(): AwikiLauncherPosition {
  try {
    const stored = window.sessionStorage.getItem(AWIKI_LAUNCHER_POSITION_KEY)
    if (stored !== null) {
      const value = JSON.parse(stored) as Partial<AwikiLauncherPosition>
      const { left, top } = value
      if (typeof left === 'number' && Number.isFinite(left) && typeof top === 'number' && Number.isFinite(top)) {
        return clampAwikiLauncherPosition({ left, top }, window.innerWidth, window.innerHeight)
      }
    }
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
  return defaultLauncherPosition()
}

function saveLauncherPosition(position: AwikiLauncherPosition): void {
  try {
    window.sessionStorage.setItem(AWIKI_LAUNCHER_POSITION_KEY, JSON.stringify(position))
  } catch {
    // The launcher remains usable when session storage is unavailable.
  }
}

function callPointerCapture(target: HTMLElement, method: 'setPointerCapture' | 'releasePointerCapture', pointerId: number): void {
  const capture: unknown = Reflect.get(target, method)
  if (typeof capture === 'function') Reflect.apply(capture, target, [pointerId])
}

/** Format one Host timestamp for compact local display. */
function time(value: number): string {
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(value)
}

/** Show a clock within 24 hours, otherwise only the local calendar date. */
function conversationTime(value: number, now = Date.now()): string {
  const age = now - value
  return age >= 0 && age < ONE_DAY_MS
    ? new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(value)
    : new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(value)
}

/** Render the identity registration form and its OTP challenge transition. */
function Registration(props: Pick<AwikiOverlayProps, 'sendRegistrationOtp' | 'registerIdentity'> & { pending: boolean }) {
  const [phone, setPhone] = useState('')
  const [handle, setHandle] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [retryDeadline, setRetryDeadline] = useState<number | null>(null)
  const [retrySeconds, setRetrySeconds] = useState(0)

  useEffect(() => {
    if (retryDeadline === null) return
    const update = () => {
      const remaining = Math.max(0, Math.ceil((retryDeadline - Date.now()) / 1000))
      setRetrySeconds(remaining)
      if (remaining === 0) setRetryDeadline(null)
    }
    update()
    const timer = setInterval(update, 250)
    return () => { clearInterval(timer) }
  }, [retryDeadline])

  const requestOtp = async () => {
    const result = await props.sendRegistrationOtp({ handle: handle.trim(), phone: phone.trim() })
    if (!result.ok) return
    const cooldownSeconds = Math.max(0, Math.ceil(result.value.retryAfterSeconds))
    setOtpSent(true)
    setRetryDeadline(Date.now() + cooldownSeconds * 1000)
    setRetrySeconds(cooldownSeconds)
    setNotice(`验证码已发送；${cooldownSeconds} 秒后可重新获取。`)
  }
  const register = async () => {
    /* v8 ignore next -- the registration action is rendered only after an OTP challenge starts. */
    if (!otpSent) return
    const result = await props.registerIdentity({
      phone: phone.trim(), handle: handle.trim(), otp: otp.trim(),
    })
    if (!result.ok) return
    setNotice(null)
  }

  return (
    <div className={css.registration}>
      <div className={css.registrationIcon}><IconUserOutline16 size={24} /></div>
      <h3>注册 AWiki 身份</h3>
      <p>该身份由当前 Harness 部署中的全部 Agent 共同使用。</p>
      <label>Handle<input value={handle} onChange={(event) => { setHandle(event.target.value) }} autoComplete="username" placeholder="例如 alice" /></label>
      <label>手机号<input value={phone} onChange={(event) => { setPhone(event.target.value) }} autoComplete="tel" /></label>
      {!otpSent ? (
        <button type="button" className={css.primary} disabled={props.pending || phone.trim() === '' || handle.trim() === ''} onClick={() => { void requestOtp() }}>
          获取验证码
        </button>
      ) : (
        <>
          <label>验证码<input value={otp} onChange={(event) => { setOtp(event.target.value) }} inputMode="numeric" autoComplete="one-time-code" /></label>
          <button type="button" className={css.primary} disabled={props.pending || handle.trim() === '' || otp.trim() === ''} onClick={() => { void register() }}>
            注册身份
          </button>
          <button type="button" className={css.linkButton} disabled={props.pending || retrySeconds > 0} onClick={() => { void requestOtp() }}>
            {retrySeconds > 0 ? `${retrySeconds} 秒后重新获取` : '重新获取验证码'}
          </button>
        </>
      )}
      {notice !== null && <p className={css.notice} role="status">{notice}</p>}
    </div>
  )
}

/** Let a signed-out installation resume its preserved local identity. */
function SignedOut(props: Pick<AwikiOverlayProps, 'login'> & { pending: boolean }) {
  const [error, setError] = useState<string | null>(null)
  const login = async () => {
    setError(null)
    const result = await props.login()
    if (!result.ok) setError(result.error)
  }
  return (
    <div className={css.centerState}>
      <div className={css.registrationIcon}><IconUserOutline16 size={24} /></div>
      <h3>已退出 AWiki</h3>
      <p>本机身份和消息数据仍安全保留。重新进入后会继续使用原来的 DID 和 Handle。</p>
      <button type="button" className={css.primary} disabled={props.pending} onClick={() => { void login() }}>
        重新进入
      </button>
      {error !== null && <small className={css.inlineError} role="alert">{error}</small>}
    </div>
  )
}

/** Prefer the peer WNS display name for a direct chat; groups keep their title. */
function conversationLabel(conversation: AwikiConversation): string {
  return conversation.kind === 'direct'
    ? (conversation.displayName ?? conversation.title)
    : conversation.title
}

/** Show only the deployment identity's WNS display name, never its routing Handle. */
function identityLabel(identity: AwikiIdentity): string {
  return identity.displayName ?? '未设置昵称'
}

/** Editable deployment identity summary shown above the conversation roster. */
function IdentityCard(props: Pick<AwikiOverlayProps, 'updateDisplayName'> & {
  identity: AwikiIdentity
  pending: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(props.identity.displayName ?? '')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!editing) setDraft(props.identity.displayName ?? '')
  }, [editing, props.identity.displayName])

  const cancel = () => {
    setDraft(props.identity.displayName ?? '')
    setError(null)
    setEditing(false)
  }
  const save = async () => {
    const displayName = draft.trim()
    const length = Array.from(displayName).length
    if (length === 0) {
      setError('请输入昵称')
      return
    }
    if (length > 50) {
      setError('昵称不能超过 50 个字符')
      return
    }
    setError(null)
    const result = await props.updateDisplayName(displayName)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setDraft(result.value.displayName ?? displayName)
    setEditing(false)
  }

  return (
    <div className={css.identityCard}>
      <div className={css.identityNameRow}>
        {editing ? (
          <form className={css.identityEditor} onSubmit={(event) => { event.preventDefault(); void save() }}>
            <input
              aria-label="昵称"
              autoFocus
              disabled={props.pending}
              value={draft}
              onChange={(event) => { setDraft(event.target.value) }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation()
                  cancel()
                }
              }}
            />
            <button type="submit" aria-label="保存昵称" disabled={props.pending}><IconCheckOutline16 size={14} /></button>
            <button type="button" aria-label="取消修改昵称" disabled={props.pending} onClick={cancel}><IconCloseOutline16 size={14} /></button>
          </form>
        ) : (
          <>
            <Tooltip label={props.identity.did} side="bottom">
              <button
                type="button"
                className={css.identityName}
                disabled={props.pending}
                onClick={() => { setError(null); setEditing(true) }}
              >
                {identityLabel(props.identity)}
              </button>
            </Tooltip>
            <Tooltip label="修改昵称" side="right">
              <button
                type="button"
                className={css.identityEdit}
                aria-label="修改昵称"
                disabled={props.pending}
                onClick={() => { setError(null); setEditing(true) }}
              >
                <IconEditOutline16 size={14} />
              </button>
            </Tooltip>
          </>
        )}
      </div>
      <small className={css.identityHandle}>{props.identity.handle}</small>
      <span className={css.identityStatus}><i />在线</span>
      {error !== null && <small className={css.identityError} role="alert">{error}</small>}
    </div>
  )
}

/** Incoming sender label: WNS display name, then Handle, then DID. */
function senderLabel(message: AwikiMessage, peerLabel?: string): string {
  if (message.outgoing) return '我'
  return peerLabel ?? message.senderDisplayName ?? message.senderHandle ?? message.senderDid
}

/** Render one direct or group conversation row. */
function ConversationRow(props: { conversation: AwikiConversation; active: boolean; onSelect: () => void }) {
  const label = conversationLabel(props.conversation)
  const unreadCount = props.conversation.unreadCount ?? 0
  const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount)
  const preview = props.conversation.lastMessagePreview ?? '暂无消息'
  return (
    <button
      type="button"
      className={css.conversationRow}
      data-active={props.active || undefined}
      aria-label={unreadCount > 0 ? `${label}，${unreadCount} 条未读消息` : undefined}
      onClick={props.onSelect}
    >
      <span className={css.avatar}>
        {props.conversation.kind === 'direct' ? '私' : '群'}
        {unreadCount > 0 && <span className={css.conversationUnreadBadge} aria-hidden="true">{unreadLabel}</span>}
      </span>
      <span className={css.conversationText}>
        <span className={css.conversationHeader}>
          <strong>{label}</strong>
          {props.conversation.lastMessageAt !== undefined && (
            <time className={css.conversationTime}>{conversationTime(props.conversation.lastMessageAt)}</time>
          )}
        </span>
        <small>{preview}</small>
      </span>
    </button>
  )
}

/** Render one AWiki message, including an attachment download action. */
function MessageRow(props: {
  message: AwikiMessage
  peerLabel?: string | undefined
  download: AwikiOverlayProps['downloadAttachment']
  onImageLoad?: (messageId: AwikiMessage['id']) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ url: string; value: AwikiDownloadedAttachment } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const imageAttachmentId = props.message.content.kind === 'attachment' && props.message.content.attachment.mimeType.startsWith('image/')
    ? props.message.content.attachment.id
    : null

  useEffect(() => {
    if (imageAttachmentId === null) return
    let disposed = false
    let objectUrl: string | null = null
    setPreview(null)
    setPreviewLoading(true)
    setError(null)
    void props.download(props.message.id, imageAttachmentId).then((result) => {
      if (disposed) return
      setPreviewLoading(false)
      if (!result.ok) {
        setError(result.error)
        return
      }
      objectUrl = createAttachmentObjectUrl(result.value)
      setPreview({ url: objectUrl, value: result.value })
    })
    return () => {
      disposed = true
      if (objectUrl !== null) URL.revokeObjectURL(objectUrl)
    }
  }, [imageAttachmentId, props.download, props.message.id])

  const download = async () => {
    /* v8 ignore next -- only attachment content renders the button that invokes this closure. */
    if (props.message.content.kind !== 'attachment') return
    if (preview !== null) {
      saveDownloadedAttachment(preview.value)
      return
    }
    const result = await props.download(props.message.id, props.message.content.attachment.id)
    if (!result.ok) { setError(result.error); return }
    saveDownloadedAttachment(result.value)
  }
  return (
    <div className={css.message} data-message-id={props.message.id} data-outgoing={props.message.outgoing || undefined}>
      <div className={css.messageMeta}>
        <span>{senderLabel(props.message, props.peerLabel)}</span>
        <time>{time(props.message.sentAt)}</time>
      </div>
      {props.message.content.kind === 'text' ? (
        <p>{props.message.content.text}</p>
      ) : preview !== null ? (
        <>
          <button type="button" className={css.imageAttachment} aria-label={`下载图片 ${props.message.content.attachment.fileName}`} onClick={() => { void download() }}>
            <img
              src={preview.url}
              alt={props.message.content.attachment.fileName}
              onLoad={() => { props.onImageLoad?.(props.message.id) }}
            />
            <span>
              <strong>{props.message.content.attachment.fileName}</strong>
              <small>{props.message.content.attachment.size} 字节</small>
              <IconDownloadOutline16 size={16} />
            </span>
          </button>
          {props.message.content.caption !== undefined && <p className={css.caption}>{props.message.content.caption}</p>}
        </>
      ) : (
        <>
          <button type="button" className={css.attachment} disabled={previewLoading} onClick={() => { void download() }}>
            <span>
              <strong>{props.message.content.attachment.fileName}</strong>
              <small>{previewLoading ? '正在加载图片预览…' : `${props.message.content.attachment.size} 字节`}</small>
            </span>
            <IconDownloadOutline16 size={16} />
          </button>
          {props.message.content.caption !== undefined && <p className={css.caption}>{props.message.content.caption}</p>}
        </>
      )}
      {error !== null && <small className={css.inlineError}>{error}</small>}
    </div>
  )
}

interface PendingSendDraft {
  readonly conversationId: AwikiConversationId
  readonly messageId: AwikiMessageId
  readonly startedAt: number
  readonly content:
    | { readonly kind: 'text'; readonly text: string }
    | {
      readonly kind: 'attachment'
      readonly fileName: string
      readonly size: number
      readonly caption?: string
    }
}

/** Render one optimistic outgoing bubble while the Host confirms delivery. */
function PendingMessageRow(props: { readonly draft: PendingSendDraft }) {
  return (
    <div className={css.pendingMessage} role="status" aria-live="polite" aria-label="消息发送中">
      <IconLoadingOutline16 className={css.pendingMessageSpinner} size={14} />
      <div className={css.pendingMessageContent}>
        <div className={css.messageMeta}>
          <span>我</span>
          <time>{time(props.draft.startedAt)}</time>
        </div>
        {props.draft.content.kind === 'text' ? (
          <p>{props.draft.content.text}</p>
        ) : (
          <>
            <div className={css.pendingAttachment}>
              <IconPaperclipOutline16 size={16} />
              <span>
                <strong>{props.draft.content.fileName}</strong>
                <small>{props.draft.content.size} 字节</small>
              </span>
            </div>
            {props.draft.content.caption !== undefined && <p className={css.pendingCaption}>{props.draft.content.caption}</p>}
          </>
        )}
      </div>
    </div>
  )
}

function summaryRangeLabel(summary: NonNullable<AwikiSummaryView['result']>): string {
  const scope = summary.range.kind === 'unread' ? '未读以来' : '最近消息'
  const formatter = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${scope} · ${summary.range.messageCount} 条消息 · ${formatter.format(summary.range.startedAt)}–${formatter.format(summary.range.endedAt)}`
}

function copiedSummary(summary: NonNullable<AwikiSummaryView['result']>): string {
  const sections = [
    'AI 对话总结',
    `范围：${summaryRangeLabel(summary)}`,
    '',
    '重点',
    ...summary.highlights.map(item => `- ${item}`),
    '',
    '结论',
    ...summary.conclusions.map(item => `- ${item}`),
    '',
    '待办',
    ...summary.todos.map(item => `- ${item.owner === undefined ? '' : `${item.owner}：`}${item.text}`),
  ]
  return sections.join('\n')
}

/** Render every user-visible summary state without obscuring history or the composer. */
function SummaryPanel(props: {
  readonly id: string
  readonly summary: AwikiSummaryView
  readonly regenerate: () => void
  readonly collapse: (collapsed: boolean) => void
  readonly viewSource: (messageId: AwikiMessage['id']) => void
}) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const result = props.summary.result

  useEffect(() => { setCopyState('idle') }, [result])

  if (props.summary.collapsed) {
    return (
      <div id={props.id} className={css.summaryPanel} data-collapsed>
        <button type="button" className={css.summaryCollapsed} aria-label="展开 AI 对话总结" aria-expanded="false" onClick={() => { props.collapse(false) }}>
          <span><IconSparkle16 size={14} />AI 对话总结</span>
          {result !== undefined && <small>{summaryRangeLabel(result)}</small>}
          {props.summary.stale && <em>有新消息</em>}
          <IconChevronDownOutline14 size={14} />
        </button>
      </div>
    )
  }

  const copy = async () => {
    if (result === undefined) return
    try {
      await navigator.clipboard.writeText(copiedSummary(result))
      setCopyState('copied')
    } catch {
      setCopyState('error')
    }
  }

  return (
    <section id={props.id} className={css.summaryPanel} aria-label="AI 对话总结" aria-live="polite">
      <header className={css.summaryHeader}>
        <span><IconSparkle16 size={15} /><strong>AI 对话总结</strong></span>
        {result !== undefined && <small>{summaryRangeLabel(result)}</small>}
        <button type="button" aria-label="折叠 AI 对话总结" aria-expanded="true" onClick={() => { props.collapse(true) }}>
          <IconChevronDownOutline14 size={14} />
        </button>
      </header>
      {props.summary.status === 'loading' && (
        <div className={css.summaryLoading} role="status">
          <IconLoadingOutline16 size={18} />
          <span><strong>正在整理这段对话…</strong><small>只会处理本次选择的消息范围</small></span>
        </div>
      )}
      {props.summary.status === 'error' && (
        <div className={css.summaryError} role="alert">
          <span>{props.summary.error ?? '暂时无法生成 AI 总结。'}</span>
          <button type="button" aria-label="重新生成 AI 总结" onClick={props.regenerate}><IconRefreshOutline14 size={14} />重新生成</button>
        </div>
      )}
      {props.summary.status === 'success' && result !== undefined && (
        <>
          {props.summary.stale && (
            <div className={css.summaryStale} role="status">
              <span>有新消息，当前总结已过期</span>
              <button type="button" aria-label="根据新消息重新生成 AI 总结" onClick={props.regenerate}>重新生成</button>
            </div>
          )}
          <div className={css.summaryBody}>
            <div className={css.summarySection}>
              <h4><IconGoalOutline16 size={15} />重点</h4>
              {result.highlights.length === 0 ? <p>暂无明确重点</p> : <ul>{result.highlights.map(item => <li key={item}>{item}</li>)}</ul>}
            </div>
            <div className={css.summarySection}>
              <h4><IconCheckOutline16 size={15} />结论</h4>
              {result.conclusions.length === 0 ? <p>暂无明确结论</p> : <ul>{result.conclusions.map(item => <li key={item}>{item}</li>)}</ul>}
            </div>
            <div className={css.summarySection}>
              <h4><IconChecklistOutline14 size={15} />待办</h4>
              {result.todos.length === 0 ? <p>暂无待办</p> : <ul>{result.todos.map(item => <li key={`${item.owner ?? ''}:${item.text}`}>{item.owner === undefined ? '' : <b>{item.owner}：</b>}{item.text}</li>)}</ul>}
            </div>
          </div>
          <footer className={css.summaryActions}>
            <button type="button" onClick={() => { props.viewSource(result.range.firstMessageId) }}>查看原消息</button>
            <span />
            <button type="button" aria-label="重新生成 AI 总结" onClick={props.regenerate}><IconRefreshOutline14 size={14} />重新生成</button>
            <button type="button" onClick={() => { void copy() }}><IconCopyOutline16 size={14} />{copyState === 'copied' ? '已复制' : '复制'}</button>
          </footer>
          {copyState === 'error' && <div className={css.summaryCopyError} role="alert">复制失败，请重试。</div>}
          <div className={css.summaryPrivacy}><IconDataOutline16 size={14} />仅发送所选范围的文本与附件元数据，不发送附件文件</div>
        </>
      )}
    </section>
  )
}

/** Render the conversation roster, history, composer, and one-file picker. */
function Chat(props: AwikiOverlayProps & { composeMenu: ReactNode; view: AwikiView & { identity: AwikiIdentity } }) {
  const { view } = props
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [sendingDraft, setSendingDraft] = useState<PendingSendDraft | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement | null>(null)
  const history = useRef<HTMLDivElement | null>(null)
  const previousConversationId = useRef<AwikiConversationId | null>(null)
  const previousMessageTail = useRef<{ conversationId: AwikiConversationId; messageId: AwikiMessage['id'] | null } | null>(null)
  const selectedConversationId = useRef<AwikiConversationId | null>(view.selectedConversationId)
  const conversationAwaitingBottom = useRef<AwikiConversationId | null>(null)
  const pendingInitialImages = useRef<Set<AwikiMessage['id']>>(new Set())
  const historyPinnedToBottom = useRef(true)
  const [historyAwayFromBottom, setHistoryAwayFromBottom] = useState(false)
  const [unseenMessageCount, setUnseenMessageCount] = useState(0)
  const selected = view.conversations.find(value => value.id === view.selectedConversationId)
  const summary = selected === undefined ? undefined : view.summaries[selected.id]
  const summaryPanelId = useId()
  selectedConversationId.current = view.selectedConversationId
  const visibleSendingDraft = sendingDraft?.conversationId === view.selectedConversationId
    && !view.messages.some(message => message.id === sendingDraft.messageId)
    ? sendingDraft
    : null

  const markSelectedConversationReadAtBottom = () => {
    const node = history.current
    const newestRendered = view.messages.at(-1)
    if (
      node === null
      || selected === undefined
      || newestRendered === undefined
      || (selected.unreadCount ?? 0) <= 0
      || view.localPending
      || (selected.lastMessageAt !== undefined && newestRendered.sentAt < selected.lastMessageAt)
      || node.scrollHeight - node.scrollTop - node.clientHeight > HISTORY_BOTTOM_THRESHOLD
    ) return
    void props.markSelectedConversationRead()
  }

  const scrollHistoryToLatest = (smooth: boolean) => {
    const node = history.current
    if (node === null) return
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (smooth && !reduceMotion && typeof node.scrollTo === 'function') {
      node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
    } else {
      node.scrollTop = node.scrollHeight
    }
    historyPinnedToBottom.current = true
    setHistoryAwayFromBottom(false)
    setUnseenMessageCount(0)
    if (!smooth || reduceMotion || typeof node.scrollTo !== 'function') {
      markSelectedConversationReadAtBottom()
    }
  }

  const syncHistoryPosition = () => {
    const node = history.current
    if (node === null) return
    const atBottom = node.scrollHeight - node.scrollTop - node.clientHeight <= HISTORY_BOTTOM_THRESHOLD
    historyPinnedToBottom.current = atBottom
    setHistoryAwayFromBottom(!atBottom)
    if (atBottom) {
      setUnseenMessageCount(0)
      markSelectedConversationReadAtBottom()
    }
  }

  useLayoutEffect(() => {
    markSelectedConversationReadAtBottom()
  }, [selected?.id, selected?.lastMessageAt, selected?.unreadCount, view.localPending, view.messages])

  useLayoutEffect(() => {
    const conversationId = view.selectedConversationId
    if (conversationId !== previousConversationId.current) {
      previousConversationId.current = conversationId
      conversationAwaitingBottom.current = conversationId
      pendingInitialImages.current.clear()
      previousMessageTail.current = conversationId === null
        ? null
        : { conversationId, messageId: view.messages.at(-1)?.id ?? null }
      historyPinnedToBottom.current = true
      setHistoryAwayFromBottom(false)
      setUnseenMessageCount(0)
    }
    if (conversationId === null || history.current === null) return
    if (view.localPending) return
    if (conversationAwaitingBottom.current === conversationId) {
      if (view.messages.length === 0) return
      pendingInitialImages.current = new Set(view.messages.flatMap(message => (
        message.content.kind === 'attachment' && message.content.attachment.mimeType.startsWith('image/')
          ? [message.id]
          : []
      )))
      previousMessageTail.current = { conversationId, messageId: view.messages.at(-1)?.id ?? null }
      scrollHistoryToLatest(false)
      if (pendingInitialImages.current.size === 0) {
        conversationAwaitingBottom.current = null
        markSelectedConversationReadAtBottom()
      }
      return
    }

    const previous = previousMessageTail.current
    previousMessageTail.current = { conversationId, messageId: view.messages.at(-1)?.id ?? null }
    if (previous?.conversationId !== conversationId || previous.messageId === null) return
    const previousTailIndex = view.messages.findIndex(message => message.id === previous.messageId)
    if (previousTailIndex < 0 || previousTailIndex === view.messages.length - 1) return
    const appendedMessageCount = view.messages.length - previousTailIndex - 1
    if (historyPinnedToBottom.current) {
      scrollHistoryToLatest(false)
    } else {
      setHistoryAwayFromBottom(true)
      setUnseenMessageCount(current => current + appendedMessageCount)
    }
  }, [view.localPending, view.messages, view.selectedConversationId])

  useLayoutEffect(() => {
    if (visibleSendingDraft === null || history.current === null) return
    scrollHistoryToLatest(false)
  }, [visibleSendingDraft])

  const scrollAfterInitialImage = (messageId: AwikiMessage['id']) => {
    if (selected === undefined || conversationAwaitingBottom.current !== selected.id) return
    if (!pendingInitialImages.current.delete(messageId)) return
    if (history.current !== null) scrollHistoryToLatest(false)
    if (pendingInitialImages.current.size === 0) conversationAwaitingBottom.current = null
    if (pendingInitialImages.current.size === 0) markSelectedConversationReadAtBottom()
  }

  const viewSummarySource = (messageId: AwikiMessage['id']) => {
    if (selected === undefined) return
    props.setSummaryCollapsed(selected.id, true)
    requestAnimationFrame(() => {
      const node = [...(history.current?.querySelectorAll<HTMLElement>('[data-message-id]') ?? [])]
        .find(candidate => candidate.dataset.messageId === messageId)
      if (node === undefined) return
      node.scrollIntoView({ block: 'center' })
      node.tabIndex = -1
      node.focus({ preventScroll: true })
    })
  }

  useEffect(() => {
    if (file === null || !file.type.startsWith('image/')) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => { URL.revokeObjectURL(url) }
  }, [file])

  const clearFile = () => {
    setFile(null)
    setFileError(null)
    /* v8 ignore else -- the clear action is available only while the mounted file input owns the selection. */
    if (input.current !== null) input.current.value = ''
  }

  const sendMessage = async () => {
    if (sendingDraft !== null || view.selectedConversationId === null) return
    const draft = text.trim()
    const conversationId = view.selectedConversationId
    if (file === null) {
      /* v8 ignore next -- the only invocation control is disabled while both text and attachment are empty. */
      if (draft === '') return
      const messageId = `msg-${crypto.randomUUID()}` as AwikiMessageId
      setSendingDraft({ conversationId, messageId, startedAt: Date.now(), content: { kind: 'text', text: draft } })
      setText('')
      const result = await props.sendText(draft, messageId)
      setSendingDraft(null)
      if (!result.ok && selectedConversationId.current === conversationId) setText(draft)
      return
    }
    if (file.size > view.attachmentMaxBytes) {
      setFileError(`附件不能超过 ${view.attachmentMaxBytes} 字节。`)
      return
    }
    setFileError(null)
    const selectedFile = file
    const bytesBase64 = await fileToBase64(selectedFile)
    const messageId = `msg-${crypto.randomUUID()}` as AwikiMessageId
    setSendingDraft({
      conversationId,
      messageId,
      startedAt: Date.now(),
      content: {
        kind: 'attachment',
        fileName: selectedFile.name,
        size: selectedFile.size,
        ...(draft === '' ? {} : { caption: draft }),
      },
    })
    clearFile()
    setText('')
    const result = await props.sendAttachment({
      fileName: selectedFile.name,
      mimeType: selectedFile.type || 'application/octet-stream',
      bytesBase64,
      ...(draft === '' ? {} : { caption: draft }),
      clientMessageId: messageId,
    })
    setSendingDraft(null)
    if (!result.ok && selectedConversationId.current === conversationId) {
      setFile(selectedFile)
      setText(draft)
    }
  }

  return (
    <div className={css.chat}>
      <aside className={css.roster} data-hidden={selected !== undefined || undefined} aria-label="会话">
        <IdentityCard
          identity={view.identity}
          pending={view.pending !== null}
          updateDisplayName={props.updateDisplayName}
        />
        <div className={css.rosterHeader}>
          <div className={css.rosterTitle}>会话</div>
          {props.composeMenu}
        </div>
        <div className={css.conversationList}>
          {view.conversations.map(conversation => (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              active={conversation.id === view.selectedConversationId}
              onSelect={() => { void props.selectConversation(conversation.id) }}
            />
          ))}
          {view.conversations.length === 0 && <p className={css.empty}>还没有可用的私聊或群聊。</p>}
        </div>
        {view.conversationsHasMore && <button type="button" className={css.more} onClick={() => { void props.loadMoreConversations() }}>加载更多会话</button>}
      </aside>
      <section className={css.thread} data-visible={selected !== undefined || undefined}>
        {selected === undefined ? (
          <div className={css.threadEmpty}><IconGlobeOutline14 size={28} /><p>选择一个私聊或群聊查看消息。</p></div>
        ) : (
          <>
            <header className={css.threadHeader}>
              <button type="button" className={css.back} aria-label="返回会话列表" onClick={() => { void props.selectConversation(null) }}><IconChevronLeftOutline14 /></button>
              <div className={css.threadTitle}><strong>{conversationLabel(selected)}</strong><small>{selected.kind === 'direct' ? '私聊' : '群聊'}</small></div>
              <button
                type="button"
                className={css.summaryTrigger}
                aria-controls={summaryPanelId}
                aria-expanded={summary === undefined ? undefined : !summary.collapsed}
                aria-label={summary?.status === 'loading' ? '正在生成 AI 总结' : summary?.collapsed === true ? '展开 AI 总结' : '生成 AI 总结'}
                disabled={summary?.status === 'loading'}
                onClick={() => {
                  if (summary !== undefined && !summary.collapsed && summary.status !== 'error') {
                    props.setSummaryCollapsed(selected.id, true)
                  } else if (summary?.collapsed === true) {
                    props.setSummaryCollapsed(selected.id, false)
                  } else {
                    void props.summarizeConversation()
                  }
                }}
              >
                {summary?.status === 'loading' ? <IconLoadingOutline16 size={14} /> : <IconSparkle16 size={14} />}
                <span>{summary?.status === 'loading' ? '总结中' : 'AI 总结'}</span>
                {summary !== undefined && <IconChevronDownOutline14 size={12} />}
              </button>
            </header>
            {summary !== undefined && (
              <SummaryPanel
                id={summaryPanelId}
                summary={summary}
                regenerate={() => { void props.summarizeConversation() }}
                collapse={collapsed => { props.setSummaryCollapsed(selected.id, collapsed) }}
                viewSource={viewSummarySource}
              />
            )}
            <div className={css.historyShell}>
              <div ref={history} className={css.history} role="log" aria-label="消息记录" onScroll={syncHistoryPosition}>
                {view.historyHasMore && <button type="button" className={css.more} onClick={() => { void props.loadOlderHistory() }}>加载更早消息</button>}
                {view.localPending && (
                  <div className={css.historyLoading} role="status" aria-live="polite" aria-label="正在读取本地消息">
                    <IconLoadingOutline16 size={18} />
                    <span>正在读取本地消息…</span>
                  </div>
                )}
                {!view.localPending && view.refreshing && view.messages.length === 0 && (
                  <div className={css.historyLoading} role="status" aria-live="polite" aria-label="正在同步消息">
                    <IconLoadingOutline16 size={18} />
                    <span>正在同步消息…</span>
                  </div>
                )}
                {view.messages.map(message => (
                  <MessageRow
                    key={message.id}
                    message={message}
                    peerLabel={selected.kind === 'direct' ? conversationLabel(selected) : undefined}
                    download={props.downloadAttachment}
                    onImageLoad={scrollAfterInitialImage}
                  />
                ))}
                {visibleSendingDraft !== null && <PendingMessageRow draft={visibleSendingDraft} />}
                {!view.localPending && !view.refreshing && view.messages.length === 0 && visibleSendingDraft === null && <p className={css.empty}>暂无消息。</p>}
              </div>
              {historyAwayFromBottom && (
                <button
                  type="button"
                  className={css.latestMessages}
                  aria-label={unseenMessageCount === 0 ? '下滑到最新消息' : `有 ${unseenMessageCount} 条新消息，下滑到最新消息`}
                  onClick={() => { scrollHistoryToLatest(true) }}
                >
                  <IconChevronDownOutline14 size={14} />
                  {unseenMessageCount > 0 && <span>新消息（{unseenMessageCount}）</span>}
                </button>
              )}
            </div>
            <div className={css.composer}>
              {fileError !== null && <small className={css.inlineError} role="alert">{fileError}</small>}
              <div className={css.composeInput}>
                {file !== null && (
                  <div className={css.filePreview} data-image={previewUrl !== null || undefined}>
                    {previewUrl === null
                      ? <span className={css.filePreviewIcon}><IconPaperclipOutline16 /></span>
                      : <img src={previewUrl} alt={file.name} />}
                    {previewUrl === null && <span className={css.filePreviewName}>{file.name}</span>}
                    <button type="button" className={css.removeFile} aria-label={`移除附件 ${file.name}`} onClick={clearFile}><IconCloseOutline16 size={12} /></button>
                  </div>
                )}
                <textarea
                  value={text}
                  onChange={(event) => { setText(event.target.value) }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
                    event.preventDefault()
                    if (view.pending === null && sendingDraft === null && (file !== null || text.trim() !== '')) void sendMessage()
                  }}
                  placeholder="输入消息"
                  rows={2}
                />
                <div className={css.composeActions}>
                  <Tooltip label="添加附件" side="top">
                    <button
                      type="button"
                      className={css.filePicker}
                      aria-label="添加附件"
                      disabled={view.pending !== null || sendingDraft !== null}
                      onClick={() => { input.current?.click() }}
                    >
                      <IconPaperclipOutline16 />
                    </button>
                  </Tooltip>
                  <input ref={input} type="file" className={css.fileInput} aria-label="选择一个附件" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setFileError(null) }} />
                  <button type="button" className={css.send} aria-label="发送消息" disabled={view.pending !== null || sendingDraft !== null || (file === null && text.trim() === '')} onClick={() => { void sendMessage() }}><IconSendOutline16 /></button>
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}

/**
 * Render the frame-wide AWiki trigger and right-side drawer.
 * @param props - slot-derived runtime, store, and injected AWiki operations.
 * @returns the persistent trigger and the conditionally mounted drawer.
 */
export function AwikiOverlay(props: AwikiOverlayProps) {
  const open = props.useStore(state => state.open)
  const view = props.useAwiki(state => state)
  const titleId = useId()
  const composeTitleId = useId()
  const groupComposeTitleId = useId()
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [composeDirect, setComposeDirect] = useState(false)
  const [peerHandle, setPeerHandle] = useState('')
  const [composeError, setComposeError] = useState<string | null>(null)
  const [composeGroup, setComposeGroup] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupMembers, setGroupMembers] = useState('')
  const [groupComposeError, setGroupComposeError] = useState<string | null>(null)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [logoutPending, setLogoutPending] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)
  const [launcherPosition, setLauncherPosition] = useState(readLauncherPosition)
  const [launcherDragging, setLauncherDragging] = useState(false)
  const [drawerDragging, setDrawerDragging] = useState(false)
  const [drawerDragDirection, setDrawerDragDirection] = useState<AwikiDrawerDirection | null>(null)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const rememberedConversationId = useRef<AwikiConversationId | null>(null)
  const drawerWasOpen = useRef(open)
  const suppressLauncherClick = useRef(false)
  const launcherDrag = useRef<{
    readonly pointerId: number
    readonly startX: number
    readonly startY: number
    readonly origin: AwikiLauncherPosition
    moved: boolean
    current: AwikiLauncherPosition
  } | null>(null)
  const drawerDrag = useRef<{
    readonly pointerId: number
    readonly startX: number
    readonly startY: number
    readonly origin: AwikiLauncherPosition
    timer: ReturnType<typeof setTimeout> | undefined
    armed: boolean
    moved: boolean
    current: AwikiLauncherPosition
  } | null>(null)
  const registered = view.status === 'ready' && view.identity !== null
  const unreadCount = view.conversations.reduce(
    (total, conversation) => total + (conversation.unreadCount ?? 0),
    0,
  )
  const unreadLabel = unreadCount > 99 ? '99+' : String(unreadCount)
  const drawerWidth = Math.min(DRAWER_NOMINAL_WIDTH, Math.max(1, window.innerWidth - DRAWER_HORIZONTAL_RESERVE))
  const drawerHeight = Math.min(DRAWER_NOMINAL_HEIGHT, Math.max(1, window.innerHeight - DRAWER_EDGE_GAP * 2))
  const drawerPlacement = resolveAwikiDrawerPlacement(
    launcherPosition,
    drawerWidth,
    drawerHeight,
    window.innerWidth,
    window.innerHeight,
    drawerDragDirection ?? undefined,
  )

  useEffect(() => {
    void props.open()
    return props.close
  }, [props.close, props.open])

  useEffect(() => () => {
    const drag = drawerDrag.current
    if (drag !== null) clearTimeout(drag.timer)
  }, [])

  useEffect(() => {
    const wasOpen = drawerWasOpen.current
    drawerWasOpen.current = open
    if (open) {
      if (view.selectedConversationId !== null) {
        rememberedConversationId.current = view.selectedConversationId
      } else if (!wasOpen && rememberedConversationId.current !== null) {
        const remembered = rememberedConversationId.current
        if (view.conversations.some(conversation => conversation.id === remembered)) {
          void props.selectConversation(remembered)
        } else {
          rememberedConversationId.current = null
        }
      }
      return
    }
    setAccountMenuOpen(false)
    setMenuOpen(false)
    setComposeDirect(false)
    setPeerHandle('')
    setComposeError(null)
    setComposeGroup(false)
    setGroupName('')
    setGroupMembers('')
    setGroupComposeError(null)
    const drag = drawerDrag.current
    if (drag !== null) clearTimeout(drag.timer)
    drawerDrag.current = null
    setDrawerDragging(false)
    setDrawerDragDirection(null)
    if (wasOpen && view.selectedConversationId !== null) {
      rememberedConversationId.current = view.selectedConversationId
      void props.selectConversation(null)
    }
  }, [open, props.selectConversation, view.conversations, view.selectedConversationId])

  const selectConversation: AwikiOverlayProps['selectConversation'] = (conversationId) => {
    rememberedConversationId.current = conversationId
    return props.selectConversation(conversationId)
  }

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (logoutOpen) {
        if (!logoutPending) setLogoutOpen(false)
        return
      }
      if (composeDirect) {
        setComposeDirect(false)
        return
      }
      if (composeGroup) {
        setComposeGroup(false)
        return
      }
      if (menuOpen) {
        setMenuOpen(false)
        return
      }
      if (accountMenuOpen) {
        setAccountMenuOpen(false)
        return
      }
      props.actions.close()
      launcherRef.current?.focus()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown) }
  }, [open, accountMenuOpen, composeDirect, composeGroup, logoutOpen, logoutPending, menuOpen, props.actions])

  useEffect(() => {
    const onResize = () => {
      setLauncherPosition((current) => {
        const next = clampAwikiLauncherPosition(current, window.innerWidth, window.innerHeight)
        saveLauncherPosition(next)
        return next
      })
    }
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize) }
  }, [])

  const onLauncherPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    launcherDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: launcherPosition,
      moved: false,
      current: launcherPosition,
    }
    callPointerCapture(event.currentTarget, 'setPointerCapture', event.pointerId)
  }

  const onLauncherPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = launcherDrag.current
    if (drag === null || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(deltaX, deltaY) < LAUNCHER_DRAG_THRESHOLD) return
    drag.moved = true
    setLauncherDragging(true)
    drag.current = clampAwikiLauncherPosition({
      left: drag.origin.left + deltaX,
      top: drag.origin.top + deltaY,
    }, window.innerWidth, window.innerHeight)
    setLauncherPosition(drag.current)
  }

  const finishLauncherDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = launcherDrag.current
    if (drag === null || drag.pointerId !== event.pointerId) return
    if (drag.moved) {
      suppressLauncherClick.current = true
      saveLauncherPosition(drag.current)
    }
    launcherDrag.current = null
    setLauncherDragging(false)
    callPointerCapture(event.currentTarget, 'releasePointerCapture', event.pointerId)
  }

  const onDrawerPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0
      || (event.target as HTMLElement).closest('button, input, textarea, a, [role="button"]') !== null) return
    const drag: NonNullable<typeof drawerDrag.current> = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      origin: launcherPosition,
      timer: undefined,
      armed: false,
      moved: false,
      current: launcherPosition,
    }
    drag.timer = setTimeout(() => {
      if (drawerDrag.current !== drag) return
      drag.armed = true
      setDrawerDragging(true)
      setDrawerDragDirection(drawerPlacement.direction)
    }, DRAWER_LONG_PRESS_MS)
    drawerDrag.current = drag
    callPointerCapture(event.currentTarget, 'setPointerCapture', event.pointerId)
  }

  const onDrawerPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = drawerDrag.current
    if (drag === null || drag.pointerId !== event.pointerId) return
    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (!drag.armed) {
      if (Math.hypot(deltaX, deltaY) < LAUNCHER_DRAG_THRESHOLD) return
      clearTimeout(drag.timer)
      drawerDrag.current = null
      callPointerCapture(event.currentTarget, 'releasePointerCapture', event.pointerId)
      return
    }
    event.preventDefault()
    drag.moved = true
    drag.current = clampAwikiLauncherPosition({
      left: drag.origin.left + deltaX,
      top: drag.origin.top + deltaY,
    }, window.innerWidth, window.innerHeight)
    setLauncherPosition(drag.current)
  }

  const finishDrawerDrag = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = drawerDrag.current
    if (drag === null || drag.pointerId !== event.pointerId) return
    clearTimeout(drag.timer)
    if (drag.moved) saveLauncherPosition(drag.current)
    drawerDrag.current = null
    setDrawerDragging(false)
    setDrawerDragDirection(null)
    callPointerCapture(event.currentTarget, 'releasePointerCapture', event.pointerId)
  }

  const toggleLauncher = () => {
    if (suppressLauncherClick.current) {
      suppressLauncherClick.current = false
      return
    }
    props.actions.toggle()
  }

  const startDirect = async () => {
    setComposeError(null)
    const result = await props.startDirectChat(peerHandle)
    if (!result.ok) {
      setComposeError(result.error)
      return
    }
    setComposeDirect(false)
    setPeerHandle('')
  }

  const createGroup = async () => {
    setGroupComposeError(null)
    const members = groupMembers
      .split(/[\n,，]+/u)
      .map(member => member.trim())
      .filter(member => member !== '')
    const result = await props.createGroup(groupName, members)
    if (!result.ok) {
      setGroupComposeError(result.error)
      return
    }
    setComposeGroup(false)
    setGroupName('')
    setGroupMembers('')
  }

  const logout = async () => {
    setLogoutPending(true)
    setLogoutError(null)
    const result = await props.logout()
    setLogoutPending(false)
    if (!result.ok) {
      setLogoutError(result.error)
      return
    }
    rememberedConversationId.current = null
    setLogoutOpen(false)
  }

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className={css.trigger}
        style={{ left: launcherPosition.left, top: launcherPosition.top }}
        data-dragging={launcherDragging || undefined}
        aria-label={open
          ? '收起 AWiki'
          : unreadCount > 0 ? `打开 AWiki，${unreadCount} 条未读消息` : '打开 AWiki'}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="AWiki"
        onClick={toggleLauncher}
        onPointerDown={onLauncherPointerDown}
        onPointerMove={onLauncherPointerMove}
        onPointerUp={finishLauncherDrag}
        onPointerCancel={finishLauncherDrag}
      >
        <img className={css.launcherIcon} src={AWIKI_ME_APP_ICON_DATA_URL} alt="" aria-hidden="true" draggable="false" />
        {unreadCount > 0 && <span className={css.unreadBadge} aria-hidden="true">{unreadLabel}</span>}
      </button>
      {open && (
        <div
          className={css.drawer}
          style={{ left: drawerPlacement.left, top: drawerPlacement.top }}
          data-placement={drawerPlacement.direction}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
        >
          <header
            className={css.drawerHeader}
            data-dragging={drawerDragging || undefined}
            title="长按拖动 AWiki"
            onPointerDown={onDrawerPointerDown}
            onPointerMove={onDrawerPointerMove}
            onPointerUp={finishDrawerDrag}
            onPointerCancel={finishDrawerDrag}
          >
            <div>
              {registered ? (
                <Menu
                  open={accountMenuOpen}
                  onClose={() => { setAccountMenuOpen(false) }}
                  align="start"
                  portal
                  compact
                  items={[{ id: 'logout', label: '退出登录', danger: true }]}
                  onSelect={() => {
                    setAccountMenuOpen(false)
                    setLogoutError(null)
                    setLogoutOpen(true)
                  }}
                  anchor={(
                    <button
                      type="button"
                      aria-label="AWiki 账户菜单"
                      aria-expanded={accountMenuOpen}
                      aria-haspopup="menu"
                      onClick={() => { setAccountMenuOpen(value => !value) }}
                    >
                      <IconGlobeOutline14 size={18} />
                    </button>
                  )}
                />
              ) : <IconGlobeOutline14 size={18} />}
              <h2 id={titleId}>AWiki</h2>
            </div>
            <button type="button" aria-label="刷新 AWiki" disabled={view.pending !== null} onClick={() => { void props.open() }}><IconRefreshOutline16 /></button>
            <button type="button" aria-label="关闭 AWiki" onClick={props.actions.close}><IconCloseOutline16 /></button>
          </header>
          {view.status === 'loading' && <div className={css.centerState} role="status">正在连接 AWiki…</div>}
          {view.status === 'error' && <div className={css.centerState}><p>{view.error}</p><button type="button" className={css.primary} onClick={() => { void props.open() }}>重试</button></div>}
          {view.status === 'ready' && view.sessionStatus === 'unregistered' && <Registration {...props} pending={view.pending !== null} />}
          {view.status === 'ready' && view.sessionStatus === 'signed-out' && <SignedOut login={props.login} pending={view.pending !== null} />}
          {view.status === 'ready' && view.sessionStatus === 'active' && view.identity !== null && (
            <Chat
              {...props}
              selectConversation={selectConversation}
              view={{ ...view, identity: view.identity }}
              composeMenu={(
                <Menu
                  open={menuOpen}
                  onClose={() => { setMenuOpen(false) }}
                  align="end"
                  portal
                  compact
                  items={[
                    { id: 'direct', label: '发起私聊' },
                    { id: 'group', label: '发起群聊' },
                  ]}
                  onSelect={(id) => {
                    setMenuOpen(false)
                    if (id === 'direct') setComposeDirect(true)
                    if (id === 'group') setComposeGroup(true)
                  }}
                  anchor={(
                    <button
                      type="button"
                      className={css.rosterAction}
                      aria-label="发起会话"
                      aria-expanded={menuOpen}
                      aria-haspopup="menu"
                      onClick={() => { setMenuOpen(value => !value) }}
                    >
                      <IconPlusOutline16 />
                    </button>
                  )}
                />
              )}
            />
          )}
          {composeDirect && (
            <div className={css.composeBackdrop}>
              <form
                className={css.composeCard}
                role="dialog"
                aria-modal="true"
                aria-labelledby={composeTitleId}
                onSubmit={(event) => { event.preventDefault(); void startDirect() }}
              >
                <h3 id={composeTitleId}>发起私聊</h3>
                <p>输入对方 Handle。打开会话前会先确认该用户存在。</p>
                <label>Handle<input value={peerHandle} onChange={(event) => { setPeerHandle(event.target.value); setComposeError(null) }} autoComplete="off" placeholder="例如 alice" autoFocus /></label>
                {view.pending === '查找用户' && <p role="status">正在查找用户…</p>}
                {composeError !== null && <p className={css.inlineError} role="alert">{composeError}</p>}
                <div className={css.composeActions}>
                  <button type="button" className={css.secondary} onClick={() => { setComposeDirect(false); setComposeError(null) }}>取消</button>
                  <button type="submit" className={css.primary} disabled={view.pending !== null || peerHandle.trim() === ''}>打开会话</button>
                </div>
              </form>
            </div>
          )}
          {composeGroup && (
            <div className={css.composeBackdrop}>
              <form
                className={css.composeCard}
                role="dialog"
                aria-modal="true"
                aria-labelledby={groupComposeTitleId}
                onSubmit={(event) => { event.preventDefault(); void createGroup() }}
              >
                <h3 id={groupComposeTitleId}>发起群聊</h3>
                <p>填写群名和首批成员。成员支持 Handle 或 DID，每行一个，也可以用逗号分隔。</p>
                <label>
                  群聊名称
                  <input
                    value={groupName}
                    onChange={(event) => { setGroupName(event.target.value); setGroupComposeError(null) }}
                    autoComplete="off"
                    placeholder="例如 发布协作群"
                    autoFocus
                  />
                </label>
                <label>
                  群成员
                  <textarea
                    value={groupMembers}
                    onChange={(event) => { setGroupMembers(event.target.value); setGroupComposeError(null) }}
                    rows={4}
                    placeholder={'例如 alice.awiki.info\nbob.awiki.info'}
                  />
                </label>
                {view.pending === '创建群聊' && <p role="status">正在创建群聊并邀请成员…</p>}
                {groupComposeError !== null && <p className={css.inlineError} role="alert">{groupComposeError}</p>}
                <div className={css.composeActions}>
                  <button type="button" className={css.secondary} onClick={() => { setComposeGroup(false); setGroupComposeError(null) }}>取消</button>
                  <button type="submit" className={css.primary} disabled={view.pending !== null || groupName.trim() === '' || groupMembers.trim() === ''}>创建群聊</button>
                </div>
              </form>
            </div>
          )}
          <Modal
            open={logoutOpen}
            onClose={() => { if (!logoutPending) setLogoutOpen(false) }}
            title="退出登录"
            closeLabel="取消"
            description="退出后，本机将暂停使用 AWiki；身份和本地数据都会保留。"
            footer={(
              <>
                <Button type="button" variant="outline" disabled={logoutPending} onClick={() => { setLogoutOpen(false) }}>
                  取消
                </Button>
                <Button type="button" variant="outline" className={css.logoutConfirm} disabled={logoutPending} onClick={() => { void logout() }}>
                  {logoutPending ? '正在退出…' : '确认退出'}
                </Button>
              </>
            )}
          >
            <div className={css.logoutWarning}>
              <p>退出期间，Web UI 和 Agent 都不能读取会话或使用该身份发送消息。</p>
              <p>稍后点击“重新进入”即可由本机 Rust SDK 恢复同一个 DID、Handle 和消息数据库。</p>
              {logoutError !== null && <p className={css.inlineError} role="alert">{logoutError}</p>}
            </div>
          </Modal>
          {view.error !== null && view.status !== 'error' && <div className={css.error} role="alert">{view.error}</div>}
          {view.pending !== null && view.pending !== '发送消息' && view.pending !== '发送附件' && view.pending !== '加载消息' && <div className={css.pending} role="status">{view.pending}…</div>}
        </div>
      )}
    </>
  )
}
