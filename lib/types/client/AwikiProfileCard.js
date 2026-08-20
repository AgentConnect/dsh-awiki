import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { IconCloseOutline16, IconEditOutline16, IconPlusOutline16, IconUserOutline16, Modal, Tooltip, } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './AwikiOverlay.module.css';
const MAX_DISPLAY_NAME = 50;
const MAX_BIO = 100;
const MAX_TAGS = 5;
const MAX_TAG_LENGTH = 30;
function length(value) {
    return Array.from(value).length;
}
function initialProfile(identity, profile) {
    return {
        displayName: profile?.displayName ?? identity.displayName ?? '',
        bio: profile?.bio ?? '',
        tags: [...(profile?.tags ?? [])],
    };
}
/** Compact public profile with an explicit, bounded editor for all supported fields. */
export function AwikiProfileCard(props) {
    const [editing, setEditing] = useState(false);
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [error, setError] = useState(null);
    const reset = () => {
        const next = initialProfile(props.identity, props.profile);
        setDisplayName(next.displayName);
        setBio(next.bio);
        setTags(next.tags);
        setTagInput('');
        setError(null);
    };
    useEffect(() => {
        if (!editing)
            reset();
    }, [editing, props.identity.did, props.identity.displayName, props.profile]);
    const close = () => {
        reset();
        setEditing(false);
    };
    const addTag = () => {
        const tag = tagInput.trim();
        if (tag === '')
            return;
        if (length(tag) > MAX_TAG_LENGTH) {
            setError(`每个标签不能超过 ${MAX_TAG_LENGTH} 个字符`);
            return;
        }
        if (tags.some(current => current.toLocaleLowerCase() === tag.toLocaleLowerCase())) {
            setError('标签不能重复');
            return;
        }
        if (tags.length >= MAX_TAGS) {
            setError(`最多添加 ${MAX_TAGS} 个标签`);
            return;
        }
        setTags(current => [...current, tag]);
        setTagInput('');
        setError(null);
    };
    const save = async () => {
        const normalizedName = displayName.trim();
        const normalizedBio = bio.trim();
        if (normalizedName === '' || length(normalizedName) > MAX_DISPLAY_NAME) {
            setError(`昵称需要填写且不能超过 ${MAX_DISPLAY_NAME} 个字符`);
            return;
        }
        if (length(normalizedBio) > MAX_BIO) {
            setError(`个人简介不能超过 ${MAX_BIO} 个字符`);
            return;
        }
        setError(null);
        const result = await props.updateProfile({ displayName: normalizedName, bio: normalizedBio, tags });
        if (!result.ok) {
            setError(result.error);
            return;
        }
        setEditing(false);
    };
    return (_jsxs(_Fragment, { children: [_jsxs("section", { className: css.identityCard, "aria-label": "AWiki \u4E2A\u4EBA\u8D44\u6599", children: [_jsxs("div", { className: css.identityNameRow, children: [_jsx("span", { className: css.profileAvatar, children: _jsx(IconUserOutline16, { size: 14 }) }), _jsx(Tooltip, { label: props.identity.did, side: "bottom", children: _jsx("strong", { className: css.identityNameText, children: props.profile?.displayName ?? props.identity.displayName ?? '未设置昵称' }) }), _jsx(Tooltip, { label: "\u7F16\u8F91\u4E2A\u4EBA\u8D44\u6599", side: "right", children: _jsx("button", { type: "button", className: css.identityEdit, "aria-label": "\u7F16\u8F91\u4E2A\u4EBA\u8D44\u6599", disabled: props.pending, onClick: () => { reset(); setEditing(true); }, children: _jsx(IconEditOutline16, { size: 14 }) }) })] }), _jsx("small", { className: css.identityHandle, children: props.identity.handle }), props.profile?.bio !== undefined && props.profile.bio !== '' && _jsx("p", { className: css.profileBio, children: props.profile.bio }), props.profile !== null && props.profile.tags.length > 0 && (_jsx("div", { className: css.profileTags, "aria-label": "\u4E2A\u4EBA\u6807\u7B7E", children: props.profile.tags.map(tag => _jsx("span", { children: tag }, tag)) })), _jsxs("span", { className: css.identityStatus, children: [_jsx("i", {}), "\u5728\u7EBF"] })] }), _jsx(Modal, { open: editing, onClose: () => { if (!props.pending)
                    close(); }, title: "\u7F16\u8F91\u4E2A\u4EBA\u8D44\u6599", closeLabel: "\u53D6\u6D88\u7F16\u8F91\u4E2A\u4EBA\u8D44\u6599", className: css.compactModal ?? '', contentClassName: css.compactModalContent ?? '', children: _jsxs("form", { className: css.profileEditor, onSubmit: (event) => { event.preventDefault(); void save(); }, children: [_jsx("small", { className: css.identityHandle, children: props.identity.handle }), _jsxs("label", { children: ["\u6635\u79F0", _jsx("input", { "aria-label": "\u6635\u79F0", autoFocus: true, disabled: props.pending, value: displayName, maxLength: MAX_DISPLAY_NAME * 2, onChange: (event) => { setDisplayName(event.target.value); setError(null); } }), _jsxs("small", { children: [length(displayName), "/", MAX_DISPLAY_NAME] })] }), _jsxs("label", { children: ["\u4E2A\u4EBA\u7B80\u4ECB", _jsx("textarea", { "aria-label": "\u4E2A\u4EBA\u7B80\u4ECB", disabled: props.pending, rows: 3, value: bio, onChange: (event) => { setBio(event.target.value); setError(null); } }), _jsxs("small", { children: [length(bio), "/", MAX_BIO] })] }), _jsxs("div", { className: css.profileTagEditor, children: [_jsxs("label", { htmlFor: "awiki-profile-tag", children: ["\u6807\u7B7E ", _jsxs("small", { children: [tags.length, "/", MAX_TAGS] })] }), _jsxs("div", { children: [_jsx("input", { id: "awiki-profile-tag", "aria-label": "\u65B0\u6807\u7B7E", disabled: props.pending || tags.length >= MAX_TAGS, value: tagInput, onChange: (event) => { setTagInput(event.target.value); setError(null); }, onKeyDown: (event) => {
                                                if (event.key !== 'Enter' || event.nativeEvent.isComposing)
                                                    return;
                                                event.preventDefault();
                                                addTag();
                                            } }), _jsx("button", { type: "button", "aria-label": "\u6DFB\u52A0\u6807\u7B7E", disabled: props.pending || tagInput.trim() === '' || tags.length >= MAX_TAGS, onClick: addTag, children: _jsx(IconPlusOutline16, { size: 14 }) })] }), tags.length > 0 && (_jsx("div", { className: css.profileTags, children: tags.map(tag => (_jsxs("span", { children: [tag, _jsx("button", { type: "button", "aria-label": `移除标签 ${tag}`, disabled: props.pending, onClick: () => { setTags(current => current.filter(value => value !== tag)); }, children: _jsx(IconCloseOutline16, { size: 10 }) })] }, tag))) }))] }), error !== null && _jsx("small", { className: css.identityError, role: "alert", children: error }), _jsxs("div", { className: css.profileEditorActions, children: [_jsx("button", { type: "button", className: css.secondary, disabled: props.pending, onClick: close, children: "\u53D6\u6D88" }), _jsx("button", { type: "submit", className: css.primary, disabled: props.pending, children: "\u4FDD\u5B58\u8D44\u6599" })] })] }) })] }));
}
//# sourceMappingURL=AwikiProfileCard.js.map