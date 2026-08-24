/** Notice that Contact developer needs the AWiki messaging plugin. */

import { useState, type ReactNode } from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { AWIKI_PLUGIN_INSTALL_COMMAND } from './contact-developer.ts'
import css from './InstallAwikiPluginDialog.module.css'

interface InstallAwikiPluginDialogProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly t: PropsLocale<'settings.awiki-model-proxy'>['t']
}

/** Explain how to install `@awiki/dsh-plugin` before opening the maintainer chat. */
export function InstallAwikiPluginDialog({ open, onClose, t }: InstallAwikiPluginDialogProps): ReactNode {
  const [copied, setCopied] = useState(false)

  const copyCommand = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(AWIKI_PLUGIN_INSTALL_COMMAND)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const close = (): void => {
    setCopied(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={t('contactPluginMissingTitle')}
      closeLabel={t('contactPluginMissingClose')}
      className={css.dialog ?? ''}
      footer={<>
        <Button type="button" variant="outline" onClick={() => { void copyCommand() }}>
          {copied ? t('contactPluginCopied') : t('contactPluginCopyCommand')}
        </Button>
        <Button type="button" onClick={close}>{t('contactPluginMissingAcknowledge')}</Button>
      </>}
    >
      <p className={css.description}>{t('contactPluginMissingDescription')}</p>
      <pre className={css.command}><code>{AWIKI_PLUGIN_INSTALL_COMMAND}</code></pre>
    </Modal>
  )
}
