import { readFile, lstat } from 'node:fs/promises'
import { test, expect } from '@playwright/test'
import { completeHarnessFirstRun, openAwikiSettings, closeHarnessSettings, waitForAwikiRegistered } from '../pages/harness-shell.ts'

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
  if (official) {
    const confirmation = page.getByRole('dialog', { name: '确认创建 AWiki 身份', exact: true })
    await confirmation.getByRole('button', { name: '确认并继续' }).click()
  }
  await waitForAwikiRegistered(page, `${fixture.handle}.${new URL(fixture.origin).hostname}`)
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

  if (official) {
    // Both candidates are ready in this lane. Use the same running Host and
    // ordinary tenant UI, then verify each tenant retains its own identity.
    await page.setViewportSize({ width: 1280, height: 900 })
    await openAwikiSettings(page)
    await page.getByRole('tab', { name: /^(?:租户|Tenant)$/u }).click()
    const settings = page.getByRole('dialog', { name: /^(?:设置|Settings)$/u })
    const openTenant = settings.locator('article').filter({ has: page.getByText('openserver-adapt.anpclaw.com', { exact: true }) })
    const officialTenant = settings.locator('article').filter({ has: page.getByText('backend-adapt.anpclaw.com', { exact: true }) })
    await expect(officialTenant.getByText(/^(?:当前|Current)$/u)).toBeVisible()
    // A fresh profile has only its explicitly configured custom tenant and the
    // stock built-ins. Add the second candidate through the normal product form.
    await expect(openTenant).toHaveCount(0)
    const addTenant = settings.locator('form').filter({ has: page.getByRole('heading', { name: /^(?:添加自定义租户|Add custom tenant)$/u }) })
    await addTenant.getByLabel(/^(?:租户名称|Tenant name)$/u).fill('Open Server candidate')
    await addTenant.getByLabel(/^(?:租户域名|Tenant domain)$/u).fill('openserver-adapt.anpclaw.com')
    await addTenant.getByRole('button', { name: /^(?:创建租户|Create tenant)$/u }).click()
    await expect(openTenant).toHaveCount(1)
    await openTenant.getByRole('button', { name: /^(?:切换|Switch)$/u }).click()
    await expect(openTenant.getByText(/^(?:当前|Current)$/u)).toBeVisible()
    await closeHarnessSettings(page)
    await page.getByRole('button', { name: /^打开 AWiki/u }).click()
    await expect(page.getByText('此服务器使用用户名注册，无需手机号或验证码。')).toBeVisible()
    await expect(page.getByLabel('手机号', { exact: true })).toHaveCount(0)
    await page.getByLabel('Handle', { exact: true }).fill(`${fixture.handle}open`)
    await page.getByRole('button', { name: '继续', exact: true }).click()
    await expect(page.getByRole('heading', { name: '进入 AWiki', exact: true })).toHaveCount(0, { timeout: 45_000 })
    await expect(page.getByText(`${fixture.handle}open.openserver-adapt.anpclaw.com`, { exact: true })).toBeVisible()
    await openAwikiSettings(page)
    await page.getByRole('tab', { name: /^(?:服务器功能|Server features)$/u }).click()
    await expect(page.getByText(/(?:加密聊天|Encrypted chats): (?:此服务器暂不支持|Not supported by this server)/u)).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('tenant-open-features.png') })
    await page.getByRole('tab', { name: /^(?:租户|Tenant)$/u }).click()
    await officialTenant.getByRole('button', { name: /^(?:切换|Switch)$/u }).click()
    await expect(officialTenant.getByText(/^(?:当前|Current)$/u)).toBeVisible()
    await page.getByRole('tab', { name: /^(?:服务器功能|Server features)$/u }).click()
    await expect(page.getByText(encryptionText)).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('tenant-official-restored-features.png') })
    await closeHarnessSettings(page)
    await page.getByRole('button', { name: /^打开 AWiki/u }).click()
    await expect(page.getByText(`${fixture.handle}.backend-adapt.anpclaw.com`, { exact: true })).toBeVisible()
    await expect(page.getByText(`${fixture.handle}open.openserver-adapt.anpclaw.com`, { exact: true })).toHaveCount(0)
  }
})
