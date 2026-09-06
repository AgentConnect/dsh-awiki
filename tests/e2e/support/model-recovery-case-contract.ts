export const modelRecoveryLiveCase = Object.freeze({
  caseId: 'DSH-WEB-MODEL-RECOVERY-001',
  status: 'active',
  preconditions: [
    'A reviewed DSH Web profile installs the exact local AWiki and Model Proxy candidates.',
    'The protected live target provides a no-charge Model endpoint and deterministic prompt/response fixture for the recovered Handle.',
    'The run has current-DID External HTTP Auth, exact Model cleanup authority, and a secret-safe artifact scanner.',
  ],
  action: [
    'Enable the hosted model for A and complete one visible no-charge request before Clear Local Data, creating the canonical account and anchor.',
    'Use the visible product action to Clear Local Data, complete OTP Recovery to B, consume the exact outcome-only restored response, and complete one assistant-scoped no-charge request.',
    'Restart the same Harness, consume already_current, complete one new assistant response, and ingest the run-bound privacy-safe Model server receipt.',
  ],
  exactOracles: [
    'Before each accepted reconciliation, adapter registration, directory registration, and token dispatch counts are all zero.',
    'Every Model recovery request uses current-DID External HTTP Auth, POST, application/json, the exact body {}, and no operation, claim, DID path, proof, assurance, or ledger owner.',
    'One 503 causes exactly one retry; the exact outcome-only restored, already_current, and not_applicable responses open only the matching current generation; 401, 403, 409, unknown outcomes, and extra response fields remain suspended.',
    'The Model receipt proves restored, one account and the same canonical ledger/accounting fingerprint, exact alias/fence/anchor/operation deltas, stored assurance with same-length ordered per-fence proof/cache evidence, no second account, and old-principal fencing.',
    'A successful reconciliation response is insufficient: A has one pre-Recovery completion, B has one assistant-scoped post-Recovery completion, and restart has one new completion with already_current and zero recovery-row growth.',
    'The Browser and artifacts contain no token, Authorization value, full DID, document, provider assertion, proof, path, assurance, canonical ledger, or private response body; assurance remains a server-side audit/DB oracle outside the public response.',
  ],
  negativeChecks: [
    'A source-only assertion, adapter readiness before reconciliation, a non-empty request body, caller-supplied assurance, old-generation readiness, silent retry beyond the bound, skipped cleanup, or secret-bearing evidence cannot pass.',
  ],
  cleanup: [
    'Stop the isolated Harness and delete only run-owned profile, browser, and artifact roots.',
    'Use the reviewed target-bound Model operator to remove only run-tracked alias, fence, operation, trust-anchor, account, order, usage, and reservation fixtures in dependency order.',
    'Require zero current-DID shell ledger and zero untracked accounting rows; report undeletable User identity state separately as residual, never cleaned.',
  ],
  evidenceType: 'sanitized_dsh_run_report+model_recovery_server_receipt+closed_auth_trace+model_cleanup_receipt+residual_ledger+secret_scan',
} as const)
