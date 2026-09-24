import { test, expect } from '../fixtures/test.ts'
import { loadProtectedE2eConfig } from '../fixtures/protected-config.ts'
import { readLiveHandoff } from '../fixtures/live-handoff.ts'
import { CliPeer } from '../fixtures/cli-peer.ts'
import { completeHarnessBusinessEntry } from '../pages/harness-shell.ts'
import { openAwiki } from '../pages/awiki-conversation-page.ts'
import { openVisibleHistoricalMailDetail, sendVisibleMail } from '../pages/awiki-recovery-page.ts'

// Mail bodies and mailbox addresses must not be retained in Browser artifacts.
test.use({ trace: 'off', screenshot: 'off', video: 'off' })

async function mailContext() {
  const configPath = process.env.DSH_AWIKI_E2E_CONFIG
  const runId = process.env.DSH_AWIKI_E2E_RUN_ID
  if (configPath === undefined || runId === undefined) {
    throw new Error('DSH E2E live Mail environment is incomplete')
  }
  const config = await loadProtectedE2eConfig(configPath)
  const handoff = await readLiveHandoff()
  const suffix = `.${config.targetBinding.didDomain}`
  if (!handoff.dsh.handle.endsWith(suffix)) throw new Error('DSH E2E Mail Handle domain does not match')
  const dshAddress = `${handoff.dsh.handle.slice(0, -suffix.length)}@${config.targetBinding.didDomain}`
  const cli = CliPeer.reopen(config, handoff.cli)
  const cliAddress = `${handoff.cli.handle}@${config.targetBinding.didDomain}`
  if (await cli.mailAccountAddress() !== cliAddress) {
    throw new Error('DSH E2E CLI Mail account is outside the run-owned mailbox')
  }
  return { cli, cliAddress, dshAddress, runId }
}

test('[DSH-WEB-MAIL-001] DSH Web sent mail reaches the independent CLI mailbox exactly once', async ({ browser, harness }) => {
  test.setTimeout(4 * 60_000)
  const { cli, cliAddress, dshAddress, runId } = await mailContext()
  const subject = `dsh-to-cli-mail-${runId}`
  const body = `Delivery from DSH Web to the CLI mailbox: ${runId}`
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  try {
    const page = await context.newPage()
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' })
    await completeHarnessBusinessEntry(page)
    await openAwiki(page)
    await page.getByRole('tab', { name: /^邮件/u }).click()
    await expect(page.getByRole('complementary', { name: '邮箱导航' }).getByText(dshAddress, { exact: true }).first()).toBeVisible()

    await sendVisibleMail(page, cliAddress, subject, body)
    await cli.waitForMail({ subject, body, to: cliAddress, from: dshAddress })
    await openVisibleHistoricalMailDetail(page, '发件箱', subject, body)
    await expect(page.getByRole('region', { name: '邮件详情' }).getByText(cliAddress, { exact: true })).toBeVisible()
  } finally {
    await context.close()
  }
})

test('[DSH-WEB-MAIL-002] CLI mail arrives in DSH Web and read state survives a fresh Browser context', async ({ browser, harness }) => {
  test.setTimeout(4 * 60_000)
  const { cli, cliAddress, dshAddress, runId } = await mailContext()
  const subject = `cli-to-dsh-mail-${runId}`
  const body = `Delivery from CLI to DSH Web: ${runId}`
  let context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  try {
    let page = await context.newPage()
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' })
    await completeHarnessBusinessEntry(page)
    await openAwiki(page)
    await page.getByRole('tab', { name: /^邮件/u }).click()
    await expect(page.getByRole('complementary', { name: '邮箱导航' }).getByText(dshAddress, { exact: true }).first()).toBeVisible()

    await cli.sendMail(dshAddress, subject, body)
    const inbox = page.getByRole('region', { name: '收件箱' })
    const row = inbox.getByRole('button').filter({ hasText: subject })
    await expect(async () => {
      await page.getByRole('button', { name: '刷新收件箱' }).click()
      await expect(row).toHaveCount(1)
    }).toPass({ timeout: 120_000, intervals: [1_000, 2_000, 5_000] })
    await expect(row).toHaveAttribute('data-unread', 'true')
    await row.click()
    const detail = page.getByRole('region', { name: '邮件详情' })
    await expect(detail.getByText(body, { exact: true })).toBeVisible()
    await expect(detail.getByText(cliAddress, { exact: true })).toBeVisible()
    await page.getByRole('button', { name: '标为已读' }).click()
    await expect(row).not.toHaveAttribute('data-unread', 'true')

    await context.close()
    context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    page = await context.newPage()
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' })
    await completeHarnessBusinessEntry(page)
    await openAwiki(page)
    await page.getByRole('tab', { name: /^邮件/u }).click()
    const freshRow = page.getByRole('region', { name: '收件箱' }).getByRole('button').filter({ hasText: subject })
    await expect(freshRow).toHaveCount(1, { timeout: 60_000 })
    await expect(freshRow).not.toHaveAttribute('data-unread', 'true')
  } finally {
    await context.close().catch(() => undefined)
  }
})
