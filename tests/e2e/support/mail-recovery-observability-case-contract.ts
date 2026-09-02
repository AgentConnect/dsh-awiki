export const mailRecoveryObservabilityLiveCase = Object.freeze({
  caseId: 'DSH-WEB-MAIL-RECOVERY-OBSERVABILITY-001',
  status: 'planned',
  preconditions: [
    'A reviewed DSH Web profile installs the exact immutable Mail observability candidate without the separate Model candidate paths.',
    'A reviewed target can produce each secret-free closed Mail/auth classification without exposing an identity, credential, mailbox, or message.',
    'The run has exact profile cleanup authority, a secret scanner, and no permission to deploy or alter awiki.info services.',
  ],
  action: [
    'Complete visible Handle Recovery and hold the post-applied getMailAccount request across a late completion.',
    'Exercise success, authentication rejection, dependency unavailability, mailbox owner failures, sign-out, generation replacement, Clear Local Data, unload, and same-state-root restart.',
    'Inspect only the seven approved observability fields and retry only when the preserved closed receipt says retryable=true.',
  ],
  exactOracles: [
    'Success, authentication_rejected, dependency_unavailable, no_active_handle, multiple_active_handles, no_mailbox, owner_conflict, and unknown are distinct closed states.',
    'The receipt contains only current_principal_matches_recovery, request_generation_classification, mail_ingress_classification, auth_status_class, auth_stable_machine_code, retryable, and mail_closed_classification.',
    'A principal mismatch sends no Mail request; generation replacement, Clear Local Data, unload, and sign-out prevent a stale late completion from activating the replacement session.',
    'Restart persists no receipt or raw error and performs a fresh first-use request for the current applied Recovery state.',
    'Session publication, adapter/directory/token gates, and ordinary Mail operations retain their pre-candidate behavior.',
  ],
  negativeChecks: [
    'Unknown or incomplete metadata fails closed with retryable=false and cannot be reported as success, authentication rejection, or dependency unavailability.',
    'No DID, Handle, phone, account/mailbox id, token, OTP, key, signature, configuration, database credential, message body, MIME, attachment, rule, or raw error body appears in Browser state, logs, snapshots, or artifacts.',
  ],
  cleanup: [
    'Stop only the isolated Harness and delete only run-owned profile, browser, and artifact roots.',
    'Record any undeletable remote identity state as residual; never claim cleanup that was not directly verified.',
  ],
  evidenceType: 'playwright_report+closed_mail_receipts+session_generation_trace+cleanup_receipt+residual_ledger+secret_scan',
} as const)
