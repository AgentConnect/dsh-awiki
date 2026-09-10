import { useCallback, useEffect, useState } from 'react';
import { useDraftState } from "./drafts.js";
/** Retain the server cooldown across panel remounts, without persisting OTPs. */
export function useRecoveryOtpCooldown() {
    const [deadline, setDeadline] = useDraftState('recovery:retryDeadline', 0, false);
    const [now, setNow] = useState(Date.now);
    useEffect(() => {
        if (deadline <= Date.now())
            return;
        const timer = setInterval(() => { setNow(Date.now()); }, 250);
        return () => { clearInterval(timer); };
    }, [deadline]);
    const restore = useCallback((retryAt) => {
        if (retryAt === null || retryAt === undefined)
            return;
        const parsed = Date.parse(retryAt);
        if (!Number.isFinite(parsed) || parsed <= Date.now())
            return;
        const current = Date.now();
        setNow(current);
        setDeadline(deadline => Math.max(deadline, parsed));
    }, [setDeadline]);
    return {
        seconds: Math.max(0, Math.ceil((deadline - now) / 1000)),
        start: (seconds) => { const now = Date.now(); setNow(now); setDeadline(now + Math.max(0, seconds) * 1000); },
        restore,
    };
}
//# sourceMappingURL=otp-cooldown.js.map