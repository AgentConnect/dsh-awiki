import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Button, IconCloseOutline16, IconLoadingOutline16, IconPlusOutline16, IconRefreshOutline16, IconTrashOutline16, Modal, Tooltip, } from '@deepseek-ai/dsh-client-ui-primitives';
import { shortenedDid } from "./mentions.js";
import css from './AwikiOverlay.module.css';
function roleRank(role) {
    switch (role?.toLocaleLowerCase()) {
        case 'owner': return 3;
        case 'admin': return 2;
        case 'member': return 1;
        default: return 0;
    }
}
function roleLabel(role) {
    switch (role?.toLocaleLowerCase()) {
        case 'owner': return '群主';
        case 'admin': return '管理员';
        case 'member': return '成员';
        default: return role?.trim() || '成员';
    }
}
function memberIsSelf(member, identity) {
    return member.did === identity.did
        || member.credentialDid === identity.did
        || (member.handle !== undefined && member.handle === identity.handle);
}
/** UI permission hint. Core/server remains the final membership authority. */
export function canRemoveGroupMember(actorRole, member, identity) {
    const actorRank = roleRank(actorRole);
    return actorRank >= 2
        && !memberIsSelf(member, identity)
        && actorRank > roleRank(member.role)
        && (member.did !== undefined || member.handle !== undefined);
}
function memberLabel(member) {
    const displayName = member.displayName?.trim();
    if (displayName !== undefined && displayName !== '')
        return displayName;
    const handle = member.handle?.trim();
    if (handle !== undefined && handle !== '')
        return handle;
    if (member.did !== undefined)
        return shortenedDid(member.did);
    return member.peerPersonaId ?? member.membershipId ?? '未知成员';
}
/** Authoritative group snapshot and role-aware member management panel. */
export function AwikiGroupDetails(props) {
    const [invite, setInvite] = useState('');
    const [inviteStatus, setInviteStatus] = useState({ state: 'idle' });
    const [error, setError] = useState(null);
    const [removeCandidate, setRemoveCandidate] = useState(null);
    const [leaveOpen, setLeaveOpen] = useState(false);
    useEffect(() => {
        if (inviteStatus.state !== 'success')
            return;
        const timer = window.setTimeout(() => { setInviteStatus({ state: 'idle' }); }, 3_000);
        return () => { window.clearTimeout(timer); };
    }, [inviteStatus]);
    const refresh = async () => {
        setError(null);
        const result = await props.refreshSelectedGroup();
        if (!result.ok)
            setError(result.error);
    };
    const add = async () => {
        const member = invite.trim();
        if (member === '' || inviteStatus.state === 'pending')
            return;
        setInviteStatus({ state: 'pending', member });
        const result = await props.addSelectedGroupMember(member);
        if (!result.ok) {
            setInviteStatus({ state: 'error', message: result.error });
            return;
        }
        setInvite('');
        setInviteStatus({ state: 'success', member });
    };
    const remove = async () => {
        if (removeCandidate === null)
            return;
        setError(null);
        const result = await props.removeSelectedGroupMember(removeCandidate);
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setRemoveCandidate(null);
    };
    const leave = async () => {
        setError(null);
        const result = await props.leaveSelectedGroup();
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setLeaveOpen(false);
        props.onClose();
    };
    return (_jsxs("aside", { className: css.groupDetails, "aria-label": "\u7FA4\u804A\u8BE6\u60C5", children: [_jsxs("header", { className: css.groupDetailsHeader, children: [_jsxs("div", { children: [_jsx("strong", { children: "\u7FA4\u804A\u8BE6\u60C5" }), _jsx("small", { children: "\u6210\u5458\u4E0E\u6743\u9650\u4EE5\u670D\u52A1\u5668\u6700\u65B0\u72B6\u6001\u4E3A\u51C6" })] }), _jsx(Tooltip, { label: "\u5173\u95ED\u7FA4\u804A\u8BE6\u60C5", side: "right", children: _jsx("button", { type: "button", "aria-label": "\u5173\u95ED\u7FA4\u804A\u8BE6\u60C5", onClick: props.onClose, children: _jsx(IconCloseOutline16, { size: 14 }) }) })] }), props.group === null ? (_jsx("div", { className: css.groupDetailsLoading, role: "status", children: "\u6B63\u5728\u8BFB\u53D6\u7FA4\u804A\u4FE1\u606F\u2026" })) : (_jsxs(_Fragment, { children: [_jsxs("section", { className: css.groupSummary, children: [_jsx("strong", { children: props.group.title }), _jsx("code", { title: props.group.groupDid, children: props.group.groupDid }), props.group.description !== undefined && props.group.description !== '' && _jsx("p", { children: props.group.description }), _jsxs("dl", { children: [_jsxs("div", { children: [_jsx("dt", { children: "\u6211\u7684\u89D2\u8272" }), _jsx("dd", { children: roleLabel(props.group.myRole) })] }), _jsxs("div", { children: [_jsx("dt", { children: "\u6210\u5458" }), _jsx("dd", { children: props.group.memberCount ?? props.members.length })] })] })] }), roleRank(props.group.myRole) >= 2 && (_jsxs("form", { className: css.groupInvite, onSubmit: (event) => { event.preventDefault(); void add(); }, children: [_jsx("label", { htmlFor: "awiki-group-invite", children: "\u9080\u8BF7\u6210\u5458" }), _jsxs("div", { children: [_jsx("input", { id: "awiki-group-invite", value: invite, disabled: props.pending || inviteStatus.state === 'pending', placeholder: "Handle \u6216 DID", onChange: (event) => { setInvite(event.target.value); setInviteStatus({ state: 'idle' }); } }), _jsx("button", { type: "submit", "aria-label": "\u9080\u8BF7\u7FA4\u6210\u5458", "data-busy": inviteStatus.state === 'pending' ? '' : undefined, disabled: props.pending || inviteStatus.state === 'pending' || invite.trim() === '', children: inviteStatus.state === 'pending' ? _jsx(IconLoadingOutline16, { size: 14 }) : _jsx(IconPlusOutline16, { size: 14 }) })] }), inviteStatus.state !== 'idle' && (_jsxs("p", { className: css.groupInviteStatus, "data-state": inviteStatus.state, role: inviteStatus.state === 'error' ? 'alert' : 'status', "aria-live": "polite", children: [inviteStatus.state === 'pending' && `正在邀请 ${inviteStatus.member}…`, inviteStatus.state === 'success' && `已邀请 ${inviteStatus.member}`, inviteStatus.state === 'error' && inviteStatus.message] }))] })), _jsxs("section", { className: css.groupMemberSection, children: [_jsxs("div", { className: css.groupMemberHeading, children: [_jsx("strong", { children: "\u7FA4\u6210\u5458" }), _jsx("button", { type: "button", "aria-label": "\u5237\u65B0\u7FA4\u6210\u5458", disabled: props.pending, onClick: () => { void refresh(); }, children: _jsx(IconRefreshOutline16, { size: 14 }) })] }), _jsxs("div", { className: css.groupMemberList, children: [props.members.map((member, index) => {
                                        const label = memberLabel(member);
                                        const key = member.membershipId ?? member.did ?? member.handle ?? `${label}-${index}`;
                                        const removable = canRemoveGroupMember(props.group?.myRole, member, props.identity);
                                        return (_jsxs("div", { className: css.groupMemberRow, children: [_jsx("span", { className: css.groupMemberAvatar, children: label.slice(0, 1).toLocaleUpperCase() }), _jsxs("span", { className: css.groupMemberIdentity, children: [_jsxs("strong", { children: [label, memberIsSelf(member, props.identity) && _jsx("small", { children: "\u6211" })] }), _jsx("small", { children: member.handle ?? member.did ?? '缺少稳定 DID' })] }), _jsx("span", { className: css.groupMemberRole, children: roleLabel(member.role) }), removable && (_jsx(Tooltip, { label: `移除 ${label}`, side: "right", children: _jsx("button", { type: "button", className: css.groupMemberRemove, "aria-label": `移除群成员 ${label}`, disabled: props.pending, onClick: () => { setRemoveCandidate(member); }, children: _jsx(IconTrashOutline16, { size: 14 }) }) }))] }, key));
                                    }), props.members.length === 0 && _jsx("p", { className: css.empty, children: "\u6682\u65E0\u53EF\u663E\u793A\u7684\u6210\u5458\u3002" })] }), props.hasMore && _jsx("button", { type: "button", className: css.more, disabled: props.pending, onClick: () => { void props.loadMoreGroupMembers(); }, children: "\u52A0\u8F7D\u66F4\u591A\u6210\u5458" })] }), _jsxs("footer", { className: css.groupDetailsFooter, children: [_jsx("button", { type: "button", className: css.dangerText, disabled: props.pending || roleRank(props.group.myRole) === 3, onClick: () => { setLeaveOpen(true); }, children: "\u9000\u51FA\u7FA4\u804A" }), roleRank(props.group.myRole) === 3 && _jsx("small", { children: "\u7FA4\u4E3B\u4E0D\u80FD\u76F4\u63A5\u9000\u51FA\u7FA4\u804A" })] })] })), error !== null && _jsx("div", { className: css.groupDetailsError, role: "alert", children: error }), _jsx(Modal, { open: removeCandidate !== null, onClose: () => { if (!props.pending)
                    setRemoveCandidate(null); }, title: "\u79FB\u9664\u7FA4\u6210\u5458", closeLabel: "\u53D6\u6D88", className: css.compactModal ?? '', contentClassName: css.compactModalContent ?? '', description: removeCandidate === null ? '' : `确认将 ${memberLabel(removeCandidate)} 移出当前群聊？`, footer: _jsxs(_Fragment, { children: [_jsx(Button, { type: "button", variant: "outline", disabled: props.pending, onClick: () => { setRemoveCandidate(null); }, children: "\u53D6\u6D88" }), _jsx(Button, { type: "button", variant: "outline", className: css.logoutConfirm, disabled: props.pending, onClick: () => { void remove(); }, children: "\u786E\u8BA4\u79FB\u9664" })] }) }), _jsx(Modal, { open: leaveOpen, onClose: () => { if (!props.pending)
                    setLeaveOpen(false); }, title: "\u9000\u51FA\u7FA4\u804A", closeLabel: "\u53D6\u6D88", className: css.compactModal ?? '', contentClassName: css.compactModalContent ?? '', description: "\u9000\u51FA\u540E\uFF0C\u8BE5\u7FA4\u804A\u4F1A\u4ECE\u5F53\u524D\u4F1A\u8BDD\u5217\u8868\u4E2D\u79FB\u9664\u3002\u91CD\u65B0\u52A0\u5165\u9700\u8981\u518D\u6B21\u83B7\u5F97\u7FA4\u804A\u5165\u53E3\u3002", footer: _jsxs(_Fragment, { children: [_jsx(Button, { type: "button", variant: "outline", disabled: props.pending, onClick: () => { setLeaveOpen(false); }, children: "\u53D6\u6D88" }), _jsx(Button, { type: "button", variant: "outline", className: css.logoutConfirm, disabled: props.pending, onClick: () => { void leave(); }, children: "\u786E\u8BA4\u9000\u51FA" })] }) })] }));
}
//# sourceMappingURL=AwikiGroupDetails.js.map