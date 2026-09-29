import { useEffect } from 'react'

/** An avatar modal owns Escape before the containing AWiki drawer sees it. */
export function useAvatarDialogEscape(open: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!open) return
    const close = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopImmediatePropagation()
      onClose()
    }
    document.addEventListener('keydown', close, true)
    return () => { document.removeEventListener('keydown', close, true) }
  }, [open, onClose])
}
