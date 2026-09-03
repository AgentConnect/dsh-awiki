import { test, expect } from '../fixtures/test.ts'
import { loadProtectedE2eConfig } from '../fixtures/protected-config.ts'
import { readLiveHandoff } from '../fixtures/live-handoff.ts'
import { recordResource } from '../fixtures/resource-ledger.ts'
import { CliPeer } from '../fixtures/cli-peer.ts'
import { startHarnessInstance } from '../fixtures/harness-instance.ts'
import { completeHarnessCopiedProfileEntry } from '../pages/harness-shell.ts'
import { openAwiki } from '../pages/awiki-conversation-page.ts'
import { waitForRecoveryCompletion } from '../pages/awiki-recovery-page.ts'

test('[DSH-WEB-RECOVERY-001] Fresh Root Recovery replaces DID, fences old CLI, and survives restart', async ({ browser, harness }) => {
  test.setTimeout(6 * 60_000)
  const configPath = process.env.DSH_AWIKI_E2E_CONFIG
  const privateLedger = process.env.DSH_AWIKI_E2E_PRIVATE_LEDGER
  const sharedRoot = process.env.DSH_AWIKI_E2E_SHARED_ROOT
  const runId = process.env.DSH_AWIKI_E2E_RUN_ID
  if (configPath === undefined || privateLedger === undefined || sharedRoot === undefined || runId === undefined) {
    throw new Error('DSH E2E Recovery environment is incomplete')
  }
  const config = await loadProtectedE2eConfig(configPath)
  const handoff = await readLiveHandoff()
  const observer = CliPeer.reopen(config, handoff.cli)
  const localHandle = `${config.handlePrefix}r${runId.slice(-8)}`
  const fullHandle = `${localHandle}.${config.targetBinding.didDomain}`
  await recordResource(privateLedger, { kind: 'identity', identifier: fullHandle, status: 'pending', reasonCode: 'planned_registration' })
  const sourceHarness = await startHarnessInstance({ isolated: true, profileSource: harness.dshHome, target: config.targetBinding })
  let sourceContext = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  let sourcePage = await sourceContext.newPage()
  await sourcePage.goto(sourceHarness.url, { waitUntil: 'domcontentloaded' })
  await completeHarnessCopiedProfileEntry(sourcePage)
  await openAwiki(sourcePage)
  await sourcePage.getByLabel('Handle').fill(localHandle)
  await sourcePage.getByLabel('手机号').fill(config.phone)
  await sourcePage.getByRole('button', { name: '获取验证码' }).click()
  await sourcePage.getByLabel('注册验证码').fill(config.otp)
  await sourcePage.getByRole('button', { name: '继续' }).click()
  await expect(sourcePage.getByRole('button', { name: 'AWiki 账户菜单' })).toBeVisible({ timeout: 60_000 })
  const previousDid = await observer.resolveDid(fullHandle)
  await sourceContext.close()
  const recoveryHarness = await startHarnessInstance({ isolated: true, profileSource: harness.dshHome, target: config.targetBinding })
  let context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  try {
    let page = await context.newPage()
    await page.goto(recoveryHarness.url, { waitUntil: 'domcontentloaded' })
    await completeHarnessCopiedProfileEntry(page)
    await openAwiki(page)
    await page.getByLabel('Handle').fill(localHandle)
    await page.getByLabel('手机号').fill(config.phone)
    await page.getByRole('button', { name: '获取验证码' }).click()
    await page.getByLabel('注册验证码').fill(config.otp)
    await page.getByRole('button', { name: '继续' }).click()
    await page.getByRole('button', { name: '恢复 Handle（会替换 DID）' }).click()
    await context.close()
    await recoveryHarness.pause()
    const resumedRecoveryUrl = await recoveryHarness.restart()
    context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    page = await context.newPage()
    await page.goto(resumedRecoveryUrl, { waitUntil: 'domcontentloaded' })
    await completeHarnessCopiedProfileEntry(page)
    await openAwiki(page)
    await expect(page.getByRole('heading', { name: '验证身份归属' })).toBeVisible({ timeout: 60_000 })
    await page.getByLabel('绑定手机号').fill(config.phone)
    await page.getByLabel('恢复验证码').fill(config.otp)
    await page.getByRole('button', { name: '验证恢复信息' }).click()
    await page.getByRole('button', { name: '确认并恢复身份' }).click()
    await waitForRecoveryCompletion(page)
    await expect.poll(() => observer.resolveDid(fullHandle), { timeout: 60_000 }).not.toBe(previousDid)
    sourceContext = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    sourcePage = await sourceContext.newPage()
    await sourcePage.goto(sourceHarness.url, { waitUntil: 'domcontentloaded' })
    await completeHarnessCopiedProfileEntry(sourcePage)
    await openAwiki(sourcePage)
    await expect(sourcePage.getByRole('heading', { name: '需要重新恢复身份' })).toBeVisible({ timeout: 60_000 })

    await context.close()
    await recoveryHarness.pause()
    await recoveryHarness.restart()
    context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    page = await context.newPage()
    await page.goto(recoveryHarness.url, { waitUntil: 'domcontentloaded' })
    await completeHarnessCopiedProfileEntry(page)
    await expect(page.getByRole('button', { name: '打开 AWiki' })).toBeVisible()
    await openAwiki(page)
    await expect(page.getByText(fullHandle, { exact: true })).toBeVisible()
  } finally {
    await context.close().catch(() => undefined)
    await recoveryHarness.stop().catch(() => undefined)
    await sourceContext.close().catch(() => undefined)
    await sourceHarness.stop().catch(() => undefined)
  }
})
