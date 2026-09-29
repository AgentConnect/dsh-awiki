import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { AwikiAvatar } from "./AwikiAvatar.js";
import { useAvatarDialogEscape } from "./avatar-dialog.js";
import { avatarJpeg, avatarPreview, drawAvatarCrop, initialAvatarCrop, avatarCropRectangle } from "./avatar-image.js";
import css from './AwikiAvatar.module.css';
import shared from './AwikiOverlay.module.css';
export function AwikiAvatarEditor(props) {
    const [bitmap, setBitmap] = useState(null);
    const [crop, setCrop] = useState({ edge: 1, x: 0, y: 0 });
    const [busy, setBusy] = useState(true);
    useAvatarDialogEscape(true, () => { if (!busy)
        props.onClose(); });
    const [error, setError] = useState(null);
    const [confirmClear, setConfirmClear] = useState(false);
    const [operation, setOperation] = useState(null);
    const canvas = useRef(null);
    const input = useRef(null);
    const alive = useRef(true);
    const sourceCanvas = useRef(null);
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
    useEffect(() => {
        if (bitmap !== null && sourceCanvas.current !== null) {
            const target = sourceCanvas.current;
            target.width = bitmap.width;
            target.height = bitmap.height;
            target.getContext('2d')?.drawImage(bitmap, 0, 0);
        }
    }, [bitmap]);
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
            setCrop(initialAvatarCrop(image));
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
    const enabled = !busy && props.profile?.avatarUploadEnabled === true;
    return _jsx(Modal, { open: true, onClose: () => { if (!busy)
            props.onClose(); }, title: "\u8BBE\u7F6E\u5934\u50CF", closeLabel: "\u53D6\u6D88\u8BBE\u7F6E\u5934\u50CF", className: shared.compactModal ?? '', children: _jsxs("div", { className: css.editor, "aria-busy": busy, children: [bitmap === null ? _jsx(AwikiAvatar, { name: props.profile?.displayName ?? '头像', ...props.profile?.did === undefined ? {} : { did: props.profile.did }, uri: props.profile?.avatarUri, size: 112 }) : _jsxs(_Fragment, { children: [_jsx(ReactCrop, { aspect: 1, keepSelection: true, minWidth: 40, minHeight: 40, disabled: busy || operation !== null, crop: { unit: '%', x: crop.x / bitmap.width * 100, y: crop.y / bitmap.height * 100, width: crop.edge / bitmap.width * 100, height: crop.edge / bitmap.height * 100 }, onChange: (_, percent) => { setCrop(avatarCropRectangle(bitmap, { x: percent.x / 100 * bitmap.width, y: percent.y / 100 * bitmap.height, edge: percent.width / 100 * bitmap.width })); }, ariaLabels: { cropArea: '头像选框，方向键移动，聚焦边角后用方向键调整大小', nwDragHandle: '左上角', nDragHandle: '上边', neDragHandle: '右上角', eDragHandle: '右边', seDragHandle: '右下角', sDragHandle: '下边', swDragHandle: '左下角', wDragHandle: '左边' }, children: _jsx("canvas", { ref: sourceCanvas, className: css.cropSource, "aria-label": "\u56FA\u5B9A\u7684\u5934\u50CF\u56FE\u7247", style: { width: Math.min(1, 340 / bitmap.width, 280 / bitmap.height) * bitmap.width } }) }), _jsxs("div", { className: css.comparison, children: [_jsxs("div", { children: [_jsx(AwikiAvatar, { name: props.profile?.displayName ?? '头像', ...props.profile?.did === undefined ? {} : { did: props.profile.did }, uri: props.profile?.avatarUri, size: 72 }), _jsx("small", { children: "\u5F53\u524D\u5934\u50CF" })] }), _jsxs("div", { children: [_jsx("canvas", { ref: canvas, className: css.cropPreview, width: 128, height: 128, role: "img", "aria-label": "\u65B0\u5934\u50CF\u9884\u89C8" }), _jsx("small", { children: "\u65B0\u5934\u50CF\u9884\u89C8" })] })] })] }), _jsx("p", { className: css.hint, children: bitmap === null ? '选择 JPEG、PNG 或静态 WebP 图片，最大 20 MB。' : '拖动正方形调整位置，拖动四角调整选框大小。' }), bitmap !== null && _jsx("p", { className: css.hint, style: { minHeight: 20 }, children: crop.edge < 512 ? '所选区域较小，头像可能模糊。' : '\u00a0' }), busy && _jsx("p", { role: "status", children: "\u6B63\u5728\u5904\u7406\u5934\u50CF\u2026" }), error !== null && _jsx("p", { role: "alert", className: css.hint, children: error }), confirmClear && _jsx("p", { className: css.hint, children: "\u786E\u5B9A\u6062\u590D\u9ED8\u8BA4\u5934\u50CF\uFF1F" }), !busy && props.profile?.avatarUploadEnabled !== true && _jsx("p", { className: css.hint, children: "\u5F53\u524D\u8D26\u53F7\u6216\u670D\u52A1\u6682\u4E0D\u652F\u6301\u4FEE\u6539\u5934\u50CF\u3002" }), _jsx("input", { ref: input, type: "file", accept: "image/jpeg,image/png,image/webp", hidden: true, "aria-label": "\u9009\u62E9\u5934\u50CF\u56FE\u7247", onChange: event => { const file = event.target.files?.[0]; event.target.value = ''; void choose(file); } }), _jsxs("div", { className: css.actions, children: [_jsx("button", { type: "button", className: shared.secondary, disabled: !enabled || operation !== null, onClick: () => { input.current?.click(); }, children: "\u9009\u62E9\u7167\u7247" }), operation !== null ? _jsx("button", { type: "button", className: shared.primary, disabled: !enabled, onClick: () => { void save(); }, children: "\u91CD\u8BD5\u4FDD\u5B58" }) : bitmap !== null ? _jsx("button", { type: "button", className: shared.primary, disabled: !enabled, onClick: () => { void save(); }, children: "\u4FDD\u5B58\u5934\u50CF" }) : props.profile?.avatarUri != null && _jsx("button", { type: "button", className: shared.secondary, disabled: !enabled, onClick: () => { if (confirmClear)
                                void save(true);
                            else
                                setConfirmClear(true); }, children: confirmClear ? '确认恢复默认头像' : '恢复默认头像' }), _jsx("button", { type: "button", className: shared.secondary, disabled: busy, onClick: props.onClose, children: "\u53D6\u6D88" })] })] }) });
}
//# sourceMappingURL=AwikiAvatarEditor.js.map