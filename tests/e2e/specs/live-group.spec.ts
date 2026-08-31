import { test, expect } from '../fixtures/test.ts'
import { loadProtectedE2eConfig } from '../fixtures/protected-config.ts'
import { readLiveHandoff } from '../fixtures/live-handoff.ts'
import { recordResource } from '../fixtures/resource-ledger.ts'
import { CliPeer } from '../fixtures/cli-peer.ts'
import { completeHarnessBusinessEntry } from '../pages/harness-shell.ts'
import {
  closeAwiki,
  createGroup,
  inviteGroupMember,
  openAwiki,
  sendVisibleText,
} from '../pages/awiki-conversation-page.ts'

test('[DSH-WEB-GROUP-001] DSH Web and CLI peer exchange one exact Group message each', async ({ page, harness }) => {
  const configPath = process.env.DSH_AWIKI_E2E_CONFIG
  const privateLedger = process.env.DSH_AWIKI_E2E_PRIVATE_LEDGER
  const runId = process.env.DSH_AWIKI_E2E_RUN_ID
  if (configPath === undefined || privateLedger === undefined || runId === undefined) {
    throw new Error('DSH E2E live Group environment is incomplete')
  }
  const config = await loadProtectedE2eConfig(configPath)
  const handoff = await readLiveHandoff()
  const cli = CliPeer.reopen(config, handoff.cli)
  const title = `dsh-e2e-${runId.slice(-8)}`

  await page.goto(harness.url, { waitUntil: 'domcontentloaded' })
  await completeHarnessBusinessEntry(page)
  await openAwiki(page)
  const groupDid = await createGroup(page, title)
  await recordResource(privateLedger, {
    kind: 'group',
    identifier: groupDid,
    status: 'pending',
    reasonCode: 'created',
  })

  await cli.assertGroupSendRejected(
    groupDid,
    `non-member-${runId}`,
    `msg-non-member-${runId}`,
  )
  await inviteGroupMember(page, handoff.cli.handle)
  expect(await cli.waitForGroup(title, [handoff.dsh.did, handoff.cli.did])).toBe(groupDid)

  const dshMarker = `dsh-group-to-cli-${runId}`
  await sendVisibleText(page, dshMarker)
  const dshMessageId = await cli.waitForGroupMessage(groupDid, {
    content: dshMarker,
    senderDid: handoff.dsh.did,
  })
  await recordResource(privateLedger, {
    kind: 'message',
    identifier: dshMessageId,
    status: 'pending',
    reasonCode: 'created',
  })

  const cliMarker = `cli-group-to-dsh-${runId}`
  const cliMessageId = await cli.sendGroup(groupDid, cliMarker, `msg-cli-group-${runId}`)
  await recordResource(privateLedger, {
    kind: 'message',
    identifier: cliMessageId,
    status: 'pending',
    reasonCode: 'created',
  })
  const received = page.locator(`[data-message-id="${cliMessageId}"]`)
  await expect(received).toHaveCount(1, { timeout: 60_000 })
  await expect(received.getByText(cliMarker, { exact: true })).toHaveCount(1)
  await expect(received.getByText(`${handoff.cli.handle}.rwiki.cn`, { exact: true })).toHaveCount(1)
  await closeAwiki(page)
})
