# Mail Recovery observability

After Core reports Handle Recovery as `applied`, the Host confirms that the provider's current
identity is the recovered identity and performs the existing `getMailAccount` first-use request.
The Recovery remains active when optional Mail is unavailable. Its returned recovery progress may
include `mailRecoveryObservability`, a runtime-only receipt for that one Host generation.

The receipt contains only:

- `current_principal_matches_recovery`;
- `request_generation_classification`;
- `mail_ingress_classification`;
- `auth_status_class`;
- optional `auth_stable_machine_code`;
- `retryable`;
- `mail_closed_classification`.

DSH does not derive Mail or User Service business classifications from HTTP status, error text, or
response bodies. It only accepts a complete closed classification supplied through the existing
provider error boundary. Stable machine codes must use the bounded lowercase machine-code syntax.
Unknown, incomplete, malformed, or hostile errors become `unknown` with `retryable=false`.

The receipt is not persisted. Provider replacement, session-generation change, Clear Local Data,
unload, and restart cannot reuse a late receipt. A principal mismatch makes no Mail request, and a
generation mismatch prevents the late completion from publishing a replacement session.

The receipt never contains a DID, Handle, phone, account or mailbox identifier, token, OTP, key,
signature material, configuration value, database credential, message body, MIME, attachment,
rule, or raw error body. Real `awiki.info` reproduction, deployment, and publication require a
separate human gate.
