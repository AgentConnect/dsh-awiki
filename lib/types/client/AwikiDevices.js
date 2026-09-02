import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/** Foreground-only ready-admin device management. SAS remains component-local. */
import { useEffect, useState } from 'react';
import css from './AwikiDevices.module.css';
export function AwikiDevices(props) {
    const [snapshot, setSnapshot] = useState(null);
    const [progress, setProgress] = useState(null);
    const [enteredSas, setEnteredSas] = useState('');
    const [approval, setApproval] = useState('');
    const [revokeRef, setRevokeRef] = useState(null);
    const [revokeConfirmation, setRevokeConfirmation] = useState('');
    const [rootPreparation, setRootPreparation] = useState(null);
    const [rootReceipt, setRootReceipt] = useState(null);
    const [error, setError] = useState(null);
    const refresh = async () => {
        const result = await props.refreshDeviceManagement();
        if (!result.ok)
            return setError(result.error);
        setSnapshot(result.value);
        if (progress !== null && !['authorized', 'cancelled', 'rejected', 'expired'].includes(progress.phase)) {
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
        await refresh();
    };
    const reject = async (requestRef) => {
        const result = await props.rejectDeviceJoin({ requestRef, reason: 'user_rejected' });
        if (!result.ok)
            return setError(result.error);
        setProgress(null);
        await refresh();
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
    return (_jsxs("section", { className: css.page, "aria-label": "AWiki \u8BBE\u5907\u7BA1\u7406", children: [props.modeTabs, _jsxs("header", { className: css.heading, children: [_jsxs("div", { children: [_jsx("h3", { children: "\u8BBE\u5907" }), _jsx("p", { children: "\u53EA\u6709\u5F53\u524D ready-admin \u53EF\u4EE5\u6279\u51C6\u6216\u64A4\u9500\u8BBE\u5907\u3002" })] }), _jsx("button", { type: "button", disabled: props.pending, onClick: () => { void refresh(); }, children: "\u5237\u65B0" })] }), snapshot === null && _jsx("p", { role: "status", children: "\u6B63\u5728\u8BFB\u53D6\u8BBE\u5907\u72B6\u6001\u2026" }), snapshot !== null && !snapshot.canManage && _jsx("p", { children: "\u5F53\u524D\u8BBE\u5907\u4E0D\u662F\u53EF\u7528\u7684\u7BA1\u7406\u8BBE\u5907\uFF0C\u4E0D\u80FD\u6279\u51C6\u6216\u64A4\u9500\u5176\u4ED6\u8BBE\u5907\u3002" }), snapshot?.canManage && (_jsxs(_Fragment, { children: [_jsxs("section", { children: [_jsx("h4", { children: "\u5F85\u52A0\u5165" }), snapshot.requests.length === 0 && _jsx("p", { children: "\u6CA1\u6709\u5F85\u5904\u7406\u8BF7\u6C42\u3002" }), snapshot.requests.map(request => _jsxs("article", { className: css.card, children: [_jsx("code", { children: request.candidateKeyFingerprint }), _jsxs("small", { children: [request.state, " \u00B7 \u6709\u6548\u671F\u81F3 ", request.expiresAt] }), _jsxs("div", { className: css.actions, children: [_jsx("button", { type: "button", disabled: props.pending || (!request.canStartVerification && !request.claimedByCurrentDevice), onClick: () => { void start(request.requestRef); }, children: "\u5F00\u59CB\u9A8C\u8BC1" }), _jsx("button", { type: "button", disabled: props.pending, onClick: () => { void reject(request.requestRef); }, children: "\u62D2\u7EDD" })] })] }, request.requestRef))] }), progress?.phase === 'sas-ready' && _jsxs("section", { className: css.card, children: [_jsx("h4", { children: "\u6838\u5BF9\u5B89\u5168\u7801" }), _jsx("strong", { className: css.sas, children: progress.sas }), _jsx("p", { children: "\u8F93\u5165\u624B\u673A\u663E\u793A\u7684 6 \u4F4D\u7801\uFF0C\u5E76\u8F93\u5165 APPROVE\u3002" }), _jsx("input", { "aria-label": "\u624B\u673A\u5B89\u5168\u7801", value: enteredSas, inputMode: "numeric", maxLength: 6, onChange: event => { setEnteredSas(event.target.value); } }), _jsx("input", { "aria-label": "\u6279\u51C6\u786E\u8BA4\u8BCD", value: approval, autoComplete: "off", onChange: event => { setApproval(event.target.value); }, placeholder: "APPROVE" }), _jsx("button", { type: "button", disabled: props.pending || enteredSas.length !== 6 || approval !== 'APPROVE', onClick: () => { void approve(); }, children: "\u6279\u51C6\u4E3A member" })] }), rootPreparation !== null && _jsxs("section", { className: css.card, children: [_jsx("h4", { children: "\u6388\u4E88\u8BBE\u5907\u7BA1\u7406\u6743" }), _jsxs("p", { children: ["\u7CFB\u7EDF\u5C06\u9A8C\u8BC1\u672C\u673A\u7528\u6237\u8EAB\u4EFD\uFF0C\u518D\u5411\u76EE\u6807 member \u53D1\u9001\u7BA1\u7406\u80FD\u529B\u3002\u6709\u6548\u671F\u81F3 ", rootPreparation.expiresAt, "\u3002"] }), _jsx("button", { type: "button", disabled: props.pending, onClick: () => { void confirmRootTransfer(); }, children: "\u4F7F\u7528\u7CFB\u7EDF\u8BA4\u8BC1\u5E76\u53D1\u9001" })] }), rootReceipt !== null && _jsxs("p", { role: "status", children: ["\u7BA1\u7406\u80FD\u529B\u5DF2\u53D1\u9001\uFF1B\u76EE\u6807\u8BBE\u5907\u5B8C\u6210\u63A5\u6536\u540E\u4F1A\u663E\u793A\u4E3A admin\u3002\u63A5\u53D7\u65F6\u95F4\uFF1A", rootReceipt.acceptedAt] }), !snapshot.rootTransferSupported && _jsx("p", { children: "\u5F53\u524D Host \u4E0D\u652F\u6301 Root Transfer\uFF1B\u9700\u8981\u672C\u673A Darwin x64 \u7CFB\u7EDF\u8BA4\u8BC1\u3002" }), _jsxs("section", { children: [_jsx("h4", { children: "\u5DF2\u767B\u8BB0\u8BBE\u5907" }), snapshot.devices.map(device => _jsxs("article", { className: css.card, children: [_jsxs("span", { children: [device.isCurrent ? '当前设备' : '其他设备', " \u00B7 ", device.role, " \u00B7 ", device.status] }), snapshot.rootTransferSupported && !device.isCurrent && device.status === 'active' && device.role === 'member' && !device.managementReady
                                        && _jsx("button", { type: "button", disabled: props.pending, onClick: () => { void prepareRootTransfer(device.deviceRef); }, children: "\u6388\u4E88\u7BA1\u7406\u6743" }), !device.isCurrent && device.status === 'active' && (revokeRef === device.deviceRef
                                        ? _jsxs("div", { className: css.actions, children: [_jsx("input", { "aria-label": "\u64A4\u9500\u786E\u8BA4\u8BCD", value: revokeConfirmation, onChange: event => { setRevokeConfirmation(event.target.value); }, placeholder: "REVOKE" }), _jsx("button", { type: "button", disabled: props.pending || revokeConfirmation !== 'REVOKE', onClick: () => { void revoke(); }, children: "\u786E\u8BA4\u64A4\u9500" })] })
                                        : _jsx("button", { type: "button", disabled: props.pending, onClick: () => { setRevokeRef(device.deviceRef); setRevokeConfirmation(''); }, children: "\u64A4\u9500" }))] }, device.deviceRef))] })] })), error !== null && _jsx("p", { className: css.error, role: "alert", children: error })] }));
}
//# sourceMappingURL=AwikiDevices.js.map