import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { AwikiAvatar } from "./AwikiAvatar.js";
import { avatarJpeg, avatarPreview, drawAvatarCrop } from "./avatar-image.js";
import css from './AwikiAvatar.module.css';
import shared from './AwikiOverlay.module.css';
export function AwikiAvatarEditor(props) {
    const [bitmap, setBitmap] = useState(null);
    const [crop, setCrop] = useState({ zoom: 1, x: 0.5, y: 0.5 });
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState(null);
    const [confirmClear, setConfirmClear] = useState(false);
    const [operation, setOperation] = useState(null);
    const canvas = useRef(null);
    const input = useRef(null);
    const alive = useRef(true);
    const pointer = useRef(null);
    useEffect(() => {
        alive.current = true;
        void props.refreshAvatarProfile().then(result => { if (alive.current) {
            if (!result.ok)
                setError(result.error);
            setBusy(false);
        } });
        return () => { alive.current = false; };
    }, [props.owner, props.refreshAvatarProfile]);
    useEffect(() => () => { bitmap?.close(); }, [bitmap]);
    useEffect(() => { if (bitmap !== null && canvas.current !== null)
        drawAvatarCrop(canvas.current, bitmap, crop); }, [bitmap, crop]);
    useEffect(() => {
        if (operation !== null && !busy && props.profile?.profileVersion !== undefined && props.profile.profileVersion !== operation.expectedProfileVersion) {
            setOperation(null);
            setBitmap(null);
            setError('已读取最新头像，请确认当前结果后再操作。');
        }
    }, [operation, busy, props.profile?.profileVersion]);
    const choose = async (file) => {
        if (file === undefined)
            return;
        setBusy(true);
        setError(null);
        setConfirmClear(false);
        try {
            const image = await avatarPreview(file);
            if (!alive.current) {
                image.close();
                return;
            }
            setBitmap(image);
            setCrop({ zoom: 1, x: 0.5, y: 0.5 });
        }
        catch (error) {
            if (alive.current)
                setError(error instanceof Error ? error.message : '无法读取图片，请换一张照片');
        }
        finally {
            if (alive.current)
                setBusy(false);
        }
    };
    const save = async (clear = false) => {
        const version = props.profile?.profileVersion;
        if (version === undefined || props.profile?.avatarUploadEnabled !== true || busy)
            return;
        setBusy(true);
        setError(null);
        try {
            const pending = operation ?? {
                requestId: crypto.randomUUID(), expectedProfileVersion: version,
                ...clear || bitmap === null ? {} : { imageBase64: await avatarJpeg(bitmap, crop) },
            };
            if (!alive.current)
                return;
            setOperation(pending);
            const result = pending.imageBase64 === undefined ? await props.clearAvatar(pending) : await props.setAvatar({ ...pending, imageBase64: pending.imageBase64 });
            if (!alive.current)
                return;
            if (result.ok)
                props.onClose();
            else
                setError('尚未确认保存结果。请检查网络后重试；重试会继续同一次保存。');
        }
        catch {
            if (alive.current)
                setError('无法处理或保存头像，请重试或换一张照片。');
        }
        finally {
            if (alive.current)
                setBusy(false);
        }
    };
    const drag = (event) => {
        const start = pointer.current;
        if (start === null || bitmap === null || busy)
            return;
        const edge = Math.min(bitmap.width, bitmap.height) / crop.zoom;
        const size = event.currentTarget.getBoundingClientRect().width;
        const dx = (event.clientX - start.x) * edge / size, dy = (event.clientY - start.y) * edge / size;
        setCrop({ ...crop, x: bitmap.width === edge ? 0.5 : Math.max(0, Math.min(1, start.crop.x - dx / (bitmap.width - edge))), y: bitmap.height === edge ? 0.5 : Math.max(0, Math.min(1, start.crop.y - dy / (bitmap.height - edge))) });
    };
    const enabled = !busy && props.profile?.avatarUploadEnabled === true;
    return _jsx(Modal, { open: true, onClose: () => { if (!busy)
            props.onClose(); }, title: "\u8BBE\u7F6E\u5934\u50CF", closeLabel: "\u53D6\u6D88\u8BBE\u7F6E\u5934\u50CF", className: shared.compactModal ?? '', children: _jsxs("div", { className: css.editor, "aria-busy": busy, children: [bitmap === null ? _jsx(AwikiAvatar, { name: props.profile?.displayName ?? '头像', ...props.profile?.did === undefined ? {} : { did: props.profile.did }, uri: props.profile?.avatarUri, size: 112 }) : _jsxs(_Fragment, { children: [_jsx("canvas", { ref: canvas, className: css.crop, width: 512, height: 512, tabIndex: 0, role: "img", "aria-label": "\u5934\u50CF\u88C1\u526A\u9884\u89C8\uFF0C\u53EF\u62D6\u52A8\u6216\u4F7F\u7528\u65B9\u5411\u952E\u8C03\u6574\u4F4D\u7F6E", onPointerDown: event => { if (!busy) {
                                event.currentTarget.setPointerCapture(event.pointerId);
                                pointer.current = { x: event.clientX, y: event.clientY, crop };
                            } }, onPointerMove: drag, onPointerUp: () => { pointer.current = null; }, onPointerCancel: () => { pointer.current = null; }, onKeyDown: event => {
                                if (busy || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key))
                                    return;
                                event.preventDefault();
                                setCrop({ ...crop, x: Math.max(0, Math.min(1, crop.x + (event.key === 'ArrowRight' ? 0.03 : event.key === 'ArrowLeft' ? -0.03 : 0))), y: Math.max(0, Math.min(1, crop.y + (event.key === 'ArrowDown' ? 0.03 : event.key === 'ArrowUp' ? -0.03 : 0))) });
                            } }), _jsxs("label", { className: css.controls, children: ["\u7F29\u653E", _jsx("input", { type: "range", "aria-label": "\u7F29\u653E\u5934\u50CF", min: 1, max: 4, step: 0.01, disabled: busy, value: crop.zoom, onChange: event => { setCrop({ ...crop, zoom: Number(event.target.value) }); } })] })] }), _jsx("p", { className: css.hint, children: bitmap === null ? '选择 JPEG、PNG 或静态 WebP 图片，最大 20 MB。' : '拖动图片调整位置，圆形区域即为头像预览。' }), bitmap !== null && Math.min(bitmap.width, bitmap.height) < 512 && _jsx("p", { className: css.hint, children: "\u56FE\u7247\u5C3A\u5BF8\u8F83\u5C0F\uFF0C\u5934\u50CF\u53EF\u80FD\u6A21\u7CCA\u3002\u5EFA\u8BAE\u9009\u62E9\u81F3\u5C11 512\u00D7512 \u7684\u56FE\u7247\u3002" }), busy && _jsx("p", { role: "status", children: "\u6B63\u5728\u5904\u7406\u5934\u50CF\u2026" }), error !== null && _jsx("p", { role: "alert", className: css.hint, children: error }), confirmClear && _jsx("p", { className: css.hint, children: "\u786E\u5B9A\u6062\u590D\u9ED8\u8BA4\u5934\u50CF\uFF1F" }), !busy && props.profile?.avatarUploadEnabled !== true && _jsx("p", { className: css.hint, children: "\u5F53\u524D\u8D26\u53F7\u6216\u670D\u52A1\u6682\u4E0D\u652F\u6301\u4FEE\u6539\u5934\u50CF\u3002" }), _jsx("input", { ref: input, type: "file", accept: "image/jpeg,image/png,image/webp", hidden: true, "aria-label": "\u9009\u62E9\u5934\u50CF\u56FE\u7247", onChange: event => { const file = event.target.files?.[0]; event.target.value = ''; void choose(file); } }), _jsxs("div", { className: css.actions, children: [_jsx("button", { type: "button", className: shared.secondary, disabled: !enabled || operation !== null, onClick: () => { input.current?.click(); }, children: "\u9009\u62E9\u7167\u7247" }), operation !== null ? _jsx("button", { type: "button", className: shared.primary, disabled: !enabled, onClick: () => { void save(); }, children: "\u91CD\u8BD5\u4FDD\u5B58" }) : bitmap !== null ? _jsx("button", { type: "button", className: shared.primary, disabled: !enabled, onClick: () => { void save(); }, children: "\u4FDD\u5B58\u5934\u50CF" }) : props.profile?.avatarUri != null && _jsx("button", { type: "button", className: shared.secondary, disabled: !enabled, onClick: () => { if (confirmClear)
                                void save(true);
                            else
                                setConfirmClear(true); }, children: confirmClear ? '确认恢复默认头像' : '恢复默认头像' }), _jsx("button", { type: "button", className: shared.secondary, disabled: busy, onClick: props.onClose, children: "\u53D6\u6D88" })] })] }) });
}
//# sourceMappingURL=AwikiAvatarEditor.js.map