import { test, expect } from '../fixtures/test.ts'
import { loadProtectedE2eConfig } from '../fixtures/protected-config.ts'
import { readLiveHandoff } from '../fixtures/live-handoff.ts'
import { recordResource } from '../fixtures/resource-ledger.ts'
import { CliPeer } from '../fixtures/cli-peer.ts'
import { startHarnessInstance } from '../fixtures/harness-instance.ts'
import { completeHarnessCopiedProfileEntry } from '../pages/harness-shell.ts'
import {
  clearVisibleLocalData,
  completeVisibleModelPrompt,
  recoverVisibleIdentity,
  registerVisibleIdentity,
} from '../pages/awiki-recovery-page.ts'
import { openAwiki } from '../pages/awiki-conversation-page.ts'

test('[DSH-WEB-MODEL-RECOVERY-001] Clear Local Data Recovery completes the real hosted model before and after restart', async ({ browser, harness }) => {
  test.setTimeout(12 * 60_000)
  const configPath = process.env.DSH_AWIKI_E2E_CONFIG
  const privateLedger = process.env.DSH_AWIKI_E2E_PRIVATE_LEDGER
  const runId = process.env.DSH_AWIKI_E2E_RUN_ID
  if (configPath === undefined || privateLedger === undefined || runId === undefined) {
    throw new Error('DSH E2E Model Recovery environment is incomplete')
  }
  const config = await loadProtectedE2eConfig(configPath)
  const handoff = await readLiveHandoff()
  const observer = CliPeer.reopen(config, handoff.cli)
  const localHandle = `${config.handlePrefix}m${runId.slice(-8)}`
  const fullHandle = `${localHandle}.rwiki.cn`
  await recordResource(privateLedger, {
    kind: 'identity', identifier: fullHandle, status: 'pending', reasonCode: 'planned_registration',
  })
  const modelHarness = await startHarnessInstance({
    isolated: true,
    profileSource: harness.dshHome,
    modelProxyUrl: config.modelProxyUrl,
  })
  let context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  try {
    let page = await context.newPage()
    await page.goto(modelHarness.url, { waitUntil: 'domcontentloaded' })
    await completeHarnessCopiedProfileEntry(page)
    await registerVisibleIdentity(page, localHandle, config)
    const previousDid = await observer.resolveDid(fullHandle)

    await clearVisibleLocalData(page)
    await expect(page.getByRole('button', { name: 'AWiki 账户菜单' })).toBeHidden()
    await expect(page.getByRole('tab', { name: /^邮件/u })).toBeHidden()
    await recoverVisibleIdentity(page, localHandle, config)
    await expect.poll(() => observer.resolveDid(fullHandle), { timeout: 60_000 }).not.toBe(previousDid)
    await completeVisibleModelPrompt(page, config.modelPrompt, config.modelExpectedText)

    await context.close()
    await modelHarness.pause()
    await modelHarness.restart()
    context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    page = await context.newPage()
    await page.goto(modelHarness.url, { waitUntil: 'domcontentloaded' })
    await completeHarnessCopiedProfileEntry(page)
    await openAwiki(page)
    await expect(page.getByText(fullHandle, { exact: true })).toBeVisible()
    await completeVisibleModelPrompt(page, config.modelPrompt, config.modelExpectedText)
  } finally {
    await context.close().catch(() => undefined)
    await modelHarness.stop().catch(() => undefined)
  }
})
