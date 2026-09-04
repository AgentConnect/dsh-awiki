const MAIL_INGRESS_CLASSIFICATIONS = new Set([
    'reached',
    'not_reached',
    'unknown',
]);
const AUTH_STATUS_CLASSES = new Set([
    'accepted',
    'rejected',
    'dependency_unavailable',
    'unknown',
]);
const MAIL_CLOSED_CLASSIFICATIONS = new Set([
    'success',
    'authentication_rejected',
    'dependency_unavailable',
    'no_active_handle',
    'multiple_active_handles',
    'no_mailbox',
    'owner_conflict',
    'unknown',
]);
const STABLE_MACHINE_CODE = /^[a-z0-9](?:[a-z0-9._-]{0,126}[a-z0-9])?$/u;
const CLOSED_FAILURE_TUPLES = new Set([
    'reached:rejected:authentication_rejected',
    'reached:dependency_unavailable:dependency_unavailable',
    'not_reached:dependency_unavailable:dependency_unavailable',
    'reached:accepted:no_active_handle',
    'reached:accepted:multiple_active_handles',
    'reached:accepted:no_mailbox',
    'reached:accepted:owner_conflict',
]);
function property(value, key) {
    try {
        return typeof value === 'object' && value !== null
            ? value[key]
            : undefined;
    }
    catch {
        return undefined;
    }
}
function optionalProperty(value, key) {
    try {
        if (typeof value !== 'object' || value === null || !(key in value))
            return { status: 'absent' };
        return { status: 'present', value: value[key] };
    }
    catch {
        return { status: 'unreadable' };
    }
}
/** Copy only a complete upstream closed classification; arbitrary errors fail closed. */
export function mailRecoveryFailureFields(error) {
    const ingress = property(error, 'mail_ingress_classification');
    const authStatus = property(error, 'auth_status_class');
    const closed = property(error, 'mail_closed_classification');
    const retryable = property(error, 'retryable');
    if (typeof ingress !== 'string' || !MAIL_INGRESS_CLASSIFICATIONS.has(ingress)
        || typeof authStatus !== 'string' || !AUTH_STATUS_CLASSES.has(authStatus)
        || typeof closed !== 'string' || !MAIL_CLOSED_CLASSIFICATIONS.has(closed)
        || ingress === 'unknown'
        || authStatus === 'unknown'
        || closed === 'unknown'
        || closed === 'success'
        || typeof retryable !== 'boolean')
        return undefined;
    const tuple = `${ingress}:${authStatus}:${closed}`;
    if (!CLOSED_FAILURE_TUPLES.has(tuple))
        return undefined;
    const stableCode = optionalProperty(error, 'auth_stable_machine_code');
    if (stableCode.status === 'unreadable'
        || (stableCode.status === 'present'
            && (typeof stableCode.value !== 'string' || !STABLE_MACHINE_CODE.test(stableCode.value)))
        || (stableCode.status === 'present' && authStatus === 'accepted'))
        return undefined;
    return {
        mail_ingress_classification: ingress,
        auth_status_class: authStatus,
        ...(stableCode.status === 'present'
            ? { auth_stable_machine_code: stableCode.value }
            : {}),
        retryable,
        mail_closed_classification: closed,
    };
}
export function successfulMailRecoveryObservability() {
    return {
        current_principal_matches_recovery: true,
        request_generation_classification: 'current',
        mail_ingress_classification: 'reached',
        auth_status_class: 'accepted',
        retryable: false,
        mail_closed_classification: 'success',
    };
}
export function failedMailRecoveryObservability(error) {
    const fields = mailRecoveryFailureFields(error);
    return {
        current_principal_matches_recovery: true,
        request_generation_classification: 'current',
        ...(fields ?? {
            mail_ingress_classification: 'unknown',
            auth_status_class: 'unknown',
            retryable: false,
            mail_closed_classification: 'unknown',
        }),
    };
}
export function fencedMailRecoveryObservability(currentPrincipalMatchesRecovery, requestGenerationClassification) {
    return {
        current_principal_matches_recovery: currentPrincipalMatchesRecovery,
        request_generation_classification: requestGenerationClassification,
        mail_ingress_classification: currentPrincipalMatchesRecovery ? 'unknown' : 'not_reached',
        auth_status_class: 'unknown',
        retryable: false,
        mail_closed_classification: 'unknown',
    };
}
//# sourceMappingURL=mail-recovery-observability.js.map