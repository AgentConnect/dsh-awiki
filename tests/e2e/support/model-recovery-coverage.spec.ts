import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { liveCaseIds, plannedLiveCaseIds } from './case-ids.ts'
import { modelRecoveryLiveCase } from './model-recovery-case-contract.ts'

describe('DSH Web Model recovery coverage boundary', () => {
  it('binds executable Model continuity to the actual outcome-only consumer contract', async () => {
    const [modelSource, liveSpec] = await Promise.all([
      readFile(new URL('../../../packages/dsh-model-proxy/src/index.ts', import.meta.url), 'utf8'),
      readFile(new URL('../specs/live-model-recovery.spec.ts', import.meta.url), 'utf8'),
    ])

    expect(plannedLiveCaseIds).toEqual([])
    expect(liveCaseIds).toContain('DSH-WEB-MODEL-RECOVERY-001')
    expect(modelRecoveryLiveCase.caseId).toBe('DSH-WEB-MODEL-RECOVERY-001')
    expect(modelRecoveryLiveCase.status).toBe('active')
    expect(modelRecoveryLiveCase.preconditions).toHaveLength(3)
    expect(modelRecoveryLiveCase.action).toHaveLength(3)
    expect(modelRecoveryLiveCase.exactOracles).toHaveLength(6)
    expect(modelRecoveryLiveCase.negativeChecks).toHaveLength(1)
    expect(modelRecoveryLiveCase.cleanup).toHaveLength(3)
    expect(modelRecoveryLiveCase.evidenceType).toContain('secret_scan')
    expect(modelRecoveryLiveCase.evidenceType).toContain('sanitized_dsh_run_report')
    expect(modelRecoveryLiveCase.evidenceType).toContain('model_recovery_server_receipt')
    expect(modelRecoveryLiveCase.action.join(' ')).toContain('Clear Local Data')
    expect(modelRecoveryLiveCase.exactOracles.join(' ')).toContain('pre-Recovery completion')
    expect(modelRecoveryLiveCase.cleanup.join(' ')).toContain('residual')
    expect(modelSource).toContain("new URL('/api/identity-recovery', config.baseURL)")
    expect(modelSource).toContain("body: '{}'")
    expect(modelSource).toContain('Object.keys(result).length === 1')
    expect(modelSource).not.toContain('IDENTITY_RECOVERY_ASSURANCES')
    expect(modelSource).toContain('identityReady')
    expect(modelSource).toContain('advanceIdentityGeneration')
    expect(liveSpec).toContain('[DSH-WEB-MODEL-RECOVERY-001]')
    expect(liveSpec).toContain('completeVisibleModelPrompt')
    expect(liveSpec).toContain('collectModelServerReceipt')
  })
})
