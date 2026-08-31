import { lstat, readFile, writeFile } from 'node:fs/promises'
import type { CliPeerState } from './cli-peer.ts'

export interface LiveHandoff {
  readonly schemaVersion: 1
  readonly runId: string
  readonly dsh: {
    readonly handle: string
    readonly did: string
  }
  readonly cli: CliPeerState
}

function handoffPath(): string {
  const path = process.env.DSH_AWIKI_E2E_HANDOFF
  if (path === undefined) throw new Error('DSH E2E live handoff path is unavailable')
  return path
}

export async function writeLiveHandoff(value: LiveHandoff): Promise<void> {
  await writeFile(handoffPath(), `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
    flag: 'wx',
  })
}

export async function readLiveHandoff(): Promise<LiveHandoff> {
  const path = handoffPath()
  const metadata = await lstat(path)
  if (!metadata.isFile() || metadata.isSymbolicLink() || (metadata.mode & 0o777) !== 0o600) {
    throw new Error('DSH E2E live handoff is not a private regular file')
  }
  const value = JSON.parse(await readFile(path, 'utf8')) as LiveHandoff
  if (
    value.schemaVersion !== 1
    || value.runId !== process.env.DSH_AWIKI_E2E_RUN_ID
    || value.dsh?.handle === undefined
    || value.dsh.did === undefined
    || value.cli?.handle === undefined
    || value.cli.did === undefined
  ) throw new Error('DSH E2E live handoff is invalid')
  return value
}
