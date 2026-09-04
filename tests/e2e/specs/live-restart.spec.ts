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

test('[DSH-WEB-RESTART-001] same-root Harness restart converges one offline Direct', async ({ browser, harness }) => {
  const configPath = process.env.DSH_AWIKI_E2E_CONFIG
  const privateLedger = process.env.DSH_AWIKI_E2E_PRIVATE_LEDGER
  const runId = process.env.DSH_AWIKI_E2E_RUN_ID
  if (configPath === undefined || privateLedger === undefined || runId === undefined) {
    throw new Error('DSH E2E live restart environment is incomplete')
  }
  const config = await loadProtectedE2eConfig(configPath)
  const handoff = await readLiveHandoff()
  const cli = CliPeer.reopen(config, handoff.cli)

  const beforeContext = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const before = await beforeContext.newPage()
  await before.goto(harness.url, { waitUntil: 'domcontentloaded' })
  await completeHarnessBusinessEntry(before)
  await openAwiki(before)
  await expect(before.getByText(handoff.dsh.handle, { exact: true })).toBeVisible()
  await openDirectConversation(before, handoff.cli.handle)
  await closeAwiki(before)
  await beforeContext.close()

  await harness.pause()
  const offlineMarker = `cli-offline-to-dsh-${runId}`
  const offlineMessageId = `msg-cli-offline-${runId}`
  expect(await cli.sendDirect(handoff.dsh.did, offlineMarker, offlineMessageId)).toBe(offlineMessageId)
  await recordResource(privateLedger, {
    kind: 'message',
    identifier: offlineMessageId,
    status: 'pending',
    reasonCode: 'created',
  })

  const restartedUrl = await harness.restart()
  const afterContext = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  try {
    const after = await afterContext.newPage()
    await after.goto(restartedUrl, { waitUntil: 'domcontentloaded' })
    await completeHarnessBusinessEntry(after)
    const launcher = after.getByRole('button', { name: /打开 AWiki，1 条未读消息/u })
    await expect(launcher).toBeVisible({ timeout: 60_000 })
    await launcher.click()
    await expect(after.getByRole('dialog', { name: 'AWiki' })).toBeVisible()
    await expect(after.getByText(handoff.dsh.handle, { exact: true })).toBeVisible()
    await after.getByRole('button', {
      name: `${handoff.cli.handle}.${config.targetBinding.didDomain}，1 条未读消息`,
      exact: true,
    }).click()
    const received = after.locator(`[data-message-id="${offlineMessageId}"]`)
    await expect(received).toHaveCount(1)
    await expect(received.getByText(offlineMarker, { exact: true })).toHaveCount(1)

    await after.getByRole('button', { name: '刷新 AWiki' }).click()
    await after.getByRole('button', { name: `${handoff.cli.handle}.${config.targetBinding.didDomain}` }).click()
    await expect(received).toHaveCount(1)
    const replyMarker = `dsh-after-restart-${runId}`
    await sendVisibleText(after, replyMarker)
    const replyMessageId = await cli.waitForDirect({
      content: replyMarker,
      senderDid: handoff.dsh.did,
      receiverDid: handoff.cli.did,
      peer: handoff.dsh.handle,
    })
    await recordResource(privateLedger, {
      kind: 'message',
      identifier: replyMessageId,
      status: 'pending',
      reasonCode: 'created',
    })
    await closeAwiki(after)
  } finally {
    await afterContext.close()
  }
})
