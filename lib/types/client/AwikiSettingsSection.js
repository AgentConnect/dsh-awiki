import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** AWiki settings page contributed to the DSH settings navigation. */
import { useEffect, useState } from 'react';
import { Button } from '@deepseek-ai/dsh-client-ui-primitives';
import { AWIKI_DOMAIN_FIELD, DEFAULT_AWIKI_DOMAIN, normalizeAwikiDomain, } from "../domain.js";
import css from './AwikiSettingsSection.module.css';
function hasDomainOverride(snapshot) {
    return typeof snapshot.user === 'object'
        && snapshot.user !== null
        && !Array.isArray(snapshot.user)
        && Object.hasOwn(snapshot.user, AWIKI_DOMAIN_FIELD);
}
/** Render a durable default-domain editor in the native DSH settings shell. */
export function AwikiSettingsSection(props) {
    const { t, useAwikiSettings } = props;
    const settings = useAwikiSettings(value => value);
    const current = settings.value?.domain ?? DEFAULT_AWIKI_DOMAIN;
    const overridden = hasDomainOverride(settings);
    const [draft, setDraft] = useState(current);
    const [edited, setEdited] = useState(false);
    const [pending, setPending] = useState(false);
    const [status, setStatus] = useState(null);
    useEffect(() => {
        if (edited)
            return;
        setDraft(current);
    }, [current, edited]);
    if (settings.status === 'loading') {
        return _jsx("p", { className: css.status, children: t('loading') });
    }
    const unavailable = settings.status !== 'ready' || settings.mode !== 'host';
    const disabled = unavailable || !settings.writable || pending;
    const save = async (event) => {
        event?.preventDefault();
        let normalized;
        try {
            normalized = normalizeAwikiDomain(draft);
        }
        catch {
            setStatus({ kind: 'error', text: t('invalidDomain') });
            return;
        }
        setPending(true);
        setStatus(null);
        try {
            await props.saveDomain(normalized);
            setDraft(normalized);
            setEdited(false);
            setStatus({ kind: 'saved', text: `${t('saved')} ${t('restartNotice')}` });
        }
        catch {
            setStatus({ kind: 'error', text: t('saveFailed') });
        }
        finally {
            setPending(false);
        }
    };
    const reset = async () => {
        setPending(true);
        setStatus(null);
        try {
            await props.resetDomain();
            setEdited(false);
            setStatus({ kind: 'saved', text: `${t('saved')} ${t('restartNotice')}` });
        }
        catch {
            setStatus({ kind: 'error', text: t('saveFailed') });
        }
        finally {
            setPending(false);
        }
    };
    return (_jsxs("section", { className: css.section, children: [_jsxs("div", { className: css.heading, children: [_jsx("h2", { className: css.title, children: t('nav') }), _jsx("p", { className: css.intro, children: t('intro') })] }), _jsxs("form", { className: css.card, onSubmit: (event) => { void save(event); }, children: [_jsx("label", { className: css.label, htmlFor: "awiki-default-domain", children: t('domainLabel') }), _jsx("p", { className: css.description, children: t('domainDescription') }), _jsx("input", { id: "awiki-default-domain", className: css.input, value: draft, disabled: disabled, spellCheck: false, autoCapitalize: "none", autoCorrect: "off", inputMode: "url", placeholder: DEFAULT_AWIKI_DOMAIN, onChange: (event) => {
                            setDraft(event.target.value);
                            setEdited(true);
                            setStatus(null);
                        } }), _jsx("p", { className: css.defaultValue, children: t('defaultValue', { domain: DEFAULT_AWIKI_DOMAIN }) }), _jsxs("div", { className: css.actions, children: [_jsx(Button, { type: "submit", disabled: disabled || !edited || draft.trim() === '', children: pending ? t('saving') : t('save') }), _jsx(Button, { type: "button", variant: "outline", disabled: disabled || !overridden, onClick: () => { void reset(); }, children: t('reset') })] }), unavailable
                        ? _jsx("p", { className: `${css.status} ${css.error}`, role: "alert", children: t('unavailable') })
                        : !settings.writable
                            ? _jsx("p", { className: `${css.status} ${css.error}`, role: "alert", children: t('readOnly') })
                            : _jsx("p", { className: `${css.status} ${status?.kind === 'error' ? css.error : ''}`, role: "status", children: status?.text ?? '' })] }), _jsx("p", { className: css.notice, children: t('identityNotice') })] }));
}
export { hasDomainOverride };
//# sourceMappingURL=AwikiSettingsSection.js.map