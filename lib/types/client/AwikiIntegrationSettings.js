import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Isolated Integration management panel for the full AWiki plugin. */
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './AwikiSettingsSection.module.css';
function emptyFields() {
    return { productName: '', description: '', contactEnabled: true, contactDescription: '', groupTargets: [] };
}
function fieldsFrom(value) {
    return {
        productName: value.productName,
        description: value.description,
        contactEnabled: value.contactEnabled,
        contactDescription: value.contactDescription,
        groupTargets: value.groupTargets.map(target => ({ id: target.id, groupDid: target.groupDid, description: target.description })),
    };
}
/** Render management independently so Gateway errors never disable ordinary AWiki settings. */
export function AwikiIntegrationSettings(props) {
    const [current, setCurrent] = useState(null);
    const [fields, setFields] = useState(emptyFields);
    const [groups, setGroups] = useState([]);
    const [groupsUnavailable, setGroupsUnavailable] = useState(false);
    const [loading, setLoading] = useState(true);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState(null);
    const [saved, setSaved] = useState(false);
    const reload = async () => {
        setLoading(true);
        setError(null);
        setGroupsUnavailable(false);
        try {
            const [integration, ownedGroups] = await Promise.all([props.loadIntegration(), props.listOwnedGroups()]);
            if (!integration.ok)
                setError(integration.error);
            else {
                setCurrent(integration.value);
                setFields(integration.value === null ? emptyFields() : fieldsFrom(integration.value));
            }
            if (ownedGroups.ok)
                setGroups(ownedGroups.value);
            else
                setGroupsUnavailable(true);
        }
        catch {
            setError(props.t('unavailable'));
            setGroupsUnavailable(true);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { void reload(); }, []);
    const availableGroups = useMemo(() => groups.filter(group => (!fields.groupTargets.some(target => target.groupDid === group.groupDid))), [fields.groupTargets, groups]);
    const mutate = async (operation) => {
        setPending(true);
        setError(null);
        setSaved(false);
        try {
            const result = await operation();
            if (result.ok) {
                setCurrent(result.value);
                setFields(fieldsFrom(result.value));
                setSaved(true);
            }
            else
                setError(result.error);
        }
        catch {
            setError(props.t('unavailable'));
        }
        finally {
            setPending(false);
        }
    };
    const addGroup = (groupDid) => {
        const next = { groupDid, description: '' };
        setFields(value => ({ ...value, groupTargets: [...value.groupTargets, next] }));
    };
    if (loading)
        return _jsx("p", { className: css.status, children: props.t('integrationLoading') });
    return (_jsxs("section", { className: css.integrationCard, "aria-labelledby": "awiki-integration-title", children: [_jsxs("div", { className: css.integrationHeader, children: [_jsxs("div", { children: [_jsx("h3", { id: "awiki-integration-title", className: css.dangerTitle, children: props.t('integrationTitle') }), _jsx("p", { className: css.description, children: props.t('integrationDescription') })] }), _jsx(Button, { type: "button", variant: "outline", onClick: props.openIntegrationGuide, children: props.t('integrationGuide') })] }), _jsx("label", { className: css.label, htmlFor: "awiki-integration-name", children: props.t('integrationName') }), _jsx("input", { id: "awiki-integration-name", className: css.input, maxLength: 80, disabled: pending || current?.status === 'closed', value: fields.productName, onChange: event => { setFields(value => ({ ...value, productName: event.target.value })); setSaved(false); } }), _jsx("label", { className: css.label, htmlFor: "awiki-integration-description", children: props.t('integrationIntroduction') }), _jsx("textarea", { id: "awiki-integration-description", className: css.textarea, maxLength: 1000, disabled: pending || current?.status === 'closed', value: fields.description, onChange: event => { setFields(value => ({ ...value, description: event.target.value })); setSaved(false); } }), _jsxs("label", { className: css.checkLabel, children: [_jsx("input", { type: "checkbox", disabled: pending || current?.status === 'closed', checked: fields.contactEnabled, onChange: event => { setFields(value => ({ ...value, contactEnabled: event.target.checked })); setSaved(false); } }), props.t('integrationContactDeveloper')] }), fields.contactEnabled && _jsx("textarea", { className: css.textarea, "aria-label": props.t('integrationContactIntroduction'), maxLength: 500, disabled: pending || current?.status === 'closed', value: fields.contactDescription, onChange: event => { setFields(value => ({ ...value, contactDescription: event.target.value })); setSaved(false); } }), _jsx("div", { className: css.groupHeader, children: _jsx("strong", { children: props.t('integrationGroups') }) }), fields.groupTargets.map((target, index) => {
                const group = groups.find(candidate => candidate.groupDid === target.groupDid);
                const stored = current?.groupTargets.find(candidate => candidate.groupDid === target.groupDid);
                const displayName = group?.title ?? stored?.displayName ?? target.groupDid;
                return _jsxs("div", { className: css.groupRow, children: [_jsxs("div", { className: css.groupSummary, children: [_jsxs("div", { className: css.groupIdentity, children: [_jsx("strong", { className: css.groupName, title: displayName, children: displayName }), _jsx("small", { className: css.groupDid, title: target.groupDid, children: target.groupDid })] }), _jsx(Button, { type: "button", variant: "outline", disabled: pending || current?.status === 'closed', onClick: () => setFields(value => ({ ...value, groupTargets: value.groupTargets.filter((_, itemIndex) => itemIndex !== index) })), children: props.t('integrationRemove') })] }), _jsx("input", { "aria-label": props.t('integrationGroupIntroduction'), placeholder: props.t('integrationGroupIntroduction'), className: css.input, maxLength: 500, disabled: pending || current?.status === 'closed', value: target.description, onChange: event => setFields(value => ({ ...value, groupTargets: value.groupTargets.map((item, itemIndex) => itemIndex === index ? { ...item, description: event.target.value } : item) })) })] }, target.groupDid);
            }), groupsUnavailable
                ? _jsx("p", { className: `${css.status} ${css.error}`, children: props.t('integrationGroupsUnavailable') })
                : availableGroups.length > 0
                    ? _jsxs("select", { className: css.input, disabled: pending || current?.status === 'closed' || fields.groupTargets.length >= 20, value: "", onChange: event => { if (event.target.value !== '')
                            addGroup(event.target.value); }, children: [_jsx("option", { value: "", children: props.t('integrationAddGroup') }), availableGroups.map(group => _jsx("option", { value: group.groupDid, children: group.title }, group.groupDid))] })
                    : _jsx("p", { className: css.status, children: props.t('integrationNoOwnedGroups') }), current?.integrationUrl !== null && current?.integrationUrl !== undefined && _jsxs("div", { className: css.integrationUrl, children: [_jsx("code", { children: current.integrationUrl }), _jsx(Button, { type: "button", variant: "outline", onClick: () => { void navigator.clipboard.writeText(current.integrationUrl ?? ''); }, children: props.t('integrationCopy') })] }), _jsxs("div", { className: css.actions, children: [_jsx(Button, { type: "button", disabled: pending || current?.status === 'closed' || fields.productName.trim() === '' || (!fields.contactEnabled && fields.groupTargets.length === 0), onClick: () => { void mutate(() => props.saveIntegration(fields, current)); }, children: pending ? props.t('saving') : current === null ? props.t('integrationCreate') : props.t('save') }), current?.status === 'active' && _jsx(Button, { type: "button", variant: "outline", disabled: pending, onClick: () => { if (window.confirm(props.t('integrationRotateConfirm')))
                            void mutate(() => props.rotateIntegrationId(current)); }, children: props.t('integrationRotate') }), current?.status === 'active' && _jsx(Button, { type: "button", variant: "outline", disabled: pending, onClick: () => { if (window.confirm(props.t('integrationCloseConfirm')))
                            void mutate(() => props.closeIntegration(current)); }, children: props.t('integrationClose') })] }), saved && _jsx("p", { className: css.status, role: "status", children: props.t('saved') }), error !== null && _jsx("p", { className: `${css.status} ${css.error}`, role: "alert", children: error })] }));
}
//# sourceMappingURL=AwikiIntegrationSettings.js.map