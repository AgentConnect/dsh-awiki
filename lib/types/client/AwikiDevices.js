import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** Foreground-only ready-admin device management. SAS remains component-local. */
import { useEffect, useId, useState } from 'react';
import { Button, IconRefreshOutline16 } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './AwikiDevices.module.css';
const requestStateLabels = {
    pending: '待验证',
    verifying: '验证中',
    'sas-ready': '待核对',
    authorized: '已授权',
    cancelled: '已取消',
    rejected: '已拒绝',
    expired: '已过期',
};
export const TERMINAL_DEVICE_JOIN_STATES = new Set([
    'authorized',
    'cancelled',
    'rejected',
    'expired',
]);
function readableDate(value) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
        ? value
        : parsed.toLocaleString('zh-CN', { dateStyle: 'medium', timeStyle: 'short', hour12: false });
}
function DeviceGlyph() {
    return _jsxs("svg", { "aria-hidden": "true", viewBox: "0 0 24 24", children: [_jsx("rect", { x: "6", y: "3.5", width: "12", height: "17", rx: "2.5" }), _jsx("path", { d: "M10 17.5h4" })] });
}
export function AwikiDevices(props) {
    const sasHelpId = useId();
    const sasInputId = useId();
    const approvalHelpId = useId();
    const approvalInputId = useId();
    const revokeHelpId = useId();
    const revokeInputId = useId();
    const [snapshot, setSnapshot] = useState(null);
    const [progress, setProgress] = useState(null);
    const [enteredSas, setEnteredSas] = useState('');
    const [approval, setApproval] = useState('');
    const [revokeRef, setRevokeRef] = useState(null);
    const [revokeConfirmation, setRevokeConfirmation] = useState('');
    const [rootPreparation, setRootPreparation] = useState(null);
    const [rootReceipt, setRootReceipt] = useState(null);
    const [error, setError] = useState(null);
    const pendingRequests = snapshot?.requests.filter(request => !TERMINAL_DEVICE_JOIN_STATES.has(request.state)) ?? [];
    const joinedDevices = snapshot?.devices.filter(device => device.status === 'active') ?? [];
    const refresh = async (advanceJoin = true) => {
        const result = await props.refreshDeviceManagement();
        if (!result.ok)
            return setError(result.error);
        setSnapshot(result.value);
        if (advanceJoin && progress !== null && !['authorized', 'cancelled', 'rejected', 'expired'].includes(progress.phase)) {
            const advanced = await props.startDeviceJoinVerification({ requestRef: progress.requestRef });
            if (advanced.ok)
                setProgress(advanced.value);
        }
        setError(null);
    };
    useEffect(() => {
        if (!props.active)
            return;
        let alive = true;
        void props.refreshDeviceManagement().then((result) => {
            if (!alive)
                return;
            if (result.ok)
                setSnapshot(result.value);
            else
                setError(result.error);
        });
        const timer = setInterval(() => { if (alive)
            void refresh(); }, 3_000);
        return () => { alive = false; clearInterval(timer); };
    }, [props.active, progress?.phase, progress?.requestRef]);
    const start = async (requestRef) => {
        const result = await props.startDeviceJoinVerification({ requestRef });
        if (!result.ok)
            return setError(result.error);
        setProgress(result.value);
        setError(null);
    };
    const approve = async () => {
        if (progress === null)
            return;
        const result = await props.approveDeviceJoin({
            requestRef: progress.requestRef,
            enteredSas,
            confirmation: approval,
        });
        if (!result.ok)
            return setError(result.error);
        setProgress(null);
        setEnteredSas('');
        setApproval('');
        await refresh(false);
    };
    const reject = async (requestRef) => {
        const result = await props.rejectDeviceJoin({ requestRef, reason: 'user_rejected' });
        if (!result.ok)
            return setError(result.error);
        setProgress(null);
        await refresh(false);
    };
    const revoke = async () => {
        if (revokeRef === null)
            return;
        const result = await props.revokeDevice({ deviceRef: revokeRef, confirmation: revokeConfirmation });
        if (!result.ok)
            return setError(result.error);
        setSnapshot(result.value);
        setRevokeRef(null);
        setRevokeConfirmation('');
        setError(null);
    };
    const prepareRootTransfer = async (deviceRef) => {
        const result = await props.prepareRootTransfer({ deviceRef });
        if (!result.ok)
            return setError(result.error);
        setRootPreparation(result.value);
        setRootReceipt(null);
        setError(null);
    };
    const confirmRootTransfer = async () => {
        if (rootPreparation === null)
            return;
        const result = await props.confirmRootTransfer({ transferRef: rootPreparation.transferRef });
        if (!result.ok) {
            setRootPreparation(null);
            return setError(result.error);
        }
        setRootPreparation(null);
        setRootReceipt(result.value);
        setError(null);
        await refresh();
    };
    return (_jsxs("section", { className: css.page, "aria-label": "AWiki \u8BBE\u5907\u7BA1\u7406", children: [_jsxs("header", { className: css.heading, children: [_jsxs("div", { children: [_jsx("h3", { children: "\u8BBE\u5907" }), _jsx("p", { children: "\u53EA\u6709\u5F53\u524D\u7BA1\u7406\u8BBE\u5907\u53EF\u4EE5\u6279\u51C6\u52A0\u5165\u6216\u7BA1\u7406\u5176\u4ED6\u8BBE\u5907\u3002" })] }), _jsx(Button, { className: css.button, type: "button", variant: "outline", icon: _jsx(IconRefreshOutline16, {}), disabled: props.pending, onClick: () => { void refresh(); }, children: "\u5237\u65B0" })] }), snapshot === null && _jsxs("div", { className: css.loading, role: "status", children: [_jsx("span", { "aria-hidden": "true" }), "\u6B63\u5728\u8BFB\u53D6\u8BBE\u5907\u72B6\u6001\u2026"] }), snapshot !== null && !snapshot.canManage && _jsx("div", { className: css.notice, children: "\u5F53\u524D\u8BBE\u5907\u4E0D\u662F\u53EF\u7528\u7684\u7BA1\u7406\u8BBE\u5907\uFF0C\u4E0D\u80FD\u6279\u51C6\u6216\u64A4\u9500\u5176\u4ED6\u8BBE\u5907\u3002" }), snapshot?.canManage && (_jsxs(_Fragment, { children: [_jsxs("section", { className: css.section, "aria-labelledby": "awiki-pending-devices", children: [_jsxs("div", { className: css.sectionHeading, children: [_jsx("h4", { id: "awiki-pending-devices", children: "\u5F85\u52A0\u5165" }), _jsx("span", { className: css.count, children: pendingRequests.length })] }), pendingRequests.length === 0 && _jsx("div", { className: css.empty, children: "\u6682\u65F6\u6CA1\u6709\u5F85\u5904\u7406\u7684\u8BBE\u5907\u8BF7\u6C42\u3002" }), pendingRequests.map(request => _jsxs("article", { className: css.card, children: [_jsxs("div", { className: css.cardHeader, children: [_jsxs("div", { className: css.cardIdentity, children: [_jsx("span", { className: css.deviceIcon, children: _jsx(DeviceGlyph, {}) }), _jsxs("div", { children: [_jsx("strong", { children: "\u65B0\u8BBE\u5907\u8BF7\u6C42" }), _jsx("code", { title: request.candidateKeyFingerprint, children: request.candidateKeyFingerprint })] })] }), _jsx("span", { className: css.badge, "data-tone": request.state, children: requestStateLabels[request.state] ?? request.state })] }), _jsxs("p", { className: css.metadata, children: ["\u6709\u6548\u671F\u81F3 ", readableDate(request.expiresAt)] }), _jsxs("div", { className: css.actions, children: [_jsx(Button, { className: css.button, type: "button", variant: "primary", disabled: props.pending || (!request.canStartVerification && !request.claimedByCurrentDevice), onClick: () => { void start(request.requestRef); }, children: "\u5F00\u59CB\u9A8C\u8BC1" }), _jsx(Button, { className: `${css.button} ${css.dangerButton}`, type: "button", variant: "outline", disabled: props.pending, onClick: () => { void reject(request.requestRef); }, children: "\u62D2\u7EDD" })] })] }, request.requestRef))] }), progress?.phase === 'sas-ready' && _jsxs("section", { className: `${css.card} ${css.verificationCard}`, "aria-labelledby": "awiki-device-sas-title", children: [_jsxs("div", { className: css.verificationHeading, children: [_jsx("span", { children: "\u7B2C 2 \u6B65" }), _jsx("h4", { id: "awiki-device-sas-title", children: "\u6838\u5BF9\u5B89\u5168\u7801" })] }), _jsx("strong", { className: css.sas, "aria-label": `安全码 ${progress.sas ?? ''}`, children: progress.sas }), _jsx("p", { className: css.verificationIntro, children: "\u786E\u8BA4\u624B\u673A\u663E\u793A\u76F8\u540C\u53F7\u7801\u540E\uFF0C\u518D\u5B8C\u6210\u4E0B\u9762\u4E24\u9879\u786E\u8BA4\u3002" }), _jsxs("div", { className: css.fields, children: [_jsxs("div", { className: css.field, children: [_jsx("label", { htmlFor: sasInputId, children: "\u624B\u673A\u5B89\u5168\u7801" }), _jsx("input", { id: sasInputId, className: `${css.input} ${css.numericInput}`, "aria-describedby": sasHelpId, value: enteredSas, inputMode: "numeric", autoComplete: "one-time-code", maxLength: 6, placeholder: "\u8BF7\u8F93\u5165 6 \u4F4D\u6570\u5B57", onChange: event => { setEnteredSas(event.target.value.replace(/\D/gu, '').slice(0, 6)); } }), _jsx("small", { id: sasHelpId, children: "\u586B\u5199\u624B\u673A\u4E0A\u663E\u793A\u7684 6 \u4F4D\u6570\u5B57\u3002" })] }), _jsxs("div", { className: css.field, children: [_jsx("label", { htmlFor: approvalInputId, children: "\u6279\u51C6\u786E\u8BA4\u8BCD" }), _jsx("input", { id: approvalInputId, className: css.input, "aria-describedby": approvalHelpId, value: approval, autoComplete: "off", spellCheck: false, onChange: event => { setApproval(event.target.value); }, placeholder: "\u8F93\u5165 APPROVE" }), _jsx("small", { id: approvalHelpId, children: "\u8F93\u5165 APPROVE\uFF0C\u786E\u8BA4\u4F60\u540C\u610F\u52A0\u5165\u6B64\u8BBE\u5907\u3002" })] })] }), _jsx(Button, { className: `${css.button} ${css.fullButton}`, type: "button", variant: "primary", disabled: props.pending || enteredSas.length !== 6 || approval !== 'APPROVE', onClick: () => { void approve(); }, children: "\u6279\u51C6\u4E3A member" })] }), rootPreparation !== null && _jsxs("section", { className: `${css.card} ${css.verificationCard}`, children: [_jsx("h4", { children: "\u6388\u4E88\u8BBE\u5907\u7BA1\u7406\u6743" }), _jsxs("p", { className: css.metadata, children: ["\u7CFB\u7EDF\u5C06\u9A8C\u8BC1\u672C\u673A\u7528\u6237\u8EAB\u4EFD\uFF0C\u518D\u5411\u76EE\u6807 member \u53D1\u9001\u7BA1\u7406\u80FD\u529B\u3002\u6709\u6548\u671F\u81F3 ", readableDate(rootPreparation.expiresAt), "\u3002"] }), _jsx(Button, { className: css.button, type: "button", variant: "primary", disabled: props.pending, onClick: () => { void confirmRootTransfer(); }, children: "\u4F7F\u7528\u7CFB\u7EDF\u8BA4\u8BC1\u5E76\u53D1\u9001" })] }), rootReceipt !== null && _jsxs("div", { className: css.successNotice, role: "status", children: ["\u7BA1\u7406\u80FD\u529B\u5DF2\u53D1\u9001\uFF1B\u76EE\u6807\u8BBE\u5907\u5B8C\u6210\u63A5\u6536\u540E\u4F1A\u663E\u793A\u4E3A admin\u3002\u63A5\u53D7\u65F6\u95F4\uFF1A", readableDate(rootReceipt.acceptedAt)] }), !snapshot.rootTransferSupported && _jsxs("div", { className: css.notice, children: [_jsx("strong", { children: "\u7BA1\u7406\u6743\u8F6C\u79FB\u6682\u4E0D\u53EF\u7528" }), _jsx("span", { children: "\u8BE5\u529F\u80FD\u76EE\u524D\u53EA\u80FD\u5728\u914D\u5907 Intel \u82AF\u7247\u7684 Mac \u4E0A\u901A\u8FC7\u7CFB\u7EDF\u8EAB\u4EFD\u9A8C\u8BC1\u4F7F\u7528\u3002" })] }), _jsxs("section", { className: css.section, "aria-labelledby": "awiki-joined-devices", children: [_jsxs("div", { className: css.sectionHeading, children: [_jsx("h4", { id: "awiki-joined-devices", children: "\u5DF2\u52A0\u5165\u8BBE\u5907" }), _jsx("span", { className: css.count, children: joinedDevices.length })] }), joinedDevices.length === 0 && _jsx("div", { className: css.empty, children: "\u6682\u65E0\u5DF2\u52A0\u5165\u8BBE\u5907\u3002" }), _jsx("div", { className: css.deviceList, children: joinedDevices.map(device => _jsxs("article", { className: css.deviceCard, children: [_jsxs("div", { className: css.deviceSummary, children: [_jsx("span", { className: css.deviceIcon, children: _jsx(DeviceGlyph, {}) }), _jsxs("div", { children: [_jsx("strong", { children: device.isCurrent ? '当前设备' : '其他设备' }), _jsx("span", { children: device.role === 'admin' ? '管理设备' : '成员设备' }), _jsxs("code", { className: css.deviceIdentifier, title: "\u7528\u4E8E\u533A\u5206\u8BBE\u5907\uFF0C\u4E0D\u5305\u542B\u5B8C\u6574\u8BBE\u5907 ID", children: ["\u6807\u8BC6 ", device.displayId] }), _jsxs("span", { className: css.deviceJoinedAt, children: ["\u52A0\u5165\u65F6\u95F4\uFF1A", device.joinedAt === undefined ? '暂无记录' : readableDate(device.joinedAt)] })] }), _jsxs("div", { className: css.deviceActions, children: [device.managementReady && _jsx("span", { className: css.badge, "data-tone": "admin", children: "\u7BA1\u7406\u5C31\u7EEA" }), !device.isCurrent && revokeRef !== device.deviceRef && _jsx(Button, { className: `${css.button} ${css.dangerButton} ${css.compactDangerButton}`, type: "button", variant: "ghost", disabled: props.pending, onClick: () => { setRevokeRef(device.deviceRef); setRevokeConfirmation(''); }, children: "\u64A4\u9500" })] })] }), snapshot.rootTransferSupported && !device.isCurrent && device.status === 'active' && device.role === 'member' && !device.managementReady
                                            && _jsx(Button, { className: css.button, type: "button", variant: "outline", disabled: props.pending, onClick: () => { void prepareRootTransfer(device.deviceRef); }, children: "\u6388\u4E88\u7BA1\u7406\u6743" }), !device.isCurrent && revokeRef === device.deviceRef
                                            && _jsxs("div", { className: css.revokePanel, children: [_jsxs("div", { className: css.field, children: [_jsx("label", { htmlFor: revokeInputId, children: "\u64A4\u9500\u786E\u8BA4\u8BCD" }), _jsx("input", { id: revokeInputId, className: css.input, "aria-describedby": revokeHelpId, value: revokeConfirmation, autoComplete: "off", spellCheck: false, onChange: event => { setRevokeConfirmation(event.target.value); }, placeholder: "\u8F93\u5165 REVOKE" }), _jsx("small", { id: revokeHelpId, children: "\u64A4\u9500\u540E\uFF0C\u8FD9\u53F0\u8BBE\u5907\u5C06\u65E0\u6CD5\u7EE7\u7EED\u8BBF\u95EE\u5F53\u524D\u8EAB\u4EFD\u3002" })] }), _jsxs("div", { className: css.actions, children: [_jsx(Button, { className: `${css.button} ${css.dangerButton}`, type: "button", variant: "outline", disabled: props.pending || revokeConfirmation !== 'REVOKE', onClick: () => { void revoke(); }, children: "\u786E\u8BA4\u64A4\u9500" }), _jsx(Button, { className: css.button, type: "button", variant: "ghost", disabled: props.pending, onClick: () => { setRevokeRef(null); setRevokeConfirmation(''); }, children: "\u53D6\u6D88" })] })] })] }, device.deviceRef)) })] })] })), error !== null && _jsxs("div", { className: css.error, role: "alert", children: [_jsx("strong", { children: "\u64CD\u4F5C\u672A\u5B8C\u6210" }), _jsx("span", { children: error })] })] }));
}
//# sourceMappingURL=AwikiDevices.js.map