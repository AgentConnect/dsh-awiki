import type { AwikiMention } from '@awiki/dsh-plugin/types'
import { mentionSegments } from './mentions.ts'
import css from './AwikiOverlay.module.css'

/** Render protocol-validated mention ranges without interpreting raw @text. */
export function MentionText(props: { readonly text: string; readonly mentions?: readonly AwikiMention[] }) {
  return <>{mentionSegments(props.text, props.mentions).map((segment, index) => segment.mention
    ? <mark className={css.mention} key={segment.id ?? index}>{segment.text}</mark>
    : <span key={index}>{segment.text}</span>)}</>
}
