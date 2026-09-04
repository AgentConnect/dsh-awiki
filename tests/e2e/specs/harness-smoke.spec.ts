import { test, expect } from '../fixtures/test.ts'
import { closeHarnessSettings, completeHarnessFirstRun, openAwikiSettings } from '../pages/harness-shell.ts'

test('[DSH-WEB-SMOKE-001] real Harness loads the AWiki Web launcher and identity entry', async ({ page, harness }) => {
  await page.goto(harness.url, { waitUntil: 'domcontentloaded' })
  await completeHarnessFirstRun(page)
  const launcher = page.getByRole('button', { name: '打开 AWiki' })
  await expect(launcher).toBeVisible()

  await openAwikiSettings(page)
  await expect(page.getByRole('tab', { name: /^(?:租户|Tenant)$/u, selected: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: /^(?:设备|Devices)$/u })).toBeVisible()
  await expect(page.getByRole('tab', { name: /^(?:本地数据|Local data)$/u })).toBeVisible()
  await expect(page.getByRole('tab', { name: /^(?:临时消息集成|Guest integration)$/u })).toBeVisible()
  await page.getByRole('tab', { name: /^(?:设备|Devices)$/u }).click()
  await expect(page.getByText(/(?:登录 AWiki 后才能管理此安装关联的设备|Sign in to AWiki to manage devices associated with this installation)/u)).toBeVisible()
  await closeHarnessSettings(page)

  await launcher.click()
  await expect(page.getByRole('dialog', { name: 'AWiki' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '进入 AWiki' })).toBeVisible()
  await expect(page.getByRole('button', { name: '获取验证码' })).toBeVisible()
  await expect(page.getByRole('tab', { name: '设备' })).toHaveCount(0)
})
