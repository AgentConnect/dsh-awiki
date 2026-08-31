import { test, expect } from '../fixtures/test.ts'
import { completeHarnessFirstRun } from '../pages/harness-shell.ts'

test('[DSH-WEB-SMOKE-001] real Harness loads the AWiki Web launcher and identity entry', async ({ page, harness }) => {
  await page.goto(harness.url, { waitUntil: 'domcontentloaded' })
  await completeHarnessFirstRun(page)
  const launcher = page.getByRole('button', { name: '打开 AWiki' })
  await expect(launcher).toBeVisible()
  await launcher.click()
  await expect(page.getByRole('dialog', { name: 'AWiki' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '进入 AWiki' })).toBeVisible()
  await expect(page.getByRole('button', { name: '获取验证码' })).toBeVisible()
})
