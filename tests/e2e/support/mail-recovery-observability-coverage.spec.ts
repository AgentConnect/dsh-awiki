import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { liveCaseIds, plannedLiveCaseIds } from './case-ids.ts'
import { mailRecoveryObservabilityLiveCase } from './mail-recovery-observability-case-contract.ts'

describe('DSH Web Mail Recovery observability coverage boundary', () => {
  it('binds the executable live case to the local lifecycle and secrecy coverage', async () => {
    const [hostSource, projectionSource, owningTests, routingTests, liveSpec, runner] = await Promise.all([
      readFile(new URL('../../../src/index.ts', import.meta.url), 'utf8'),
      readFile(new URL('../../../src/mail-recovery-observability.ts', import.meta.url), 'utf8'),
      readFile(new URL('../../../tests/recovery-mail-continuity.spec.ts', import.meta.url), 'utf8'),
      readFile(new URL('../../../tests/mail-list-client.spec.ts', import.meta.url), 'utf8'),
      readFile(new URL('../specs/live-mail-recovery.spec.ts', import.meta.url), 'utf8'),
      readFile(new URL('./run-e2e.ts', import.meta.url), 'utf8'),
    ])

    expect(mailRecoveryObservabilityLiveCase.caseId).toBe('DSH-WEB-MAIL-RECOVERY-001')
    expect(plannedLiveCaseIds).not.toContain(mailRecoveryObservabilityLiveCase.caseId)
    expect(liveCaseIds).toContain(mailRecoveryObservabilityLiveCase.caseId)
    expect(mailRecoveryObservabilityLiveCase.status).toBe('active')
    expect(mailRecoveryObservabilityLiveCase.preconditions).toHaveLength(3)
    expect(mailRecoveryObservabilityLiveCase.action).toHaveLength(3)
    expect(mailRecoveryObservabilityLiveCase.exactOracles).toHaveLength(6)
    expect(mailRecoveryObservabilityLiveCase.negativeChecks).toHaveLength(2)
    expect(mailRecoveryObservabilityLiveCase.cleanup).toHaveLength(2)
    expect(mailRecoveryObservabilityLiveCase.blockedOracle).toMatchObject({
      status: 'blocked', code: 'no_dsh_core_outbound_attachment_send_seam',
    })
    expect(mailRecoveryObservabilityLiveCase.evidenceType).toContain('secret_scan')
    expect(mailRecoveryObservabilityLiveCase.evidenceType).toContain('sanitized_dsh_run_report')
    expect(mailRecoveryObservabilityLiveCase.evidenceType).toContain('mail_recovery_server_receipt')
    expect(mailRecoveryObservabilityLiveCase.action.join(' ')).toContain('Clear Local Data')
    expect(mailRecoveryObservabilityLiveCase.action.join(' ')).toContain('historical sent detail')
    expect(mailRecoveryObservabilityLiveCase.exactOracles.join(' ')).toContain('Restart')
    expect(mailRecoveryObservabilityLiveCase.exactOracles.join(' ')).toContain('direction=outbound')
    expect(mailRecoveryObservabilityLiveCase.cleanup.join(' ')).toContain('residual')
    expect(hostSource).toContain('this.sessionRevision !== requestGeneration')
    expect(hostSource).toContain('failedMailRecoveryObservability(error)')
    expect(projectionSource).toContain("mail_closed_classification: 'unknown'")
    expect(projectionSource).toContain('STABLE_MACHINE_CODE')
    expect(owningTests).toContain('drops a late Mail completion after provider generation replacement')
    expect(owningTests).toContain('fences a pending Mail completion as soon as sign-out is requested')
    expect(owningTests).toContain('fences sign-out requested while the recovered identity lookup is pending')
    expect(owningTests).toContain('fences a queued Recovery callback when sign-out is requested before it enters')
    expect(owningTests).toContain('fences a pending Mail completion before Clear Local Data runs')
    expect(owningTests).toContain('fences Clear Local Data requested while the recovered identity lookup is pending')
    expect(owningTests).toContain('fences a queued Recovery callback when Clear Local Data is requested before it enters')
    expect(owningTests).toContain('drops a pending Mail completion when the Host service unloads')
    expect(owningTests).toContain('does not persist a receipt and makes a fresh Mail first-use request after restart')
    expect(owningTests).toContain('raw_error_body')
    expect(routingTests).toContain('routes sent history only through mail.list(direction=outbound)')
    expect(routingTests).toContain('keeps HTTP %s as a stable error instead of an empty sent page')
    expect(liveSpec).toContain('[DSH-WEB-MAIL-RECOVERY-001]')
    expect(liveSpec).toContain('restoreVisibleMailHistory')
    expect(runner).toContain('collectMailServerReceipt')
  })
})
