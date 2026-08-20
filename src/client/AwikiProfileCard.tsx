import { useEffect, useState } from 'react'
import {
  IconCloseOutline16,
  IconEditOutline16,
  IconPlusOutline16,
  IconUserOutline16,
  Modal,
  Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { AwikiIdentity, AwikiProfile } from '@awiki/dsh-plugin/types'
import type { AwikiOverlayProps } from './slots.ts'
import css from './AwikiOverlay.module.css'

const MAX_DISPLAY_NAME = 50
const MAX_BIO = 100
const MAX_TAGS = 5
const MAX_TAG_LENGTH = 30

function length(value: string): number {
  return Array.from(value).length
}

function initialProfile(identity: AwikiIdentity, profile: AwikiProfile | null) {
  return {
    displayName: profile?.displayName ?? identity.displayName ?? '',
    bio: profile?.bio ?? '',
    tags: [...(profile?.tags ?? [])],
  }
}

/** Compact public profile with an explicit, bounded editor for all supported fields. */
export function AwikiProfileCard(props: Pick<AwikiOverlayProps, 'updateProfile'> & {
  readonly identity: AwikiIdentity
  readonly profile: AwikiProfile | null
  readonly pending: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    const next = initialProfile(props.identity, props.profile)
    setDisplayName(next.displayName)
    setBio(next.bio)
    setTags(next.tags)
    setTagInput('')
    setError(null)
  }

  useEffect(() => {
    if (!editing) reset()
  }, [editing, props.identity.did, props.identity.displayName, props.profile])

  const close = () => {
    reset()
    setEditing(false)
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag === '') return
    if (length(tag) > MAX_TAG_LENGTH) {
      setError(`每个标签不能超过 ${MAX_TAG_LENGTH} 个字符`)
      return
    }
    if (tags.some(current => current.toLocaleLowerCase() === tag.toLocaleLowerCase())) {
      setError('标签不能重复')
      return
    }
    if (tags.length >= MAX_TAGS) {
      setError(`最多添加 ${MAX_TAGS} 个标签`)
      return
    }
    setTags(current => [...current, tag])
    setTagInput('')
    setError(null)
  }

  const save = async () => {
    const normalizedName = displayName.trim()
    const normalizedBio = bio.trim()
    if (normalizedName === '' || length(normalizedName) > MAX_DISPLAY_NAME) {
      setError(`昵称需要填写且不能超过 ${MAX_DISPLAY_NAME} 个字符`)
      return
    }
    if (length(normalizedBio) > MAX_BIO) {
      setError(`个人简介不能超过 ${MAX_BIO} 个字符`)
      return
    }
    setError(null)
    const result = await props.updateProfile({ displayName: normalizedName, bio: normalizedBio, tags })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setEditing(false)
  }

  return (
    <>
      <section className={css.identityCard} aria-label="AWiki 个人资料">
        <div className={css.identityNameRow}>
          <span className={css.profileAvatar}><IconUserOutline16 size={14} /></span>
          <Tooltip label={props.identity.did} side="bottom">
            <strong className={css.identityNameText}>{props.profile?.displayName ?? props.identity.displayName ?? '未设置昵称'}</strong>
          </Tooltip>
          <Tooltip label="编辑个人资料" side="right">
            <button
              type="button"
              className={css.identityEdit}
              aria-label="编辑个人资料"
              disabled={props.pending}
              onClick={() => { reset(); setEditing(true) }}
            >
              <IconEditOutline16 size={14} />
            </button>
          </Tooltip>
        </div>
        <small className={css.identityHandle}>{props.identity.handle}</small>
        {props.profile?.bio !== undefined && props.profile.bio !== '' && <p className={css.profileBio}>{props.profile.bio}</p>}
        {props.profile !== null && props.profile.tags.length > 0 && (
          <div className={css.profileTags} aria-label="个人标签">
            {props.profile.tags.map(tag => <span key={tag}>{tag}</span>)}
          </div>
        )}
        <span className={css.identityStatus}><i />在线</span>
      </section>
      <Modal
        open={editing}
        onClose={() => { if (!props.pending) close() }}
        title="编辑个人资料"
        closeLabel="取消编辑个人资料"
        className={css.compactModal ?? ''}
        contentClassName={css.compactModalContent ?? ''}
      >
        <form className={css.profileEditor} onSubmit={(event) => { event.preventDefault(); void save() }}>
          <small className={css.identityHandle}>{props.identity.handle}</small>
          <label>
            昵称
            <input
              aria-label="昵称"
              autoFocus
              disabled={props.pending}
              value={displayName}
              maxLength={MAX_DISPLAY_NAME * 2}
              onChange={(event) => { setDisplayName(event.target.value); setError(null) }}
            />
            <small>{length(displayName)}/{MAX_DISPLAY_NAME}</small>
          </label>
          <label>
            个人简介
            <textarea
              aria-label="个人简介"
              disabled={props.pending}
              rows={3}
              value={bio}
              onChange={(event) => { setBio(event.target.value); setError(null) }}
            />
            <small>{length(bio)}/{MAX_BIO}</small>
          </label>
          <div className={css.profileTagEditor}>
            <label htmlFor="awiki-profile-tag">标签 <small>{tags.length}/{MAX_TAGS}</small></label>
            <div>
              <input
                id="awiki-profile-tag"
                aria-label="新标签"
                disabled={props.pending || tags.length >= MAX_TAGS}
                value={tagInput}
                onChange={(event) => { setTagInput(event.target.value); setError(null) }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
                  event.preventDefault()
                  addTag()
                }}
              />
              <button type="button" aria-label="添加标签" disabled={props.pending || tagInput.trim() === '' || tags.length >= MAX_TAGS} onClick={addTag}>
                <IconPlusOutline16 size={14} />
              </button>
            </div>
            {tags.length > 0 && (
              <div className={css.profileTags}>
                {tags.map(tag => (
                  <span key={tag}>{tag}<button type="button" aria-label={`移除标签 ${tag}`} disabled={props.pending} onClick={() => { setTags(current => current.filter(value => value !== tag)) }}><IconCloseOutline16 size={10} /></button></span>
                ))}
              </div>
            )}
          </div>
          {error !== null && <small className={css.identityError} role="alert">{error}</small>}
          <div className={css.profileEditorActions}>
            <button type="button" className={css.secondary} disabled={props.pending} onClick={close}>取消</button>
            <button type="submit" className={css.primary} disabled={props.pending}>保存资料</button>
          </div>
        </form>
      </Modal>
    </>
  )
}
