import { timingSafeEqual } from 'node:crypto'
import { test, expect } from '../fixtures/test.ts'
import { loadProtectedE2eConfig } from '../fixtures/protected-config.ts'
import { readLiveHandoff } from '../fixtures/live-handoff.ts'
import { startHarnessInstance } from '../fixtures/harness-instance.ts'
import { completeHarnessBusinessEntry, completeHarnessCopiedProfileEntry } from '../pages/harness-shell.ts'
import { openAwiki } from '../pages/awiki-conversation-page.ts'

test('[DSH-WEB-MULTI-DEVICE-001] ready-admin Web UI approves an isolated DSH member', async ({ browser, dshPage: admin, harness }) => {
  test.setTimeout(5 * 60_000)
  const configPath = process.env.DSH_AWIKI_E2E_CONFIG
  if (configPath === undefined) throw new Error('DSH E2E multi-device config is missing')
  const config = await loadProtectedE2eConfig(configPath)
  const handoff = await readLiveHandoff()
  const localHandle = handoff.dsh.handle.replace(/\.rwiki\.cn$/u, '')
  const joinerHarness = await startHarnessInstance({ isolated: true, profileSource: harness.dshHome })
  const joinerContext = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  try {
    const joiner = await joinerContext.newPage()
    await joiner.goto(joinerHarness.url, { waitUntil: 'domcontentloaded' })
    await completeHarnessCopiedProfileEntry(joiner)
    await openAwiki(joiner)
    await joiner.getByLabel('Handle').fill(localHandle)
    await joiner.getByLabel('手机号').fill(config.phone)
    await joiner.getByRole('button', { name: '获取验证码' }).click()
    await joiner.getByLabel('注册验证码').fill(config.otp)
    await joiner.getByRole('button', { name: '继续' }).click()
    await joiner.getByRole('button', { name: '加入新设备（推荐）' }).click()

    await admin.goto(harness.url, { waitUntil: 'domcontentloaded' })
    await completeHarnessBusinessEntry(admin)
    await openAwiki(admin)
    await admin.getByRole('tab', { name: '设备' }).click()
    await admin.getByRole('button', { name: '开始验证' }).click()

    const joinerSas = await joiner.locator('strong').filter({ hasText: /^\d{6}$/u }).textContent({ timeout: 60_000 })
    const adminSas = await admin.locator('strong').filter({ hasText: /^\d{6}$/u }).textContent({ timeout: 60_000 })
    if (joinerSas === null || adminSas === null
      || !timingSafeEqual(Buffer.from(joinerSas), Buffer.from(adminSas))) {
      throw new Error('DSH E2E Device Join SAS values do not match')
    }
    await admin.getByLabel('手机安全码').fill(joinerSas)
    await admin.getByLabel('批准确认词').fill('APPROVE')
    await admin.getByRole('button', { name: '批准为 member' }).click()
    await expect(joiner.getByRole('button', { name: 'AWiki 账户菜单' })).toBeVisible({ timeout: 60_000 })
    await expect(admin.getByText(/其他设备 · member · active/u)).toBeVisible({ timeout: 60_000 })
    await joiner.getByRole('tab', { name: '设备' }).click()
    await expect(joiner.getByText(/当前设备不是可用的管理设备/u)).toBeVisible()
  } finally {
    await joinerContext.close().catch(() => undefined)
    await joinerHarness.stop().catch(() => undefined)
  }
})
