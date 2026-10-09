import { test, expect } from '../fixtures/test.ts'
import { loadProtectedE2eConfig } from '../fixtures/protected-config.ts'
import { readLiveHandoff } from '../fixtures/live-handoff.ts'
import { recordResource } from '../fixtures/resource-ledger.ts'
import { CliPeer } from '../fixtures/cli-peer.ts'
import { completeHarnessBusinessEntry } from '../pages/harness-shell.ts'
import { openAwiki, openDirectConversation, sendVisibleText } from '../pages/awiki-conversation-page.ts'

test('[DSH-WEB-ENCRYPTED-001] mixed Direct security, draft retention, actual locks and Host restart', async ({ dshPage: page, harness }) => {
  const config = await loadProtectedE2eConfig(process.env.DSH_AWIKI_E2E_CONFIG!)
  const handoff = await readLiveHandoff()
  const cli = CliPeer.reopen(config, handoff.cli)
  const runId = process.env.DSH_AWIKI_E2E_RUN_ID!
  const record = (id: string) => recordResource(process.env.DSH_AWIKI_E2E_PRIVATE_LEDGER!, {
    kind: 'message', identifier: id, status: 'pending', reasonCode: 'created',
  })
  await page.goto(harness.url, { waitUntil: 'domcontentloaded' })
  await completeHarnessBusinessEntry(page)
  await openAwiki(page)
  await openDirectConversation(page, handoff.cli.handle)
  const mode = page.getByRole('button', { name: '消息安全类型' })
  await expect(mode).toHaveText('普通消息')
  const plain = `plain-${runId}`
  await sendVisibleText(page, plain)
  await record(await cli.waitForDirect({ content: plain, senderDid: handoff.dsh.did,
    receiverDid: handoff.cli.did, peer: handoff.dsh.handle, secure: false }))
  const secret = `encrypted-${runId}`
  await page.getByPlaceholder('输入消息').fill(secret)
  await mode.click()
  await expect(mode).toHaveText('加密消息')
  await expect(page.getByPlaceholder('输入消息')).toHaveValue(secret)
  await page.getByRole('button', { name: '发送消息' }).click()
  const sentId = await cli.waitForDirect({ content: secret, senderDid: handoff.dsh.did,
    receiverDid: handoff.cli.did, peer: handoff.dsh.handle, secure: true })
  await record(sentId)
  await expect(page.locator(`[data-message-id="${sentId}"]`).getByRole('img', { name: '端到端加密' })).toBeVisible()
  await mode.click()
  await expect(mode).toHaveText('普通消息')
  const reply = `encrypted-reply-${runId}`
  const replyId = await cli.sendDirect(handoff.dsh.did, reply, `msg-encrypted-${runId}`, true)
  await record(replyId)
  const received = page.locator(`[data-message-id="${replyId}"]`)
  await expect(received.getByText(reply, { exact: true })).toBeVisible({ timeout: 60_000 })
  await expect(received.getByRole('img', { name: '端到端加密' })).toBeVisible()
  await harness.pause()
  const url = await harness.restart()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await completeHarnessBusinessEntry(page)
  await openAwiki(page)
  await page.getByRole('button', { name: `${handoff.cli.handle}.${config.targetBinding.didDomain}`, exact: true }).click()
  await expect(mode).toHaveText('普通消息')
  await expect(received.getByText(reply, { exact: true })).toHaveCount(1)
  await expect(received.getByRole('img', { name: '端到端加密' })).toBeVisible()
})
