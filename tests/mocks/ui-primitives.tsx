import { useEffect, useState, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from 'react'

interface IconProps {
  size?: number
  className?: string
}

function Icon({ size = 16, className }: IconProps): ReactElement {
  return <svg aria-hidden="true" className={className} height={size} width={size} />
}

export const IconChevronLeftOutline14 = Icon
export const IconChevronDownOutline14 = Icon
export const IconCheckOutline16 = Icon
export const IconChecklistOutline14 = Icon
export const IconCloseOutline16 = Icon
export const IconCopyOutline16 = Icon
export const IconDataOutline16 = Icon
export const IconDownloadOutline16 = Icon
export const IconEditOutline16 = Icon
export const IconGlobeOutline14 = Icon
export const IconGoalOutline16 = Icon
export const IconLoadingOutline16 = Icon
export const IconPaperclipOutline16 = Icon
export const IconPlusOutline16 = Icon
export const IconRefreshOutline16 = Icon
export const IconRefreshOutline14 = Icon
export const IconSendOutline16 = Icon
export const IconSparkle16 = Icon
export const IconUserOutline16 = Icon

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }): ReactElement {
  const { variant: _variant, ...button } = props
  return <button {...button} />
}

export function Modal(props: {
  open: boolean
  onClose: () => void
  title: string
  children?: ReactNode
  footer?: ReactNode
  description?: string
  closeLabel?: string
  className?: string
}): ReactElement | null {
  if (!props.open) return null
  return (
    <div role="dialog" aria-label={props.title}>
      <h2>{props.title}</h2>
      {props.description === undefined ? null : <p>{props.description}</p>}
      {props.children}
      {props.footer}
      <button type="button" aria-label={props.closeLabel ?? 'Close'} onClick={props.onClose}>×</button>
    </div>
  )
}

export function Tooltip(props: { children: ReactNode; label: ReactNode; side?: string }): ReactElement {
  const [visible, setVisible] = useState(false)
  return (
    <span onMouseEnter={() => { setVisible(true) }} onMouseLeave={() => { setVisible(false) }}>
      {props.children}
      {visible && <span role="tooltip">{props.label}</span>}
    </span>
  )
}

export function Menu(props: {
  anchor: ReactNode
  open: boolean
  onClose: () => void
  items: readonly { id: string; label: string }[]
  onSelect: (id: string) => void
  align?: string
  portal?: boolean
  compact?: boolean
}): ReactElement {
  useEffect(() => {
    if (!props.open) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') props.onClose() }
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('keydown', close) }
  }, [props.open, props.onClose])
  return (
    <>
      {props.anchor}
      {props.open && (
        <div role="menu">
          {props.items.map(item => (
            <button key={item.id} type="button" role="menuitem" onClick={() => { props.onSelect(item.id) }}>{item.label}</button>
          ))}
        </div>
      )}
    </>
  )
}
