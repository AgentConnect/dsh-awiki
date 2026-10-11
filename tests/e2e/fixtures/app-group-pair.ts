import { readFile, writeFile, rename } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, type Page } from '@playwright/test'
import type { HarnessInstance } from './harness-instance.ts'
import { recordResource } from './resource-ledger.ts'
import { completeHarnessBusinessEntry } from '../pages/harness-shell.ts'
import { openAwiki, createGroup, inviteGroupMember, sendVisibleText } from '../pages/awiki-conversation-page.ts'

// This opt-in bridge shares only public identities, group IDs and fixture markers.
// Each owning product runner retains its own credentials, runtime and cleanup.
export async function publishPairIdentity(identity: { did: string; handle: string }): Promise<void> {
  const root = process.env.AWIKI_E2E_PRODUCT_PAIR_DIR
  if (root === undefined) return
  await publish(root, 'dsh.json', identity)
}

async function publish(root: string, name: string, value: object): Promise<void> {
  await writeFile(join(root, `${name}.tmp`), JSON.stringify(value), { mode: 0o600 })
  await rename(join(root, `${name}.tmp`), join(root, name))
}

async function wait(root: string, name: string): Promise<Record<string, string>> {
  const deadline = Date.now() + 12 * 60_000
  while (Date.now() < deadline) {
    try { return JSON.parse(await readFile(join(root, name), 'utf8')) as Record<string, string> }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error(`APP/DSH public handoff timed out: ${name}`)
}

export async function verifyAppGroupPair(page: Page, harness: HarnessInstance, domain: string): Promise<void> {
  const root = process.env.AWIKI_E2E_PRODUCT_PAIR_DIR
  if (root === undefined) return
  const app = await wait(root, 'app.json')
  const title = app.groupName!
  await page.getByRole('button').filter({ has: page.getByText(title, { exact: true }) }).click({ timeout: 60_000 })
  const log = page.getByRole('log', { name: '消息记录' })
  await expect(log.getByText('pair-app-text', { exact: true })).toBeVisible({ timeout: 60_000 })
  await expect(page.getByPlaceholder('输入消息')).toBeEnabled({ timeout: 60_000 })
  const downloadEvent = page.waitForEvent('download')
  await log.getByRole('button', { name: /pair-app.txt/u }).click({ timeout: 60_000 })
  const download = await downloadEvent
  const path = await download.path()
  expect(path).not.toBeNull()
  expect(await readFile(path!, 'utf8')).toBe('pair app encrypted attachment\n')
  await sendVisibleText(page, 'pair-dsh-text')
  await page.getByLabel('选择一个附件').setInputFiles({
    name: 'pair-dsh.txt', mimeType: 'text/plain', buffer: Buffer.from('pair dsh encrypted attachment\n'),
  })
  await sendVisibleText(page, 'pair-dsh-attachment')
  await expect(log.getByText('pair-scripted-agent', { exact: true })).toBeVisible({ timeout: 60_000 })
  await wait(root, 'app-received.json')
  await harness.pause()
  await page.goto(await harness.restart(), { waitUntil: 'domcontentloaded' })
  await completeHarnessBusinessEntry(page)
  await openAwiki(page)
  await page.getByRole('button').filter({ has: page.getByText(title, { exact: true }) }).click()
  await expect(log.getByText('pair-dsh-text', { exact: true })).toHaveCount(1)
  await expect(log.getByText('pair-app-text', { exact: true })).toHaveCount(1)
  const reverseName = `pair-${process.env.DSH_AWIKI_E2E_RUN_ID!.slice(-8)}`
  const groupDid = await createGroup(page, reverseName, domain, true)
  await recordResource(process.env.DSH_AWIKI_E2E_PRIVATE_LEDGER!, {
    kind: 'group', identifier: groupDid, status: 'pending', reasonCode: 'created',
  })
  await inviteGroupMember(page, app.handle!)
  await sendVisibleText(page, 'pair-reverse-dsh')
  await publish(root, 'reverse.json', { groupDid, groupName: reverseName })
  await expect(log.getByText('pair-reverse-app', { exact: true })).toBeVisible({ timeout: 120_000 })
  await publish(root, 'dsh-complete.json', { passed: true })
  await wait(root, 'app-complete.json')
}
