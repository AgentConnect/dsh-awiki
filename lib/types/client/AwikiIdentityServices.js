import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** Public services editor. Core owns authorization, protected fields and durable writes. */
import { useEffect, useRef, useState } from 'react';
import css from './AwikiDevices.module.css';
const protectedTypes = new Set(['AgentDescription', 'ANPHandleService', 'ANPMessageService']);
export function AwikiIdentityServices(props) {
    const [snapshot, setSnapshot] = useState(null);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState(null);
    const [existingId, setExistingId] = useState(null);
    const alive = useRef(false);
    const writing = useRef(false);
    const canEdit = snapshot?.canManage === true && !snapshot.pending && !busy;
    const read = async () => {
        const result = await props.getIdentityServices();
        if (!alive.current)
            return;
        if (result.ok)
            setSnapshot(result.value);
        else {
            setSnapshot(null);
            setError(result.error);
        }
    };
    useEffect(() => {
        alive.current = true;
        void read();
        return () => { alive.current = false; };
    }, []);
    const write = async (services) => {
        if (writing.current || snapshot?.canManage !== true)
            return;
        if (services !== undefined && snapshot.pending)
            return;
        writing.current = true;
        setBusy(true);
        setError(null);
        try {
            const result = services === undefined
                ? await props.resumeIdentityServicesUpdate({ did: snapshot.did })
                : await props.updateIdentityServices({ did: snapshot.did, services });
            if (!alive.current)
                return;
            if (result.ok) {
                setSnapshot(result.value);
                setEditing(null);
            }
            else
                setError(result.error);
            // Re-read even after a lost response; a new write stays closed while Core has pending work.
            await read();
        }
        finally {
            writing.current = false;
            if (alive.current)
                setBusy(false);
        }
    };
    return _jsxs("section", { className: css.section, "aria-label": "\u8EAB\u4EFD\u670D\u52A1", children: [_jsxs("div", { className: css.sectionHeading, children: [_jsx("h4", { children: "\u8EAB\u4EFD\u670D\u52A1" }), _jsx("button", { type: "button", disabled: busy, onClick: () => { void read(); }, children: "\u91CD\u65B0\u68C0\u67E5\u670D\u52A1" })] }), snapshot?.pending && _jsxs("div", { className: css.notice, role: "status", children: [_jsx("strong", { children: "\u670D\u52A1\u66F4\u65B0\u5C1A\u672A\u786E\u8BA4" }), _jsx("span", { children: "\u5DF2\u4FDD\u5B58\u539F\u66F4\u65B0\uFF0C\u5173\u95ED\u6216\u91CD\u65B0\u6253\u5F00\u9875\u9762\u4E0D\u4F1A\u91CD\u590D\u63D0\u4EA4\u3002" }), snapshot.canManage && _jsx("button", { type: "button", disabled: busy, onClick: () => { void write(); }, children: "\u7EE7\u7EED\u539F\u670D\u52A1\u66F4\u65B0" })] }), snapshot?.services.map(service => _jsxs("article", { className: css.card, children: [_jsx("strong", { children: service.type }), _jsx("p", { children: service.id }), _jsx("p", { children: service.serviceEndpoint }), protectedTypes.has(service.type) ? _jsx("small", { children: "\u7CFB\u7EDF\u670D\u52A1\uFF0C\u53EA\u8BFB" }) : canEdit && _jsxs("div", { className: css.actions, children: [_jsx("button", { type: "button", onClick: () => { setExistingId(service.id); setEditing(service); }, children: "\u7F16\u8F91\u670D\u52A1" }), _jsx("button", { type: "button", onClick: () => { void write(snapshot.services.filter(value => value.id !== service.id)); }, children: "\u5220\u9664\u670D\u52A1" })] })] }, service.id)), canEdit && _jsx("button", { type: "button", onClick: () => { setExistingId(null); setEditing({ id: `${snapshot.did}#`, type: '', serviceEndpoint: '' }); }, children: "\u6DFB\u52A0\u670D\u52A1" }), canEdit && editing !== null && _jsxs("form", { className: css.card, onSubmit: event => {
                    event.preventDefault();
                    const services = existingId === null ? [...snapshot.services, editing] : snapshot.services.map(value => value.id === existingId ? editing : value);
                    void write(services);
                }, children: [_jsxs("label", { className: css.field, children: ["\u670D\u52A1\u6807\u8BC6", _jsx("input", { "aria-label": "\u670D\u52A1\u6807\u8BC6", value: editing.id, readOnly: existingId !== null, onChange: event => { setEditing({ ...editing, id: event.target.value }); }, required: true })] }), _jsxs("label", { className: css.field, children: ["\u670D\u52A1\u7C7B\u578B", _jsx("input", { "aria-label": "\u670D\u52A1\u7C7B\u578B", value: editing.type, onChange: event => { setEditing({ ...editing, type: event.target.value }); }, required: true })] }), _jsxs("label", { className: css.field, children: ["\u670D\u52A1\u5730\u5740", _jsx("input", { "aria-label": "\u670D\u52A1\u5730\u5740", value: editing.serviceEndpoint, onChange: event => { setEditing({ ...editing, serviceEndpoint: event.target.value }); }, required: true })] }), _jsx("button", { type: "submit", children: "\u4FDD\u5B58\u670D\u52A1" }), _jsx("button", { type: "button", onClick: () => { setEditing(null); }, children: "\u53D6\u6D88\u7F16\u8F91" })] }), error !== null && _jsx("p", { className: css.error, role: "alert", children: error })] });
}
//# sourceMappingURL=AwikiIdentityServices.js.map