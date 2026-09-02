export const mailRecoveryObservabilityLiveCase = Object.freeze({
  caseId: 'DSH-WEB-MAIL-RECOVERY-001',
  status: 'planned',
  preconditions: [
    'A reviewed DSH Web profile installs the exact immutable server-authoritative sent-mail candidate.',
    'The reviewed target has one stable-owner mailbox with inbound, outbound, MIME, and attachment-metadata fixtures created before Recovery.',
    'The run has exact profile cleanup authority, a secret scanner, and no permission to deploy or alter awiki.info services.',
  ],
  action: [
    'Use the visible product action to Clear Local Data, restart the isolated Harness, and complete visible Handle Recovery from A to B.',
    'Open inbox and sent, inspect one historical sent detail with MIME and attachment metadata, send one new mail, and restart the same recovered profile.',
    'Exercise timeout, authentication rejection, sign-out, generation replacement, Clear Local Data, unload, and late completion without using local sent state as an oracle.',
  ],
  exactOracles: [
    'Inbox uses the existing inbound Core query, while sent produces a signed JSON-RPC mail.list request with direction=outbound and never reads a local sent store.',
    'B observes the same stable-owner mailbox, inbound/outbound identities, order, MIME, and attachment metadata recorded before Clear Local Data.',
    'One accepted send is followed by exactly one sent refresh; the new server outbound item appears once without a duplicate optimistic row.',
    'Timeout and authentication failures remain visible stable errors with a retry action and never render as an authoritative empty sent list.',
    'Generation replacement, Clear Local Data, unload, and sign-out prevent stale inbox or sent completions from entering B state.',
    'Same-profile Restart performs fresh server inbox and outbound queries and preserves the recovered history.',
  ],
  negativeChecks: [
    'Browser cache or a recreated Host-local sent store cannot satisfy the historical sent oracle; required network or server-object evidence cannot be skipped.',
    'No DID, Handle, phone, account/mailbox id, token, OTP, key, signature, configuration, database credential, message body, MIME, attachment, rule, or raw error body appears in Browser state, logs, snapshots, or artifacts.',
  ],
  cleanup: [
    'Stop only the isolated Harness and delete only run-owned profile, browser, and artifact roots.',
    'Record any undeletable remote identity state as residual; never claim cleanup that was not directly verified.',
  ],
  evidenceType: 'playwright_report+mail_list_outbound_receipt+mail_object_fingerprints+session_generation_trace+cleanup_receipt+residual_ledger+secret_scan',
} as const)
