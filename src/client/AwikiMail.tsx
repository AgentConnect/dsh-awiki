/** On-demand AWiki mailbox UI. Mail content is always rendered as untrusted text. */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Button,
  IconChevronLeftOutline14,
  IconEditOutline16,
  IconFolderOpenOutline16,
  IconLoadingOutline16,
  IconPaperclipOutline16,
  IconRefreshOutline14,
  IconSendOutline16,
  IconWarningOutline16,
  Modal,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type {
  AwikiDid,
  AwikiMailAccount,
  AwikiMailAttachmentMetadata,
  AwikiMailMessage,
  AwikiMailSendRequest,
  AwikiMailSummary,
} from '@awiki/dsh-plugin/types'
import type { AwikiOverlayProps } from './slots.ts'
import {
  readMailFolderCache,
  readMailListCache,
  writeMailFolderCache,
  writeMailListCache,
  type CachedMailFolder,
} from './mail-list-cache.ts'
import {
  downloadableMailAttachment,
  downloadAndSaveMailAttachment,
  encodeMailAttachments,
  selectMailAttachments,
  type BrowserMailAttachmentLimits,
  type SelectedMailAttachment,
} from './mail-attachment.ts'
import css from './AwikiMail.module.css'

interface AwikiMailProps extends Pick<AwikiOverlayProps,
  'getConfig' | 'getMailAccount' | 'listMailInbox' | 'readMail' | 'markMailRead' | 'sendMail' | 'downloadMailAttachment'> {
  readonly active: boolean
  readonly cacheOwner: AwikiDid
  readonly identityCard: ReactNode
  readonly modeTabs: ReactNode
  readonly onUnreadCountChange: (count: number) => void
}

type MailPane = 'folders' | 'list' | 'detail'
type MailFolder = CachedMailFolder
const MAIL_NOTICE_AUTO_DISMISS_MS = 2_400

const MAIL_FOLDER_COPY: Record<MailFolder, {
  readonly title: string
  readonly empty: string
}> = {
  inbox: { title: '收件箱', empty: '收件箱里还没有邮件。' },
  sent: { title: '发件箱', empty: '还没有已发送邮件。' },
}

interface MailNotice {
  readonly id: number
  readonly text: string
}

interface MailAttachmentDownloadState {
  readonly status: 'loading' | 'error'
  readonly error?: string
}

interface MailDraft {
  readonly to: readonly string[]
  readonly cc: readonly string[]
  readonly subject: string
  readonly bodyText: string
}

function mailTime(value: string | undefined): string {
  if (value === undefined) return ''
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(parsed)
}

function participant(values: readonly string[], fallback: string): string {
  return values.length === 0 ? fallback : values.join('、')
}

function recipient(
  summary: AwikiMailSummary,
  folder: MailFolder,
  account: AwikiMailAccount | null,
): string {
  const fallback = folder === 'inbox' ? account?.mailboxAddress ?? '未提供' : '未提供'
  return participant(summary.to, fallback)
}

function splitAddresses(raw: string): readonly string[] {
  return raw.split(/[\s,，;；]+/u).map(value => value.trim()).filter(value => value !== '')
}

function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

function displayBytes(value: number): string {
  if (value < 1_024) return `${value} bytes`
  if (value < 1_024 * 1_024) return `${(value / 1_024).toFixed(value < 10 * 1_024 ? 1 : 0)} KiB`
  return `${(value / (1_024 * 1_024)).toFixed(value < 10 * 1_024 * 1_024 ? 1 : 0)} MiB`
}

