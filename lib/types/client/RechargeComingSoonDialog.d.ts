/** Shared release-gate notice for every AWiki recharge entry point. */
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots';
import type { ReactNode } from 'react';
interface RechargeComingSoonDialogProps {
    readonly open: boolean;
    readonly onClose: () => void;
    readonly t: PropsLocale<'settings.awiki'>['t'];
}
export declare function RechargeComingSoonDialog({ open, onClose, t }: RechargeComingSoonDialogProps): ReactNode;
export {};
//# sourceMappingURL=RechargeComingSoonDialog.d.ts.map