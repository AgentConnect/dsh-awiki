const RETRY_BASE_DELAY_MS = 1_000;
const RETRY_MAX_DELAY_MS = 30_000;
function syncReason(cause) {
    if (cause === 'session_start')
        return 'session_start';
    return cause === 'reconnected' ? 'websocket_reconnect' : 'websocket_hint';
}
/** Own the deployment identity's only WSS without knowing Workspace or Agent policy. */
export class IdentityRealtimeSupervisor {
    realtime;
    config;
    logger;
    lifecycle;
    generation = 0;
    activeSession;
    stoppedSessions = new WeakSet();
    stopped = false;
    connected = false;
    startCount = 0;
    stopCount = 0;
    lastCommittedSyncCause;
    retryTimer;
    resolveRetry;
    constructor(realtime, config = {}, logger = {
        debug() { }, info() { }, warn() { }, error() { }, name: 'awiki-realtime',
    }) {
        this.realtime = realtime;
        this.config = config;
        this.logger = logger;
    }
    /** Start in the background; identity activation must never await connectivity. */
    start() {
        if (this.lifecycle !== undefined || this.stopped)
            return;
        const generation = ++this.generation;
        this.lifecycle = this.run(generation).catch((error) => {
            if (!this.stopped) {
                this.logger.warn('AWiki realtime supervisor stopped unexpectedly: %s', error instanceof Error ? error.message : 'unknown failure');
            }
        });
    }
    diagnostics() {
        return {
            connected: this.connected,
            activeSessionCount: this.activeSession === undefined ? 0 : 1,
            startCount: this.startCount,
            stopCount: this.stopCount,
            ...(this.lastCommittedSyncCause === undefined
                ? {}
                : { lastCommittedSyncCause: this.lastCommittedSyncCause }),
        };
    }
    /** Fence late events, wake retry sleep, stop the exact session, and join the lifecycle. */
    async dispose() {
        if (this.stopped)
            return;
        this.stopped = true;
        this.generation += 1;
        this.connected = false;
        this.wakeRetry();
        const session = this.activeSession;
        if (session !== undefined)
            await this.stopSession(session).catch(() => undefined);
        await this.lifecycle;
    }
    current(generation) {
        return !this.stopped && this.generation === generation;
    }
    async run(generation) {
        let cause = 'session_start';
        let failures = 0;
        while (this.current(generation)) {
            let session;
            try {
                await this.synchronize(cause, generation);
                if (!this.current(generation))
                    return;
                session = await this.realtime.startRealtime();
                if (!this.current(generation)) {
                    await this.stopSession(session).catch(() => undefined);
                    return;
                }
                this.activeSession = session;
                this.startCount += 1;
                this.connected = (await session.getStatus().catch(() => ({ connected: false }))).connected;
                failures = 0;
                while (this.current(generation) && this.activeSession === session) {
                    const event = await session.nextEvent();
                    if (!this.current(generation) || this.activeSession !== session)
                        return;
                    if (event === null) {
                        await this.stopSession(session);
                        cause = 'reconnected';
                        break;
                    }
                    this.observeConnection(event);
                    if (event.kind !== 'sync_required')
                        continue;
                    await this.synchronize(event.cause, generation);
                }
            }
            catch (error) {
                this.connected = false;
                if (session !== undefined)
                    await this.stopSession(session).catch(() => undefined);
                if (!this.current(generation))
                    return;
                failures += 1;
                this.logger.warn('AWiki realtime lifecycle failed; retrying: %s', error instanceof Error ? error.message : 'unknown failure');
                await this.waitForRetry(failures, generation);
                cause = cause === 'session_start' ? 'session_start' : 'reconnected';
            }
        }
    }
    async synchronize(cause, generation) {
        await this.realtime.syncNow(syncReason(cause));
        if (!this.current(generation))
            return;
        this.lastCommittedSyncCause = cause;
        try {
            await this.config.onSynchronized?.(cause);
        }
        catch (error) {
            this.logger.warn('AWiki realtime post-sync consumer failed: %s', error instanceof Error ? error.message : 'unknown failure');
        }
    }
    observeConnection(event) {
        if (event.kind !== 'connection_state_changed')
            return;
        this.connected = event.state === 'connected';
    }
    async stopSession(session) {
        if (this.stoppedSessions.has(session))
            return;
        this.stoppedSessions.add(session);
        if (this.activeSession === session)
            this.activeSession = undefined;
        this.connected = false;
        this.stopCount += 1;
        await session.stop();
    }
    waitForRetry(failures, generation) {
        if (!this.current(generation))
            return Promise.resolve();
        const delay = Math.min(RETRY_BASE_DELAY_MS * 2 ** Math.min(failures - 1, 10), RETRY_MAX_DELAY_MS);
        return new Promise(resolve => {
            const finish = () => {
                if (this.retryTimer === timer)
                    this.retryTimer = undefined;
                if (this.resolveRetry === finish)
                    this.resolveRetry = undefined;
                resolve();
            };
            const timer = setTimeout(finish, delay);
            this.retryTimer = timer;
            this.resolveRetry = finish;
        });
    }
    wakeRetry() {
        const timer = this.retryTimer;
        if (timer !== undefined)
            clearTimeout(timer);
        this.resolveRetry?.();
    }
}
//# sourceMappingURL=realtime-supervisor.js.map