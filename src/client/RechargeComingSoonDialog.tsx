/** Shared release-gate notice for every AWiki recharge entry point. */

import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { ReactNode } from 'react'
import css from './RechargeComingSoonDialog.module.css'

interface RechargeComingSoonDialogProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly t: PropsLocale<'settings.awiki'>['t']
}

export function RechargeComingSoonDialog({ open, onClose, t }: RechargeComingSoonDialogProps): ReactNode {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('rechargeComingSoonTitle')}
      closeLabel={t('rechargeComingSoonClose')}
      className={css.dialog ?? ''}
      footer={<Button type="button" onClick={onClose}>{t('rechargeComingSoonAcknowledge')}</Button>}
    >
      <p className={css.description}>{t('rechargeComingSoonDescription')}</p>
    </Modal>
  )
}
