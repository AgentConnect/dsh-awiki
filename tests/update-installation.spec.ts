import { describe, expect, it } from 'vitest'
import { checkInstallation, decodeInstallation, IDENTITY_PACKAGE } from '../src/update-installation.ts'

const requirements = { runtime_packages: { '@deepseek-ai/dsh-api-remotes': '0.1.5-rc.1' },
  identity: { package_name: IDENTITY_PACKAGE, version: '0.1.3-rc.1', integrity: 'sha512-YQ==' }, requires_identity: '^0.1.3-rc.1' }
describe('independent DSH installation evidence', () => {
  it('requires verified installation metadata and exact compatible Host packages', () => {
    expect(checkInstallation(undefined)).toEqual({ blockedReason: 'installation-unverified' })
    expect(checkInstallation(decodeInstallation(requirements), { '@deepseek-ai/dsh-api-remotes': '0.1.1-rc.2' })).toEqual({ blockedReason: 'host-incompatible' })
    expect(checkInstallation(decodeInstallation(requirements), { '@deepseek-ai/dsh-api-remotes': '0.1.5-rc.1', [IDENTITY_PACKAGE]: '0.1.3-rc.1' })).toEqual({})
  })
  it('includes an exact Identity upgrade but never downgrades an incompatible Identity', () => {
    const host = { '@deepseek-ai/dsh-api-remotes': '0.1.5-rc.1' }
    expect(checkInstallation(decodeInstallation(requirements), host).identityTarget).toBe(`${IDENTITY_PACKAGE}@0.1.3-rc.1`)
    expect(checkInstallation(decodeInstallation(requirements), { ...host, [IDENTITY_PACKAGE]: '2.0.0' })).toEqual({ blockedReason: 'identity-incompatible' })
  })
  it('allows absent optional peers but validates their versions when installed', () => {
    const optional = { '@deepseek-ai/dsh-workspace': '0.1.5-rc.1' }
    const decoded = decodeInstallation({ ...requirements, optional_runtime_packages: optional })
    expect(decoded?.optional_runtime_packages).toEqual(optional)
    const installed = { '@deepseek-ai/dsh-api-remotes': '0.1.5-rc.1', [IDENTITY_PACKAGE]: '0.1.3-rc.1' }
    expect(checkInstallation(decoded, installed)).toEqual({})
    expect(checkInstallation(decoded, { ...installed, ...optional })).toEqual({})
    for (const version of ['0.1.1-rc.2', 'latest']) {
      expect(checkInstallation(decoded, { ...installed, '@deepseek-ai/dsh-workspace': version }))
        .toEqual({ blockedReason: 'host-incompatible' })
    }
    expect(checkInstallation(decoded, optional)).toEqual({ blockedReason: 'host-incompatible' })
  })
  it('rejects malformed or overlapping optional requirements', () => {
    for (const optional of [null, [], { '../../secret': '1.0.0' },
      { '@deepseek-ai/dsh-workspace': '^0.1.5' }, requirements.runtime_packages]) {
      expect(() => decodeInstallation({ ...requirements, optional_runtime_packages: optional })).toThrow()
    }
  })
  it('rejects arbitrary package paths, unsafe versions and contradictory identity metadata', () => {
    expect(() => decodeInstallation({ ...requirements, runtime_packages: { '../../secret': '1.0.0' } })).toThrow()
    expect(() => decodeInstallation({ ...requirements, runtime_packages: { '@deepseek-ai/dsh-api-remotes': 'latest' } })).toThrow()
    expect(() => decodeInstallation({ ...requirements, requires_identity: '^2.0.0' })).toThrow()
  })
})
