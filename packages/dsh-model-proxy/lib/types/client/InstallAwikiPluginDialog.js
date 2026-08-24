import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/** Notice that Contact developer needs the AWiki messaging plugin. */
import { useState } from 'react';
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { AWIKI_PLUGIN_INSTALL_COMMAND } from "./contact-developer.js";
import css from './InstallAwikiPluginDialog.module.css';
/** Explain how to install `@awiki/dsh-plugin` before opening the maintainer chat. */
export function InstallAwikiPluginDialog({ open, onClose, t }) {
    const [copied, setCopied] = useState(false);
    const copyCommand = async () => {
        try {
            await navigator.clipboard.writeText(AWIKI_PLUGIN_INSTALL_COMMAND);
            setCopied(true);
        }
        catch {
            setCopied(false);
        }
    };
    const close = () => {
        setCopied(false);
        onClose();
    };
    return (_jsxs(Modal, { open: open, onClose: close, title: t('contactPluginMissingTitle'), closeLabel: t('contactPluginMissingClose'), className: css.dialog ?? '', footer: _jsxs(_Fragment, { children: [_jsx(Button, { type: "button", variant: "outline", onClick: () => { void copyCommand(); }, children: copied ? t('contactPluginCopied') : t('contactPluginCopyCommand') }), _jsx(Button, { type: "button", onClick: close, children: t('contactPluginMissingAcknowledge') })] }), children: [_jsx("p", { className: css.description, children: t('contactPluginMissingDescription') }), _jsx("pre", { className: css.command, children: _jsx("code", { children: AWIKI_PLUGIN_INSTALL_COMMAND }) })] }));
}
//# sourceMappingURL=InstallAwikiPluginDialog.js.map