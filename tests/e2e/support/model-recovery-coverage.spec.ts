import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { liveCaseIds, plannedLiveCaseIds } from './case-ids.ts'
import { modelRecoveryLiveCase } from './model-recovery-case-contract.ts'

describe('DSH Web Model recovery coverage boundary', () => {
  it('keeps live Model continuity planned until a reviewed target and cleanup oracle exist', async () => {
    const modelSource = await readFile(
      new URL('../../../packages/dsh-model-proxy/src/index.ts', import.meta.url),
      'utf8',
    )

    expect(plannedLiveCaseIds).toEqual([
      'DSH-WEB-MODEL-RECOVERY-001',
      'DSH-WEB-MAIL-RECOVERY-001',
    ])
    expect(liveCaseIds).not.toContain('DSH-WEB-MODEL-RECOVERY-001')
    expect(modelRecoveryLiveCase.caseId).toBe('DSH-WEB-MODEL-RECOVERY-001')
    expect(modelRecoveryLiveCase.status).toBe('planned')
    expect(modelRecoveryLiveCase.preconditions).toHaveLength(3)
    expect(modelRecoveryLiveCase.action).toHaveLength(3)
    expect(modelRecoveryLiveCase.exactOracles).toHaveLength(6)
    expect(modelRecoveryLiveCase.negativeChecks).toHaveLength(1)
    expect(modelRecoveryLiveCase.cleanup).toHaveLength(3)
    expect(modelRecoveryLiveCase.evidenceType).toContain('secret_scan')
    expect(modelRecoveryLiveCase.exactOracles.join(' ')).toContain('Clear Local Data')
    expect(modelRecoveryLiveCase.exactOracles.join(' ')).toContain('actual no-charge model completion')
    expect(modelRecoveryLiveCase.cleanup.join(' ')).toContain('residual')
    expect(modelSource).toContain("new URL('/api/identity-recovery', config.baseURL)")
    expect(modelSource).toContain("body: '{}'")
    expect(modelSource).toContain('identityReady')
    expect(modelSource).toContain('advanceIdentityGeneration')
  })
})
