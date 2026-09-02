export const smokeCaseIds = ['DSH-WEB-SMOKE-001'] as const
export const liveCaseIds = [
  'DSH-WEB-DIRECT-001',
  'DSH-WEB-DIRECT-002',
  'DSH-WEB-GROUP-001',
  'DSH-WEB-RESTART-001',
  'DSH-WEB-MULTI-DEVICE-001',
  'DSH-WEB-RECOVERY-001',
  'DSH-WEB-MODEL-RECOVERY-001',
  'DSH-WEB-MAIL-RECOVERY-001',
] as const

export const plannedLiveCaseIds = [] as const

export type E2eRunMode = 'smoke' | 'smoke-webkit' | 'live'

/** Resolve the exact required report set for one reviewed runner selection. */
export function requiredCaseIds(mode: E2eRunMode, args: readonly string[]): readonly string[] {
  if (mode !== 'live') return smokeCaseIds
  const grepIndex = args.findIndex(value => value === '--grep')
  const grep = grepIndex >= 0 ? args[grepIndex + 1] : args.find(value => value.startsWith('--grep='))?.slice(7)
  if (grep === undefined) return liveCaseIds
  if (/model-recovery/iu.test(grep)) return ['DSH-WEB-MODEL-RECOVERY-001']
  if (/mail-recovery/iu.test(grep)) return ['DSH-WEB-MAIL-RECOVERY-001']
  if (/direct/iu.test(grep)) return liveCaseIds.slice(0, 2)
  if (/group/iu.test(grep)) return [liveCaseIds[2]]
  if (/restart/iu.test(grep)) return [liveCaseIds[3]]
  if (/multi-device|device/iu.test(grep)) return [liveCaseIds[4]]
  if (/recovery/iu.test(grep)) return liveCaseIds.slice(5)
  throw new Error('DSH E2E live grep does not select a reviewed case scope')
}
