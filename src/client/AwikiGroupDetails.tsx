import { useEffect, useState } from 'react'
import {
  Button,
  IconCloseOutline16,
  IconLoadingOutline16,
  IconPlusOutline16,
  IconRefreshOutline16,
  IconTrashOutline16,
  Modal,
  Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { AwikiGroupMemberRecord, AwikiGroupSnapshot, AwikiIdentity } from '@awiki/dsh-plugin/types'
import type { AwikiGroupAccessView } from './controller.ts'
import { AwikiGroupAccessNotice } from './AwikiGroupAccessNotice.tsx'
import type { AwikiOverlayProps } from './slots.ts'
import { shortenedDid } from './mentions.ts'
import css from './AwikiOverlay.module.css'

function roleRank(role: string | undefined): number {
  switch (role?.toLocaleLowerCase()) {
    case 'owner': return 3
    case 'admin': return 2
    case 'member': return 1
    default: return 0
  }
}

function roleLabel(role: string | undefined): string {
  switch (role?.toLocaleLowerCase()) {
    case 'owner': return '群主'
    case 'admin': return '管理员'
    case 'member': return '成员'
    default: return role?.trim() || '成员'
  }
}

function memberIsSelf(member: AwikiGroupMemberRecord, identity: AwikiIdentity): boolean {
  return member.did === identity.did
    || member.credentialDid === identity.did
    || (member.handle !== undefined && member.handle === identity.handle)
}

/** UI permission hint. Core/server remains the final membership authority. */
export function canRemoveGroupMember(
  actorRole: string | undefined,
  member: AwikiGroupMemberRecord,
  identity: AwikiIdentity,
): boolean {
  const actorRank = roleRank(actorRole)
  return actorRank >= 2
    && !memberIsSelf(member, identity)
    && actorRank > roleRank(member.role)
    && (member.did !== undefined || member.handle !== undefined)
}

function memberLabel(member: AwikiGroupMemberRecord): string {
  const displayName = member.displayName?.trim()
  if (displayName !== undefined && displayName !== '') return displayName
  const handle = member.handle?.trim()
  if (handle !== undefined && handle !== '') return handle
  if (member.did !== undefined) return shortenedDid(member.did)
  return member.peerPersonaId ?? member.membershipId ?? '未知成员'
}

type GroupActions = Pick<AwikiOverlayProps,
  | 'refreshSelectedGroup'
  | 'loadMoreGroupMembers'
  | 'addSelectedGroupMember'
  | 'removeSelectedGroupMember'
  | 'leaveSelectedGroup'
  | 'joinGroup'
>

type InviteStatus =
  | { readonly state: 'idle' }
  | { readonly state: 'pending'; readonly member: string }
  | { readonly state: 'success'; readonly member: string }
  | { readonly state: 'error'; readonly message: string }

/** Authoritative group snapshot and role-aware member management panel. */
export function AwikiGroupDetails(props: GroupActions & {
  readonly group: AwikiGroupSnapshot | null
  readonly fallback: { readonly groupDid: AwikiGroupSnapshot['groupDid']; readonly title: string }
  readonly access: AwikiGroupAccessView
  readonly members: readonly AwikiGroupMemberRecord[]
  readonly hasMore: boolean
  readonly identity: AwikiIdentity
  readonly pending: boolean
  readonly onClose: () => void
}) {
  const [invite, setInvite] = useState('')
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>({ state: 'idle' })
  const [error, setError] = useState<string | null>(null)
  const [removeCandidate, setRemoveCandidate] = useState<AwikiGroupMemberRecord | null>(null)
  const [leaveOpen, setLeaveOpen] = useState(false)

  useEffect(() => {
    if (inviteStatus.state !== 'success') return
    const timer = window.setTimeout(() => { setInviteStatus({ state: 'idle' }) }, 3_000)
    return () => { window.clearTimeout(timer) }
  }, [inviteStatus])

  const refresh = async () => {
    setError(null)
    const result = await props.refreshSelectedGroup()
    if (!result.ok) setError(result.error)
  }

  const add = async () => {
    const member = invite.trim()
    if (member === '' || inviteStatus.state === 'pending') return
    setInviteStatus({ state: 'pending', member })
    const result = await props.addSelectedGroupMember(member)
    if (!result.ok) {
      setInviteStatus({ state: 'error', message: result.error })
      return
    }
    setInvite('')
    setInviteStatus({ state: 'success', member })
  }

  const remove = async () => {
    if (removeCandidate === null) return
    setError(null)
    const result = await props.removeSelectedGroupMember(removeCandidate)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setRemoveCandidate(null)
  }

  const leave = async () => {
    setError(null)
    const result = await props.leaveSelectedGroup()
    if (!result.ok) {
      setError(result.error)
      return
    }
    setLeaveOpen(false)
    props.onClose()
  }

  const rejoin = async () => {
    setError(null)
    const result = await props.joinGroup(props.fallback.groupDid)
    if (!result.ok) setError(result.error)
  }

  const group = props.group?.groupDid === props.fallback.groupDid ? props.group : null
  const available = props.access.status === 'available' && group !== null

  return (
    <aside className={css.groupDetails} aria-label="群聊详情">
      <header className={css.groupDetailsHeader}>
        <div><strong>群聊详情</strong><small>成员与权限以服务器最新状态为准</small></div>
        <Tooltip label="关闭群聊详情" side="right">
          <button type="button" aria-label="关闭群聊详情" onClick={props.onClose}><IconCloseOutline16 size={14} /></button>
        </Tooltip>
      </header>
      <section className={css.groupSummary}>
        <strong>{group?.title ?? props.fallback.title}</strong>
        <code title={props.fallback.groupDid}>{props.fallback.groupDid}</code>
        {group?.description !== undefined && group.description !== '' && <p>{group.description}</p>}
        {available && (
          <dl>
            <div><dt>我的角色</dt><dd>{roleLabel(group.myRole)}</dd></div>
            <div><dt>成员</dt><dd>{group.memberCount ?? props.members.length}</dd></div>
          </dl>
        )}
      </section>
      {!available && (
        <AwikiGroupAccessNotice
          access={props.access}
          pending={props.pending}
          compact
          onRetry={() => { void refresh() }}
          onRejoin={() => { void rejoin() }}
        />
      )}
      {available && (
        <>
          {roleRank(group.myRole) >= 2 && (
            <form className={css.groupInvite} onSubmit={(event) => { event.preventDefault(); void add() }}>
              <label htmlFor="awiki-group-invite">邀请成员</label>
              <div>
                <input
                  id="awiki-group-invite"
                  value={invite}
                  disabled={props.pending || inviteStatus.state === 'pending'}
                  placeholder="Handle 或 DID"
                  onChange={(event) => { setInvite(event.target.value); setInviteStatus({ state: 'idle' }) }}
                />
                <button type="submit" aria-label="邀请群成员" data-busy={inviteStatus.state === 'pending' ? '' : undefined} disabled={props.pending || inviteStatus.state === 'pending' || invite.trim() === ''}>
                  {inviteStatus.state === 'pending' ? <IconLoadingOutline16 size={14} /> : <IconPlusOutline16 size={14} />}
                </button>
              </div>
              {inviteStatus.state !== 'idle' && (
                <p className={css.groupInviteStatus} data-state={inviteStatus.state} role={inviteStatus.state === 'error' ? 'alert' : 'status'} aria-live="polite">
                  {inviteStatus.state === 'pending' && `正在邀请 ${inviteStatus.member}…`}
                  {inviteStatus.state === 'success' && `已邀请 ${inviteStatus.member}`}
                  {inviteStatus.state === 'error' && inviteStatus.message}
                </p>
              )}
            </form>
          )}
          <section className={css.groupMemberSection}>
            <div className={css.groupMemberHeading}>
              <strong>群成员</strong>
              <button type="button" aria-label="刷新群成员" disabled={props.pending} onClick={() => { void refresh() }}><IconRefreshOutline16 size={14} /></button>
            </div>
            <div className={css.groupMemberList}>
              {props.members.map((member, index) => {
                const label = memberLabel(member)
                const key = member.membershipId ?? member.did ?? member.handle ?? `${label}-${index}`
                const removable = canRemoveGroupMember(group.myRole, member, props.identity)
                return (
                  <div className={css.groupMemberRow} key={key}>
                    <span className={css.groupMemberAvatar}>{label.slice(0, 1).toLocaleUpperCase()}</span>
                    <span className={css.groupMemberIdentity}>
                      <strong>{label}{memberIsSelf(member, props.identity) && <small>我</small>}</strong>
                      <small>{member.handle ?? member.did ?? '缺少稳定 DID'}</small>
                    </span>
                    <span className={css.groupMemberRole}>{roleLabel(member.role)}</span>
                    {removable && (
                      <Tooltip label={`移除 ${label}`} side="right">
                        <button type="button" className={css.groupMemberRemove} aria-label={`移除群成员 ${label}`} disabled={props.pending} onClick={() => { setRemoveCandidate(member) }}>
                          <IconTrashOutline16 size={14} />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                )
              })}
              {props.members.length === 0 && <p className={css.empty}>暂无可显示的成员。</p>}
            </div>
            {props.hasMore && <button type="button" className={css.more} disabled={props.pending} onClick={() => { void props.loadMoreGroupMembers() }}>加载更多成员</button>}
          </section>
          <footer className={css.groupDetailsFooter}>
            <button type="button" className={css.dangerText} disabled={props.pending || roleRank(group.myRole) === 3} onClick={() => { setLeaveOpen(true) }}>退出群聊</button>
            {roleRank(group.myRole) === 3 && <small>群主不能直接退出群聊</small>}
          </footer>
        </>
      )}
      {error !== null && <div className={css.groupDetailsError} role="alert">{error}</div>}
      <Modal
        open={removeCandidate !== null}
        onClose={() => { if (!props.pending) setRemoveCandidate(null) }}
        title="移除群成员"
        closeLabel="取消"
        className={css.compactModal ?? ''}
        contentClassName={css.compactModalContent ?? ''}
        description={removeCandidate === null ? '' : `确认将 ${memberLabel(removeCandidate)} 移出当前群聊？`}
        footer={<><Button type="button" variant="outline" disabled={props.pending} onClick={() => { setRemoveCandidate(null) }}>取消</Button><Button type="button" variant="outline" className={css.logoutConfirm} disabled={props.pending} onClick={() => { void remove() }}>确认移除</Button></>}
      />
      <Modal
        open={leaveOpen}
        onClose={() => { if (!props.pending) setLeaveOpen(false) }}
        title="退出群聊"
        closeLabel="取消"
        className={css.compactModal ?? ''}
        contentClassName={css.compactModalContent ?? ''}
        description="退出后，该群聊会从当前会话列表中移除。重新加入需要再次获得群聊入口。"
        footer={<><Button type="button" variant="outline" disabled={props.pending} onClick={() => { setLeaveOpen(false) }}>取消</Button><Button type="button" variant="outline" className={css.logoutConfirm} disabled={props.pending} onClick={() => { void leave() }}>确认退出</Button></>}
      />
    </aside>
  )
}
