import type { ReactNode } from 'react'
import { IconChevronLeftOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './AwikiIdentityPage.module.css'

export interface AwikiIdentityPageProps {
  readonly children: ReactNode
  readonly onBack?: () => void
  readonly backLabel?: string
  readonly backDisabled?: boolean
  readonly live?: 'off' | 'polite' | 'assertive'
}

/** Shared navigation and overflow boundary for every identity access step. */
export function AwikiIdentityPage(props: AwikiIdentityPageProps) {
  return (
    <section className={css.page} aria-live={props.live}>
      {props.onBack !== undefined && (
        <nav className={css.navigation} aria-label="身份流程导航">
          <button type="button" className={css.backButton} disabled={props.backDisabled} onClick={props.onBack}>
            <IconChevronLeftOutline14 size={14} />
            <span>{props.backLabel ?? '返回'}</span>
          </button>
        </nav>
      )}
      <div className={css.viewport}>
        <div className={css.content}>{props.children}</div>
      </div>
    </section>
  )
}
