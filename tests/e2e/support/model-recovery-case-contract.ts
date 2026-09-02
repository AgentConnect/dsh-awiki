export const modelRecoveryLiveCase = Object.freeze({
  caseId: 'DSH-WEB-MODEL-RECOVERY-001',
  status: 'planned',
  preconditions: [
    'A reviewed DSH Web profile installs the exact local AWiki and Model Proxy candidates.',
    'A reviewed Model target exposes protected strong and provider-asserted E1 transition fixtures.',
    'The run has current-DID External HTTP Auth, exact Model cleanup authority, and a secret-safe artifact scanner.',
  ],
  action: [
    'Complete visible Handle Recovery while Model reconciliation is held pending and prove the Human session publishes first.',
    'Enable the hosted model, inject one 503, complete strict empty-body reconciliation, restart the same Harness, and reconcile again.',
    'Exercise manual 409, active-generation replacement, sign-out, Clear Local Data, unload, and late completion.',
  ],
  exactOracles: [
    'Before each accepted reconciliation, adapter registration, directory registration, and token dispatch counts are all zero.',
    'Every Model recovery request uses current-DID External HTTP Auth, POST, application/json, the exact body {}, and no operation, claim, DID path, proof, assurance, or ledger owner.',
    'One 503 causes exactly one retry; restored, already_current, and not_applicable open only the matching current generation; 401, 403, and 409 remain suspended.',
    'Restart calls the service again without persisted transition material; sign-out, Clear Local Data, unload, and generation change make every late completion a no-op.',
    'The Browser and artifacts contain no token, Authorization value, full DID, document, proof, path, assurance, canonical ledger, or private response body.',
  ],
  negativeChecks: [
    'A source-only assertion, adapter readiness before reconciliation, a non-empty request body, old-generation readiness, silent retry beyond the bound, skipped cleanup, or secret-bearing evidence cannot pass.',
  ],
  cleanup: [
    'Stop the isolated Harness and delete only run-owned profile, browser, and artifact roots.',
    'Use the reviewed target-bound Model operator to remove only run-tracked alias, fence, operation, trust-anchor, account, order, usage, and reservation fixtures in dependency order.',
    'Require zero current-DID shell ledger and zero untracked accounting rows; report undeletable User identity state separately as residual, never cleaned.',
  ],
  evidenceType: 'playwright_report+closed_auth_trace+model_cleanup_receipt+residual_ledger+secret_scan',
} as const)
