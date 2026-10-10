import { test, expect } from '../fixtures/test.ts'
import { loadProtectedE2eConfig } from '../fixtures/protected-config.ts'
import { readLiveHandoff } from '../fixtures/live-handoff.ts'
import { recordResource } from '../fixtures/resource-ledger.ts'
import { CliPeer } from '../fixtures/cli-peer.ts'
import { publishPairIdentity, verifyAppGroupPair } from '../fixtures/app-group-pair.ts'
import { completeHarnessBusinessEntry } from '../pages/harness-shell.ts'
import { openAwiki, openDirectConversation, sendVisibleText, createGroup, inviteGroupMember } from '../pages/awiki-conversation-page.ts'

test('[DSH-WEB-ENCRYPTED-001] mixed Direct security, draft retention, actual locks, Host restart and encrypted Group', async ({ dshPage: page, harness }, testInfo) => {
  // This case includes Direct round trips, a Host restart and MLS creation/invitation.
  // Keep each operation's existing timeout; budget their sequential execution.
  test.setTimeout(process.env.AWIKI_E2E_PRODUCT_PAIR_DIR === undefined ? 480_000 : 20 * 60_000)
  const config = await loadProtectedE2eConfig(process.env.DSH_AWIKI_E2E_CONFIG!)
  const handoff = await readLiveHandoff()
  await publishPairIdentity(handoff.dsh)
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
  await expect(mode).toHaveAttribute('aria-pressed', 'false')
  const plain = `plain-${runId}`
  await sendVisibleText(page, plain)
  await record(await cli.waitForDirect({ content: plain, senderDid: handoff.dsh.did,
    receiverDid: handoff.cli.did, peer: handoff.dsh.handle, secure: false }))
  const secret = `encrypted-${runId}`
  await page.getByPlaceholder('输入消息').fill(secret)
  await mode.click()
  await expect(mode).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByPlaceholder('输入消息')).toHaveValue(secret)
  await page.getByRole('button', { name: '发送消息' }).click()
  const sentId = await cli.waitForDirect({ content: secret, senderDid: handoff.dsh.did,
    receiverDid: handoff.cli.did, peer: handoff.dsh.handle, secure: true })
  await record(sentId)
  await expect(page.locator(`[data-message-id="${sentId}"]`).getByRole('img', { name: '端到端加密' })).toBeVisible()
  await mode.click()
  await expect(mode).toHaveAttribute('aria-pressed', 'false')
  const reply = `encrypted-reply-${runId}`
  const replyId = await cli.sendDirect(handoff.dsh.did, reply, `msg-encrypted-${runId}`, true)
  await record(replyId)
  const received = page.locator(`[data-message-id="${replyId}"]`)
  await expect(received.getByText(reply, { exact: true })).toBeVisible({ timeout: 60_000 })
  await expect(received.getByRole('img', { name: '端到端加密' })).toBeVisible()
  // Wait for the Core read commit before stopping Host; then verify persistence
  // before selecting the conversation again (which would issue a new read).
  await expect(page.getByRole('button', { name: /条未读消息/u })).toHaveCount(0)
  await harness.pause()
  const url = await harness.restart()
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await completeHarnessBusinessEntry(page)
  await openAwiki(page)
  const peerName = `${handoff.cli.handle}.${config.targetBinding.didDomain}`
  const restoredConversation = page.getByRole('button').filter({
    has: page.getByText(peerName, { exact: true }),
  })
  await expect(restoredConversation).toHaveCount(1)
  await expect(restoredConversation).not.toHaveAttribute('aria-label', /条未读消息/u)
  await restoredConversation.click()
  await expect(mode).toHaveAttribute('aria-pressed', 'false')
  await expect(received.getByText(reply, { exact: true })).toHaveCount(1)
  await expect(received.getByRole('img', { name: '端到端加密' })).toBeVisible()

  const title = `secure-${runId.slice(-8)}`
  const groupDid = await createGroup(page, title, config.targetBinding.didDomain, true)
  await recordResource(process.env.DSH_AWIKI_E2E_PRIVATE_LEDGER!, {
    kind: 'group', identifier: groupDid, status: 'pending', reasonCode: 'created',
  })
  await inviteGroupMember(page, handoff.cli.handle)
  expect(await cli.waitForGroup(title, [handoff.dsh.did, handoff.cli.did])).toBe(groupDid)
  await expect(mode).toHaveCount(0)
  const groupText = `secure-group-${runId}`
  await sendVisibleText(page, groupText)
  await cli.primeDirectInbox()
  const groupMessageId = await cli.waitForGroupMessage(groupDid, {
    content: groupText, senderDid: handoff.dsh.did,
  })
  await record(groupMessageId)
  await expect(page.locator(`[data-message-id="${groupMessageId}"]`).getByRole('img', { name: '端到端加密' })).toHaveCount(0)
  // Reverse ownership: an already running external-identity DSH receives an invitation.
  // No publish-key-package or repair command is issued by this test.
  const reverseTitle = `incoming-${runId.slice(-8)}`
  const reverseDid = await cli.createSecureGroup(reverseTitle)
  await recordResource(process.env.DSH_AWIKI_E2E_PRIVATE_LEDGER!, {
    kind: 'group', identifier: reverseDid, status: 'pending', reasonCode: 'created',
  })
  await cli.inviteSecureMember(reverseDid, handoff.dsh.did)
  const reverseReply = `incoming-group-${runId}`
  const reverseId = await cli.sendGroup(reverseDid, reverseReply, `msg-incoming-${runId}`, true)
  await record(reverseId)
  await page.getByRole('button').filter({ has: page.getByText(reverseTitle, { exact: true }) }).click({ timeout: 60_000 })
  await expect(page.getByRole('log').getByText(reverseReply, { exact: true })).toBeVisible({ timeout: 60_000 })
  await expect(page.getByPlaceholder('输入消息')).toBeEnabled({ timeout: 60_000 })
  const reverseText = `dsh-member-${runId}`
  await sendVisibleText(page, reverseText)
  await cli.primeDirectInbox()
  await record(await cli.waitForGroupMessage(reverseDid, { content: reverseText, senderDid: handoff.dsh.did }))
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme })
    await page.setViewportSize({ width: 740, height: 800 })
    // Resize is delivered asynchronously to the draggable overlay. Capture only
    // after its complete frame fits the narrow viewport, in either theme.
    await expect.poll(async () => page.getByRole('dialog', { name: 'AWiki', exact: true }).evaluate(element => {
      const bounds = element.getBoundingClientRect()
      return bounds.left >= 0 && bounds.top >= 0
        && bounds.right <= window.innerWidth && bounds.bottom <= window.innerHeight
    })).toBe(true)
    await page.screenshot({ path: testInfo.outputPath(`encrypted-group-${colorScheme}.png`) })
  }
  await page.setViewportSize({ width: 1280, height: 800 })
  await verifyAppGroupPair(page, harness, config.targetBinding.didDomain)
})