function browserLocalStorage(): Storage | undefined {
  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

function initialMailListState(cacheOwner: AwikiDid): {
  readonly folder: MailFolder
  readonly items: readonly AwikiMailSummary[]
  readonly nextOffset?: number
  readonly hasMore: boolean
  readonly inboxUnreadCount: number
} {
  const storage = browserLocalStorage()
  if (storage === undefined) return { folder: 'inbox', items: [], hasMore: false, inboxUnreadCount: 0 }
  const folder = readMailFolderCache(storage, cacheOwner)
  const page = readMailListCache(storage, cacheOwner, folder)
  const inboxPage = folder === 'inbox' ? page : readMailListCache(storage, cacheOwner, 'inbox')
  return {
    folder,
    items: page?.items ?? [],
    ...(page?.nextOffset === undefined ? {} : { nextOffset: page.nextOffset }),
    hasMore: page?.hasMore === true && page.nextOffset !== undefined,
    inboxUnreadCount: inboxPage?.items.reduce((total, item) => total + (item.unread ? 1 : 0), 0) ?? 0,
  }
}

function validateDraft(toRaw: string, ccRaw: string, subjectRaw: string, bodyText: string):
  | { readonly ok: true; readonly value: MailDraft }
  | { readonly ok: false; readonly error: string } {
  const to = splitAddresses(toRaw)
  const cc = splitAddresses(ccRaw)
  if (to.length === 0) return { ok: false, error: '请至少填写一位收件人。' }
  if (to.length + cc.length > 20) return { ok: false, error: '收件人和抄送人合计不能超过 20 个。' }
  const recipients = [...to, ...cc]
  if (recipients.some(value => value.length < 3 || Array.from(value).length > 320 || !value.includes('@') || /\s/u.test(value))) {
    return { ok: false, error: '请检查收件人和抄送人的邮箱地址。' }
  }
  const canonical = recipients.map(value => value.toLocaleLowerCase())
  if (new Set(canonical).size !== canonical.length) return { ok: false, error: '收件人和抄送人不能重复。' }
  const subject = subjectRaw.trim()
  if (subject === '') return { ok: false, error: '请填写邮件主题。' }
  if (utf8Bytes(subject) > 1_024) return { ok: false, error: '邮件主题不能超过 1024 bytes。' }
  if (bodyText.trim() === '') return { ok: false, error: '请填写邮件正文。' }
  if (utf8Bytes(bodyText) > 65_536) return { ok: false, error: '邮件正文不能超过 65536 bytes。' }
  return { ok: true, value: { to, cc, subject, bodyText } }
}

function MailRow(props: {
  readonly summary: AwikiMailSummary
  readonly folder: MailFolder
  readonly active: boolean
  readonly onSelect: () => void
}) {
  const inbox = props.folder === 'inbox'
  const counterpart = inbox
    ? participant(props.summary.from, '未知发件人')
    : participant(props.summary.to, '未知收件人')
  const unread = inbox && props.summary.unread
  return (
    <button
      type="button"
      className={css.mailRow}
      data-active={props.active || undefined}
      data-unread={unread || undefined}
      aria-label={inbox
        ? `${unread ? '未读邮件' : '邮件'}：${props.summary.subject}，来自 ${counterpart}`
        : `已发送邮件：${props.summary.subject}，发给 ${counterpart}`}
      onClick={props.onSelect}
    >
      <span className={css.unreadDot} aria-hidden="true" />
      <span className={css.rowContent}>
        <span className={css.rowTop}>
          <strong>{counterpart}</strong>
          <time>{mailTime(inbox
            ? props.summary.receivedAt ?? props.summary.sentAt
            : props.summary.sentAt ?? props.summary.receivedAt)}</time>
        </span>
        <span className={css.rowSubject}>{props.summary.subject || '（无主题）'}</span>
        <span className={css.rowPreview}>{props.summary.preview || '暂无纯文本预览'}</span>
      </span>
      {props.summary.hasAttachments && (
        <span className={css.rowAttachment} aria-label={`${props.summary.attachmentCount ?? 1} 个附件`}>
          <IconPaperclipOutline16 size={13} />
          {props.summary.attachmentCount !== undefined && <small>{props.summary.attachmentCount}</small>}
        </span>
      )}
    </button>
  )
}

/** Render a persistent mail workspace; loading starts only after the user selects Mail. */
export function AwikiMail(props: AwikiMailProps) {
  const initialList = useMemo(() => initialMailListState(props.cacheOwner), [props.cacheOwner])
  const [account, setAccount] = useState<AwikiMailAccount | null>(null)
  const [folder, setFolder] = useState<MailFolder>(initialList.folder)
  const [inboxUnreadCount, setInboxUnreadCount] = useState(initialList.inboxUnreadCount)
  const [items, setItems] = useState<readonly AwikiMailSummary[]>(initialList.items)
  const [nextOffset, setNextOffset] = useState<number | undefined>(initialList.nextOffset)
  const [hasMore, setHasMore] = useState(initialList.hasMore)
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<AwikiMailSummary['id'] | null>(null)
  const [message, setMessage] = useState<AwikiMailMessage | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [markingRead, setMarkingRead] = useState(false)
  const [compose, setCompose] = useState(false)
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [subject, setSubject] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [attachmentLimits, setAttachmentLimits] = useState<BrowserMailAttachmentLimits | null>(null)
  const [attachments, setAttachments] = useState<readonly SelectedMailAttachment[]>([])
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [downloadStates, setDownloadStates] = useState<Readonly<Record<number, MailAttachmentDownloadState>>>({})
  const [composeError, setComposeError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState<MailNotice | null>(null)
  const [pane, setPane] = useState<MailPane>('folders')
  const loaded = useRef(false)
  const loadGeneration = useRef(0)
  const detailGeneration = useRef(0)
  const noticeRevision = useRef(0)
  const attachmentRevision = useRef(0)
  const fileInput = useRef<HTMLInputElement>(null)

  const visibleUnreadCount = useMemo(
    () => items.reduce((total, item) => total + (item.unread ? 1 : 0), 0),
    [items],
  )
  useEffect(() => { props.onUnreadCountChange(inboxUnreadCount) }, [props.onUnreadCountChange, inboxUnreadCount])

  const showNotice = (text: string) => {
    noticeRevision.current += 1
    setNotice({ id: noticeRevision.current, text })
  }

  useEffect(() => {
    if (notice === null) return
    const timer = window.setTimeout(() => {
      setNotice(current => current?.id === notice.id ? null : current)
    }, MAIL_NOTICE_AUTO_DISMISS_MS)
    return () => { window.clearTimeout(timer) }
  }, [notice])

  const applyListPage = (requestedFolder: MailFolder, page: {
    readonly items: readonly AwikiMailSummary[]
    readonly nextOffset?: number
    readonly hasMore: boolean
  }) => {
    setItems(page.items)
    if (requestedFolder === 'inbox') {
      setInboxUnreadCount(page.items.reduce((total, item) => total + (item.unread ? 1 : 0), 0))
    }
    setNextOffset(page.nextOffset)
    setHasMore(page.hasMore && page.nextOffset !== undefined)
    if (selectedId !== null && !page.items.some(item => item.id === selectedId)) {
      setSelectedId(null)
      setMessage(null)
    }
  }

  const hydrateListCache = (requestedFolder: MailFolder): boolean => {
    const storage = browserLocalStorage()
    if (storage === undefined) return false
    const cached = readMailListCache(storage, props.cacheOwner, requestedFolder)
    if (cached === undefined) return false
    applyListPage(requestedFolder, cached)
    return true
  }

  const persistListCache = (requestedFolder: MailFolder, page: {
    readonly items: readonly AwikiMailSummary[]
    readonly nextOffset?: number
    readonly hasMore: boolean
  }) => {
    const storage = browserLocalStorage()
    if (storage !== undefined) writeMailListCache(storage, props.cacheOwner, requestedFolder, page)
  }

  const refresh = async (requestedFolder: MailFolder = folder) => {
    const generation = ++loadGeneration.current
    setListLoading(true)
    setListError(null)
    setNotice(null)
    const cacheVisible = hydrateListCache(requestedFolder)
    const configRequest = props.getConfig()
    const accountRequest = props.getMailAccount()
    const inboxRequest = props.listMailInbox({ folder: requestedFolder, unreadOnly: false, limit: 20, offset: 0 })
    const configResult = await configRequest
    if (generation !== loadGeneration.current) return
    setAttachmentLimits(configResult.ok ? {
      maxCount: configResult.value.mailAttachmentMaxCount,
      maxBytes: configResult.value.mailAttachmentMaxBytes,
      totalMaxBytes: configResult.value.mailAttachmentTotalMaxBytes,
    } : null)
    const accountResult = await accountRequest
    if (generation !== loadGeneration.current) return
    if (accountResult.ok) {
      setAccount(accountResult.value)
    }
    const inboxResult = await inboxRequest
    if (generation !== loadGeneration.current) return
    setListLoading(false)
    if (!accountResult.ok || !inboxResult.ok) {
      const error = !accountResult.ok ? accountResult.error : inboxResult.ok ? null : inboxResult.error
      setListError(cacheVisible && error !== null ? `刷新失败，正在显示本地缓存。${error}` : error)
      return
    }
    applyListPage(requestedFolder, inboxResult.value)
    persistListCache(requestedFolder, inboxResult.value)
  }

  useEffect(() => {
    if (!props.active || loaded.current) return
    loaded.current = true
    setPane('list')
    void refresh()
  }, [props.active])

  const startCompose = () => {
    detailGeneration.current += 1
    setCompose(true)
    setSelectedId(null)
    setMessage(null)
    setComposeError(null)
    setNotice(null)
    setPane('detail')
  }

  const selectFolder = (nextFolder: MailFolder) => {
    detailGeneration.current += 1
    if (nextFolder === folder) {
      setCompose(false)
      setSelectedId(null)
      setMessage(null)
      setPane('list')
      return
    }
    setFolder(nextFolder)
    const storage = browserLocalStorage()
    if (storage !== undefined) writeMailFolderCache(storage, props.cacheOwner, nextFolder)
    setCompose(false)
    setSelectedId(null)
    setMessage(null)
    setDetailError(null)
    setDownloadStates({})
    const cached = hydrateListCache(nextFolder)
    if (!cached) applyListPage(nextFolder, { items: [], hasMore: false })
    setPane('list')
    void refresh(nextFolder)
  }

  const selectMail = async (summary: AwikiMailSummary) => {
    const generation = ++detailGeneration.current
    setCompose(false)
    setSelectedId(summary.id)
    setMessage(null)
    setDownloadStates({})
    setDetailLoading(true)
    setDetailError(null)
    setNotice(null)
    setPane('detail')
    const requestedId = summary.id
    const result = await props.readMail({ messageId: requestedId })
    if (generation !== detailGeneration.current) return
    setDetailLoading(false)
    if (!result.ok) {
      setDetailError(result.error)
      return
    }
    setMessage(result.value)
  }

  const loadMore = async () => {
    if (!hasMore || nextOffset === undefined || listLoading) return
    const generation = ++loadGeneration.current
    const requestedFolder = folder
    setListLoading(true)
    setListError(null)
    const result = await props.listMailInbox({
      folder: requestedFolder, unreadOnly: false, limit: 20, offset: nextOffset,
    })
    if (generation !== loadGeneration.current) return
    setListLoading(false)
    if (!result.ok) {
      setListError(result.error)
      return
    }
    const existing = new Set(items.map(item => item.id))
    const nextItems = [...items, ...result.value.items.filter(item => !existing.has(item.id))]
    setItems(nextItems)
    if (requestedFolder === 'inbox') {
      setInboxUnreadCount(nextItems.reduce((total, item) => total + (item.unread ? 1 : 0), 0))
    }
    setNextOffset(result.value.nextOffset)
    setHasMore(result.value.hasMore && result.value.nextOffset !== undefined)
    persistListCache(requestedFolder, {
      items: nextItems,
      ...(result.value.nextOffset === undefined ? {} : { nextOffset: result.value.nextOffset }),
      hasMore: result.value.hasMore,
    })
  }

  const markRead = async () => {
    if (message === null || !message.summary.unread || markingRead) return
    const generation = detailGeneration.current
    setMarkingRead(true)
    setDetailError(null)
    const result = await props.markMailRead({ messageIds: [message.summary.id] })
    setMarkingRead(false)
    if (generation !== detailGeneration.current) return
    if (!result.ok) {
      setDetailError(result.error)
      return
    }
    setMessage({ ...message, summary: { ...message.summary, unread: false } })
    setItems(current => {
      const updated = current.map(item => item.id === message.summary.id ? { ...item, unread: false } : item)
      persistListCache('inbox', {
        items: updated,
        ...(nextOffset === undefined ? {} : { nextOffset }),
        hasMore,
      })
      return updated
    })
    setInboxUnreadCount(current => Math.max(0, current - 1))
    showNotice(result.value.updated > 0 ? '已标为已读。' : '该邮件已经是已读状态。')
  }

  const requestSend = () => {
    if (attachmentError !== null) {
      setComposeError(attachmentError)
      return
    }
    if (attachments.length > 0 && attachmentLimits === null) {
      setComposeError('邮件附件限制暂不可用，请稍后刷新邮箱再试。')
      return
    }
    const validated = validateDraft(to, cc, subject, bodyText)
    if (!validated.ok) {
      setComposeError(validated.error)
      return
    }
    setComposeError(null)
    setConfirmOpen(true)
  }

  const clearDraft = () => {
    setTo('')
    setCc('')
    setSubject('')
    setBodyText('')
    setAttachments([])
    setAttachmentError(null)
    if (fileInput.current !== null) fileInput.current.value = ''
    setComposeError(null)
  }

  const chooseAttachments = (files: FileList | null) => {
    if (files === null || files.length === 0) return
    if (attachmentLimits === null) {
      setAttachmentError('邮件附件限制暂不可用，请稍后刷新邮箱再试。')
      return
    }
    try {
      const next = selectMailAttachments(attachments, files, attachmentLimits, () => {
        attachmentRevision.current += 1
        return `mail-attachment-${attachmentRevision.current}`
      })
      setAttachments(next)
      setAttachmentError(null)
      setComposeError(null)
    } catch (error) {
      setAttachmentError(error instanceof TypeError ? error.message : '无法选择这些附件。')
    }
  }

  const removeAttachment = (id: string) => {
    setAttachments(current => current.filter(attachment => attachment.id !== id))
    setAttachmentError(null)
    setComposeError(null)
  }

  const confirmSend = async () => {
    const validated = validateDraft(to, cc, subject, bodyText)
    if (!validated.ok) {
      setConfirmOpen(false)
      setComposeError(validated.error)
      return
    }
    if (attachmentError !== null || (attachments.length > 0 && attachmentLimits === null)) {
      setConfirmOpen(false)
      setComposeError(attachmentError ?? '邮件附件限制暂不可用，请稍后刷新邮箱再试。')
      return
    }
    setSending(true)
    let encodedAttachments: Awaited<ReturnType<typeof encodeMailAttachments>> = []
    try {
      if (attachments.length > 0) {
        encodedAttachments = await encodeMailAttachments(attachments, attachmentLimits!)
      }
    } catch (error) {
      setSending(false)
      setConfirmOpen(false)
      setComposeError(error instanceof TypeError ? error.message : '无法读取附件，请重新选择后再试。')
      return
    }
    const request: AwikiMailSendRequest = {
      to: validated.value.to,
      cc: validated.value.cc,
      subject: validated.value.subject,
      bodyText: validated.value.bodyText,
      ...(encodedAttachments.length === 0 ? {} : { attachments: encodedAttachments }),
    }
    const result = await props.sendMail(request)
    setSending(false)
    setConfirmOpen(false)
    if (!result.ok) {
      setComposeError(result.error)
      return
    }
    if (!result.value.accepted) {
      setComposeError('邮件服务没有接受本次发送，请检查内容后重试。')
      return
    }
    const acceptedWithWarning = result.value.warnings.length > 0
    clearDraft()
    setFolder('sent')
    const storage = browserLocalStorage()
    if (storage !== undefined) writeMailFolderCache(storage, props.cacheOwner, 'sent')
    setSelectedId(null)
    setMessage(null)
    setItems([])
    setNextOffset(undefined)
    setHasMore(false)
    setCompose(false)
    setPane('list')
    void refresh('sent')
    showNotice(acceptedWithWarning
      ? `邮件已被服务接受，但返回 ${result.value.warnings.length} 条本地记录提示，请勿立即重复发送。`
      : '邮件已发送。')
  }

  const dirty = to.trim() !== '' || cc.trim() !== '' || subject.trim() !== '' || bodyText.trim() !== '' || attachments.length > 0
  const cancelCompose = () => {
    if (dirty) {
      setDiscardOpen(true)
      return
    }
    setCompose(false)
    setPane('list')
  }

  const selectedSummary = items.find(item => item.id === selectedId)
  const attachmentTotalBytes = attachments.reduce((sum, attachment) => sum + attachment.sizeBytes, 0)

  const downloadAttachment = async (attachment: AwikiMailAttachmentMetadata) => {
    if (message === null || attachmentLimits === null) return
    const expected = downloadableMailAttachment(attachment, attachmentLimits.maxBytes)
    if (expected === undefined || downloadStates[attachment.index]?.status === 'loading') return
    const generation = detailGeneration.current
    const localMessageId = message.summary.id
    setDownloadStates(current => ({ ...current, [attachment.index]: { status: 'loading' } }))
    try {
      const saved = await downloadAndSaveMailAttachment(
        props.downloadMailAttachment,
        { localMessageId, attachmentIndex: attachment.index },
        expected,
        attachmentLimits.maxBytes,
        () => generation === detailGeneration.current && message.summary.id === localMessageId,
      )
      if (!saved) return
      setDownloadStates(current => {
        const next = { ...current }
        delete next[attachment.index]
        return next
      })
      showNotice(`已开始下载 ${expected.fileName}。`)
    } catch (error) {
      if (generation !== detailGeneration.current || message.summary.id !== localMessageId) return
      setDownloadStates(current => ({
        ...current,
        [attachment.index]: {
          status: 'error',
          error: error instanceof TypeError ? error.message : '无法保存附件，请重试。',
        },
      }))
    }
  }

  return (
    <div className={css.mail} data-pane={pane} data-detail-active={compose || selectedId !== null || undefined}>
      <aside className={css.sidebar} aria-label="邮箱导航">
        {props.identityCard}
        {props.modeTabs}
        <div className={css.accountCard}>
          <small>邮箱账号</small>
          <strong>{account?.displayName ?? account?.mailboxAddress ?? (listLoading ? '正在加载…' : '暂不可用')}</strong>
          {account?.mailboxAddress !== undefined && account.displayName !== undefined && <span>{account.mailboxAddress}</span>}
          {account?.status !== undefined && <span className={css.accountStatus}>{account.status}</span>}
        </div>
        <nav className={css.folderNav} aria-label="邮件文件夹">
          <button type="button" data-active={folder === 'inbox' || undefined} onClick={() => { selectFolder('inbox') }}>
            <IconFolderOpenOutline16 size={16} />
            <span>收件箱</span>
            {inboxUnreadCount > 0 && <small>{inboxUnreadCount > 99 ? '99+' : inboxUnreadCount}</small>}
          </button>
          <div className={css.folderRow} data-active={folder === 'sent' || undefined}>
            <button type="button" className={css.folderSelect} onClick={() => { selectFolder('sent') }}>
              <IconSendOutline16 size={16} />
              <span>发件箱</span>
            </button>
            <button type="button" className={css.composeIconButton} aria-label="写邮件" title="写邮件" onClick={startCompose}>
              <IconEditOutline16 size={16} />
            </button>
          </div>
        </nav>
      </aside>

      <section className={css.mailList} aria-label={MAIL_FOLDER_COPY[folder].title}>
        <header className={css.listHeader}>
          <button type="button" className={css.listBack} aria-label="返回邮箱导航" onClick={() => { setPane('folders') }}><IconChevronLeftOutline14 size={14} /></button>
          <div><strong>{MAIL_FOLDER_COPY[folder].title}</strong><small>{items.length} 封邮件{folder === 'inbox' && visibleUnreadCount > 0 ? ` · ${visibleUnreadCount} 封未读` : ''}</small></div>
          <button type="button" aria-label={`刷新${MAIL_FOLDER_COPY[folder].title}`} disabled={listLoading} onClick={() => { void refresh() }}>
            {listLoading ? <IconLoadingOutline16 size={15} /> : <IconRefreshOutline14 size={15} />}
          </button>
        </header>
        {listError !== null && <div className={css.inlineError} role="alert">{listError}<button type="button" onClick={() => { void refresh() }}>重试</button></div>}
        <div className={css.rows}>
          {items.map(item => (
            <MailRow key={item.id} summary={item} folder={folder} active={item.id === selectedId} onSelect={() => { void selectMail(item) }} />
          ))}
          {items.length === 0 && !listLoading && listError === null && (
            <div className={css.emptyState}><IconFolderOpenOutline16 size={26} /><p>{MAIL_FOLDER_COPY[folder].empty}</p></div>
          )}
        </div>
        {listLoading && items.length === 0 && <div className={css.loadingState} role="status"><IconLoadingOutline16 size={18} />正在加载邮件…</div>}
        {hasMore && <button type="button" className={css.loadMore} disabled={listLoading} onClick={() => { void loadMore() }}>{listLoading ? '正在加载…' : '加载更多邮件'}</button>}
      </section>

      <section className={css.mailDetail} aria-label={compose ? '写邮件' : '邮件详情'}>
        {compose ? (
          <form className={css.composer} onSubmit={(event) => { event.preventDefault(); requestSend() }}>
            <header className={css.detailHeader}>
              <button type="button" className={css.detailBack} aria-label={`返回${MAIL_FOLDER_COPY[folder].title}`} onClick={cancelCompose}><IconChevronLeftOutline14 size={14} /></button>
              <div><strong>写邮件</strong><small>发送纯文本邮件，可添加附件</small></div>
            </header>
            <div className={css.composeFields}>
              <label>收件人<textarea value={to} rows={1} disabled={sending} autoFocus placeholder="alice@example.com，可用逗号或换行分隔" onChange={(event) => { setTo(event.target.value); setComposeError(null) }} /></label>
              <label>抄送<textarea value={cc} rows={1} disabled={sending} placeholder="选填" onChange={(event) => { setCc(event.target.value); setComposeError(null) }} /></label>
              <label>主题<input value={subject} disabled={sending} placeholder="邮件主题" onChange={(event) => { setSubject(event.target.value); setComposeError(null) }} /></label>
              <label className={css.bodyField}>正文<textarea value={bodyText} disabled={sending} placeholder="输入纯文本邮件正文" onChange={(event) => { setBodyText(event.target.value); setComposeError(null) }} /></label>
              <section className={css.composeAttachments} aria-label="邮件附件">
                <div className={css.attachmentPickerRow}>
                  <label className={css.attachmentPicker}>
                    添加附件
                    <input
                      ref={fileInput}
                      type="file"
                      multiple
                      disabled={sending || attachmentLimits === null || attachmentLimits.maxCount === 0}
                      onChange={(event) => {
                        chooseAttachments(event.currentTarget.files)
                        event.currentTarget.value = ''
                      }}
                    />
                  </label>
                  <small>{attachmentLimits === null
                    ? '附件限制暂不可用'
                    : `最多 ${attachmentLimits.maxCount} 个 · 单个 ${displayBytes(attachmentLimits.maxBytes)} · 总计 ${displayBytes(attachmentLimits.totalMaxBytes)}`}</small>
                </div>
                {attachments.length > 0 && (
                  <div className={css.selectedAttachments}>
                    {attachments.map(attachment => (
                      <div key={attachment.id}>
                        <IconPaperclipOutline16 size={15} />
                        <span><strong>{attachment.fileName}</strong><small>{attachment.contentType} · {displayBytes(attachment.sizeBytes)}</small></span>
                        <button type="button" disabled={sending} aria-label={`移除附件 ${attachment.fileName}`} onClick={() => { removeAttachment(attachment.id) }}>移除</button>
                      </div>
                    ))}
                    <p>{attachments.length} 个附件 · 共 {displayBytes(attachmentTotalBytes)}</p>
                  </div>
                )}
              </section>
              {attachmentError !== null && <p className={css.composeError} role="alert">{attachmentError}</p>}
              {composeError !== null && <p className={css.composeError} role="alert">{composeError}</p>}
            </div>
            <footer className={css.composeFooter}>
              <button type="button" className={css.cancelButton} disabled={sending} onClick={cancelCompose}>取消</button>
              <button type="submit" className={css.sendButton} disabled={sending || attachmentError !== null}><IconSendOutline16 size={15} />发送</button>
            </footer>
          </form>
        ) : selectedId === null ? (
          <div className={css.detailEmpty}><IconFolderOpenOutline16 size={32} /><p>选择一封邮件查看内容。</p><button type="button" onClick={startCompose}>写邮件</button></div>
        ) : (
          <>
            <header className={css.detailHeader}>
              <button type="button" className={css.detailBack} aria-label={`返回${MAIL_FOLDER_COPY[folder].title}`} onClick={() => { detailGeneration.current += 1; setSelectedId(null); setMessage(null); setDownloadStates({}); setPane('list') }}><IconChevronLeftOutline14 size={14} /></button>
              <div><strong>{selectedSummary?.subject ?? '邮件详情'}</strong><small>{selectedSummary === undefined ? '' : folder === 'inbox' ? participant(selectedSummary.from, '未知发件人') : participant(selectedSummary.to, '未知收件人')}</small></div>
              {folder === 'inbox' && message?.summary.unread === true && <button type="button" className={css.markReadButton} disabled={markingRead} onClick={() => { void markRead() }}>{markingRead ? '处理中…' : '标为已读'}</button>}
            </header>
            {detailLoading && <div className={css.loadingState} role="status"><IconLoadingOutline16 size={18} />正在读取邮件…</div>}
            {detailError !== null && <div className={css.detailError} role="alert">{detailError}</div>}
            {message !== null && (
              <article className={css.messageBody}>
                <div className={css.messageMeta}>
                  <h3>{message.summary.subject || '（无主题）'}</h3>
                  <time>{mailTime(folder === 'inbox'
                    ? message.summary.receivedAt ?? message.summary.sentAt
                    : message.summary.sentAt ?? message.summary.receivedAt)}</time>
                  <dl>
                    <div><dt>发件人</dt><dd>{participant(message.summary.from, '未知发件人')}</dd></div>
                    <div><dt>收件人</dt><dd>{recipient(message.summary, folder, account)}</dd></div>
                    {message.summary.cc.length > 0 && <div><dt>抄送</dt><dd>{participant(message.summary.cc, '')}</dd></div>}
                  </dl>
                </div>
                <div className={css.untrustedNotice}><IconWarningOutline16 size={15} />{folder === 'inbox' ? '邮件内容来自外部，仅按纯文本显示。' : '已发送邮件仅按纯文本显示。'}</div>
                <div className={css.plainBody}>{message.bodyText ?? (message.hasHtmlBody ? '这封邮件仅包含 HTML 内容，出于安全原因未直接显示。' : '这封邮件没有可显示的纯文本正文。')}</div>
                {message.bodyTruncated && <p className={css.truncatedNotice}>正文内容已由服务端截断。</p>}
                {message.attachments.length > 0 && (
                  <section className={css.attachments} aria-label="邮件附件">
                    <h4>附件</h4>
                    {message.attachments.map(attachment => {
                      const downloadable = attachmentLimits === null ? undefined : downloadableMailAttachment(attachment, attachmentLimits.maxBytes)
                      const state = downloadStates[attachment.index]
                      return (
                        <div key={attachment.index}>
                          <IconPaperclipOutline16 size={15} />
                          <span>
                            <strong>{attachment.fileName ?? `附件 ${attachment.index + 1}`}</strong>
                            <small>{[attachment.contentType, attachment.sizeBytes === undefined ? undefined : `${attachment.sizeBytes} bytes`].filter(Boolean).join(' · ') || '暂无更多信息'}</small>
                            {downloadable === undefined && <small>当前记录缺少完整、可验证的下载元数据。</small>}
                            {state?.status === 'error' && <small className={css.attachmentDownloadError} role="alert">{state.error}</small>}
                          </span>
                          {downloadable !== undefined && (
                            <button
                              type="button"
                              disabled={state?.status === 'loading'}
                              aria-label={`${state?.status === 'error' ? '重试下载' : '下载附件'} ${downloadable.fileName}`}
                              onClick={() => { void downloadAttachment(attachment) }}
                            >
                              {state?.status === 'loading' ? '下载中…' : state?.status === 'error' ? '重试' : '下载'}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </section>
                )}
              </article>
            )}
          </>
        )}
      </section>

      {notice !== null && (
        <div
          key={notice.id}
          className={css.notice}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          onAnimationEnd={() => {
            setNotice(current => current?.id === notice.id ? null : current)
          }}
        >
          {notice.text}
        </div>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => { if (!sending) setConfirmOpen(false) }}
        title="确认发送邮件"
        closeLabel="取消"
        description="邮件将通过当前 AWiki 身份发送一次，失败后不会自动重试。"
        footer={<><Button type="button" variant="outline" disabled={sending} onClick={() => { setConfirmOpen(false) }}>返回修改</Button><Button type="button" disabled={sending} onClick={() => { void confirmSend() }}>{sending ? '正在发送…' : '确认发送'}</Button></>}
      >
        <div className={css.confirmSummary}>
          <p>收件人：{splitAddresses(to).length} 人</p>
          <p>抄送：{splitAddresses(cc).length} 人</p>
          <p>主题：{subject.trim()}</p>
          <p>附件：{attachments.length} 个 · 共 {displayBytes(attachmentTotalBytes)}</p>
          {attachments.map(attachment => <p key={attachment.id}>{attachment.fileName} · {attachment.contentType} · {displayBytes(attachment.sizeBytes)}</p>)}
        </div>
      </Modal>

      <Modal
        open={discardOpen}
        onClose={() => { setDiscardOpen(false) }}
        title="放弃这封邮件？"
        closeLabel="继续编辑"
        description="当前不会保存草稿，放弃后文字和附件选择都会被清空。"
        footer={<><Button type="button" variant="outline" onClick={() => { setDiscardOpen(false) }}>继续编辑</Button><Button type="button" variant="outline" onClick={() => { setDiscardOpen(false); clearDraft(); setCompose(false); setPane('list') }}>确认放弃</Button></>}
      >
        <p className={css.discardText}>收件人、主题、正文和已选择的附件都会丢失。</p>
      </Modal>
    </div>
  )
}
