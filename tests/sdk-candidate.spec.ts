import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('AWiki IM Core Node development candidate', () => {
  it('resolves the published SDK without a repository-external link override', async () => {
    const workspace = await readFile(new URL('../pnpm-workspace.yaml', import.meta.url), 'utf8')
    const lockfile = await readFile(new URL('../pnpm-lock.yaml', import.meta.url), 'utf8')
    const externalLink = /['"]?@awiki\/im-core-node['"]?:\s*link:/u

    expect(workspace).not.toMatch(externalLink)
    expect(lockfile).not.toMatch(externalLink)
  })

  it('binds the plugin manifest and loaded facade to the coordinated 0.1.8 API', async () => {
    const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as {
      readonly dependencies: Record<string, string>
    }
    expect(manifest.dependencies['@awiki/im-core-node']).toBe('0.1.8')

    const wrapperEntry = fileURLToPath(import.meta.resolve('@awiki/im-core-node'))
    const wrapperRoot = join(dirname(wrapperEntry), '..')
    const installedWrapper = JSON.parse(await readFile(join(wrapperRoot, 'package.json'), 'utf8')) as {
      readonly version: string
    }
    const declaration = await readFile(join(wrapperRoot, 'dist', 'types.d.ts'), 'utf8')
    expect(installedWrapper.version).toBe('0.1.8')
    for (const method of [
      'getMailAccount',
      'listMailInbox',
      'readMail',
      'markMailRead',
      'sendMail',
      'requestHandleRecoveryOtp',
      'prepareHandleRecovery',
      'activateHandleRecovery',
      'getHandleRecoveryStatus',
      'resumeHandleRecovery',
      'discardHandleRecovery',
      'issueHandleRecoveryAttestation',
      'listLocalDeviceJoinSessions',
      'cancelPreparedRegistrationJoin',
      'getCurrentDeviceSummary',
      'getDeviceRegistry',
      'listLocalDeviceJoinRequests',
      'startDeviceJoinVerification',
      'prepareDeviceJoinApproval',
      'confirmDeviceJoinApproval',
      'rejectDeviceJoin',
      'revokeDevice',
    ]) {
      expect(declaration).toContain(`${method}(`)
    }
  })
})
