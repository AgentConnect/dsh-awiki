import { lstat, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { test, expect } from '../fixtures/test.ts'
import { loadProtectedE2eConfig } from '../fixtures/protected-config.ts'
import { readLiveHandoff } from '../fixtures/live-handoff.ts'
import { recordResource } from '../fixtures/resource-ledger.ts'
import { CliPeer } from '../fixtures/cli-peer.ts'
import { startHarnessInstance } from '../fixtures/harness-instance.ts'
import { completeHarnessCopiedProfileEntry } from '../pages/harness-shell.ts'
import {
  clearVisibleLocalData,
  openVisibleHistoricalMailDetail,
  readClearedMailCacheCounts,
  recoverVisibleIdentity,
  registerVisibleIdentity,
  restoreVisibleMailHistory,
  seedMailCacheSentinel,
  sendVisibleMail,
} from '../pages/awiki-recovery-page.ts'
import { openAwiki } from '../pages/awiki-conversation-page.ts'

test('[DSH-WEB-MAIL-RECOVERY-001] Clear Local Data Recovery restores server inbox and outbound history', async ({ browser, harness }) => {
  test.setTimeout(12 * 60_000)
  const configPath = process.env.DSH_AWIKI_E2E_CONFIG
  const privateLedger = process.env.DSH_AWIKI_E2E_PRIVATE_LEDGER
  const runId = process.env.DSH_AWIKI_E2E_RUN_ID
  if (configPath === undefined || privateLedger === undefined || runId === undefined) {
    throw new Error('DSH E2E Mail Recovery environment is incomplete')
  }
  const config = await loadProtectedE2eConfig(configPath)
  const handoff = await readLiveHandoff()
  const observer = CliPeer.reopen(config, handoff.cli)
  const localHandle = `${config.handlePrefix}e${runId.slice(-8)}`
  const fullHandle = `${localHandle}.${config.targetBinding.didDomain}`
  const baselineSubject = `mail-recovery-baseline-${runId}`
  const postRecoverySubject = `mail-recovery-after-${runId}`
  const baselineBody = `echo ${baselineSubject}`
  await recordResource(privateLedger, {
    kind: 'identity', identifier: fullHandle, status: 'pending', reasonCode: 'planned_registration',
  })
  const mailHarness = await startHarnessInstance({ isolated: true, profileSource: harness.dshHome, target: config.targetBinding })
  let context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  try {
    let page = await context.newPage()
    await page.goto(mailHarness.url, { waitUntil: 'domcontentloaded' })
    await completeHarnessCopiedProfileEntry(page)
    await registerVisibleIdentity(page, localHandle, config)
    const previousDid = await observer.resolveDid(fullHandle)
    await sendVisibleMail(page, config.mailEchoRecipient, baselineSubject, baselineBody)
    await restoreVisibleMailHistory(page, baselineSubject, [baselineSubject])
    await openVisibleHistoricalMailDetail(page, '收件箱', baselineSubject, baselineBody)
    const beforeClearCache = await seedMailCacheSentinel(page)
    expect(beforeClearCache.mailKeys).toBeGreaterThanOrEqual(2)
    expect(beforeClearCache.unrelatedSentinelPresent).toBe(true)

    const retiredSentRoot = join(mailHarness.stateRoot, '.host', 'sent-mail-v1')
    await mkdir(retiredSentRoot, { recursive: true })
    await writeFile(join(retiredSentRoot, 'legacy.json'), '{}', { mode: 0o600 })
    await clearVisibleLocalData(page)
    expect(await readClearedMailCacheCounts(page)).toEqual({
      mailKeys: 0,
      unrelatedSentinelPresent: true,
    })
    await expect(lstat(retiredSentRoot)).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(page.getByRole('button', { name: 'AWiki 账户菜单' })).toBeHidden()
    await expect(page.getByRole('tab', { name: /^邮件/u })).toBeHidden()
    await recoverVisibleIdentity(page, localHandle, config)
    await expect.poll(() => observer.resolveDid(fullHandle), { timeout: 60_000 }).not.toBe(previousDid)
    await restoreVisibleMailHistory(page, baselineSubject, [baselineSubject])
    await openVisibleHistoricalMailDetail(page, '发件箱', baselineSubject, baselineBody)
    await sendVisibleMail(page, config.mailEchoRecipient, postRecoverySubject, `echo ${postRecoverySubject}`)

    await context.close()
    await mailHarness.pause()
    await mailHarness.restart()
    context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    page = await context.newPage()
    await page.goto(mailHarness.url, { waitUntil: 'domcontentloaded' })
    await completeHarnessCopiedProfileEntry(page)
    await openAwiki(page)
    await expect(page.getByText(fullHandle, { exact: true })).toBeVisible()
    await restoreVisibleMailHistory(page, baselineSubject, [baselineSubject, postRecoverySubject])
  } finally {
    await context.close().catch(() => undefined)
    await mailHarness.stop().catch(() => undefined)
  }
})
