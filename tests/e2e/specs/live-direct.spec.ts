import { test, expect } from '../fixtures/test.ts'
import { loadProtectedE2eConfig } from '../fixtures/protected-config.ts'
import { readLiveHandoff } from '../fixtures/live-handoff.ts'
import { recordResource } from '../fixtures/resource-ledger.ts'
import { CliPeer } from '../fixtures/cli-peer.ts'
import { completeHarnessBusinessEntry } from '../pages/harness-shell.ts'
import {
  closeAwiki,
  openAwiki,
  openDirectConversation,
  sendVisibleText,
} from '../pages/awiki-conversation-page.ts'

test.describe.configure({ mode: 'serial' })

async function context() {
  const configPath = process.env.DSH_AWIKI_E2E_CONFIG
  const privateLedger = process.env.DSH_AWIKI_E2E_PRIVATE_LEDGER
  const runId = process.env.DSH_AWIKI_E2E_RUN_ID
  if (configPath === undefined || privateLedger === undefined || runId === undefined) {
    throw new Error('DSH E2E live Direct environment is incomplete')
  }
  const config = await loadProtectedE2eConfig(configPath)
  const handoff = await readLiveHandoff()
  return { config, handoff, privateLedger, runId, cli: CliPeer.reopen(config, handoff.cli) }
}

test('[DSH-WEB-DIRECT-001] DSH Web sends one exact Direct to the CLI peer', async ({ dshPage: page, harness }) => {
  const value = await context()
  const marker = `dsh-to-cli-${value.runId}`
  await page.goto(harness.url, { waitUntil: 'domcontentloaded' })
  await completeHarnessBusinessEntry(page)
  await openAwiki(page)
  await openDirectConversation(page, value.handoff.cli.handle)
  await sendVisibleText(page, marker)
  const messageId = await value.cli.waitForDirect({
    content: marker,
    senderDid: value.handoff.dsh.did,
    receiverDid: value.handoff.cli.did,
    peer: value.handoff.dsh.handle,
  })
  await recordResource(value.privateLedger, {
    kind: 'message',
    identifier: messageId,
    status: 'pending',
    reasonCode: 'created',
  })
  await closeAwiki(page)
})

test('[DSH-WEB-DIRECT-002] CLI peer delivery becomes one visible unread Direct in DSH Web', async ({ dshPage: page }) => {
  const value = await context()
  const marker = `cli-to-dsh-${value.runId}`
  const messageId = `msg-cli-to-dsh-${value.runId}`
  await expect(page.getByRole('button', { name: '打开 AWiki' })).toBeVisible()
  expect(await value.cli.sendDirect(value.handoff.dsh.did, marker, messageId)).toBe(messageId)
  await recordResource(value.privateLedger, {
    kind: 'message',
    identifier: messageId,
    status: 'pending',
    reasonCode: 'created',
  })
  const launcher = page.getByRole('button', { name: /打开 AWiki，1 条未读消息/u })
  await expect(launcher).toBeVisible({ timeout: 60_000 })
  await launcher.click()
  await expect(page.getByRole('dialog', { name: 'AWiki' })).toBeVisible()
  const received = page.locator(`[data-message-id="${messageId}"]`)
  await expect(received).toHaveCount(1)
  await expect(received.getByText(marker, { exact: true })).toHaveCount(1)
  await closeAwiki(page)
  await expect(page.getByRole('button', { name: '打开 AWiki' })).toBeVisible()
})
