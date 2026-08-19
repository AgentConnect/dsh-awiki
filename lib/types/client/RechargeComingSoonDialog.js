import { jsx as _jsx } from "react/jsx-runtime";
/** Shared release-gate notice for every AWiki recharge entry point. */
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './RechargeComingSoonDialog.module.css';
export function RechargeComingSoonDialog({ open, onClose, t }) {
    return (_jsx(Modal, { open: open, onClose: onClose, title: t('rechargeComingSoonTitle'), closeLabel: t('rechargeComingSoonClose'), className: css.dialog ?? '', footer: _jsx(Button, { type: "button", onClick: onClose, children: t('rechargeComingSoonAcknowledge') }), children: _jsx("p", { className: css.description, children: t('rechargeComingSoonDescription') }) }));
}
//# sourceMappingURL=RechargeComingSoonDialog.js.map