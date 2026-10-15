import { readFile, lstat } from 'node:fs/promises'
import { test, expect } from '@playwright/test'
import { completeHarnessFirstRun, openAwikiSettings, closeHarnessSettings } from '../pages/harness-shell.ts'

// The task provisioner owns a fresh isolated profile and real Open Server account.
// This case drives the ordinary product UI; it never injects authentication state.
// Official OTP is never retained in trace, video or automatic failure images.
test.use({ trace: 'off', screenshot: 'off', video: 'off' })
test('[DSH-WEB-CAPABILITY-001] declared registration and message feature explanation', async ({ page }, testInfo) => {
  const path = process.env.DSH_CAPABILITY_FIXTURE
  if (!path) throw new Error('Explicit candidate fixture is required')
  const info = await lstat(path)
  if (!info.isFile() || info.isSymbolicLink() || (info.mode & 0o077) !== 0) throw new Error('Protected fixture required')
  const fixture = JSON.parse(await readFile(path, 'utf8')) as { url: string; handle: string; origin: string; phone?: string; otp?: string }
  const url = new URL(fixture.url)
  const official = fixture.origin === 'https://backend-adapt.anpclaw.com'
  if (url.hostname !== '127.0.0.1' || url.protocol !== 'http:' || (!official && fixture.origin !== 'https://openserver-adapt.anpclaw.com')) throw new Error('Task candidate only')
  if (official && (!fixture.phone || !/^\d{6}$/u.test(fixture.otp ?? ''))) throw new Error('Official verification fixture required')
  await page.goto(url.href)
  await completeHarnessFirstRun(page)
  await page.getByRole('button', { name: '打开 AWiki' }).click()
  if (official) {
    await expect(page.getByLabel('手机号', { exact: true })).toBeVisible()
  } else {
    await expect(page.getByText('此服务器使用用户名注册，无需手机号或验证码。')).toBeVisible()
    await expect(page.getByLabel('手机号', { exact: true })).toHaveCount(0)
  }
  await page.screenshot({ path: testInfo.outputPath('registration.png') })
  await page.getByLabel('Handle', { exact: true }).fill(fixture.handle)
  if (official) {
    await page.getByLabel('手机号', { exact: true }).fill(fixture.phone!)
    await page.getByRole('button', { name: '获取验证码' }).click()
    await page.getByLabel('注册验证码').fill(fixture.otp!)
  }
  await page.getByRole('button', { name: '继续', exact: true }).click()
  if (official) await page.getByRole('dialog', { name: '确认创建 AWiki 身份' }).getByRole('button', { name: '确认并继续' }).click()
  await expect(page.getByRole('heading', { name: '进入 AWiki', exact: true })).toHaveCount(0, { timeout: 45_000 })
  await openAwikiSettings(page)
  if (!official) await expect(page.getByRole('tab', { name: /^(?:临时消息集成|Guest integration)$/u })).toHaveCount(0)
  await page.getByRole('tab', { name: /^(?:服务器功能|Server features)$/u }).click()
  const encryptionText = official
    ? /(?:加密聊天|Encrypted chats): (?:可用|Available)$/u
    : /(?:加密聊天|Encrypted chats): (?:此服务器暂不支持|Not supported by this server)/u
  await expect(page.getByText(encryptionText)).toBeVisible()
  await expect(page.getByText(/(?:消息|Messaging): (?:可用|Available)$/u)).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('server-features.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByRole('heading', { name: /^(?:服务器功能|Server features)$/u })).toBeVisible()
  const featureLine = page.getByText(encryptionText)
  const box = await featureLine.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeGreaterThan(240)
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(390)
  // The Host animates sidebar collapse after resize. Wait for the visible
  // explanation to be uncovered before accepting or capturing the layout.
  await expect.poll(async () => featureLine.evaluate(element => {
    const rect = element.getBoundingClientRect()
    const hit = document.elementFromPoint(rect.right - 4, rect.y + 8)
    return hit !== null && (hit === element || element.contains(hit))
  }), { message: 'Narrow feature explanation must not be covered by Host content' }).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('server-features-narrow.png') })
  await closeHarnessSettings(page)
})
