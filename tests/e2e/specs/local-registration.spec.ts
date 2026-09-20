import { readFile, stat } from 'node:fs/promises'
import { test, expect } from '@playwright/test'
import { completeHarnessFirstRun } from '../pages/harness-shell.ts'

// The external provisioner owns disposable accounts, invitations, HTTP/DB
// counters and cleanup. This case owns only the real DSH browser interaction.
test('[DSH-WEB-REGISTRATION-001] invited registration and existing short-account continuation', async ({ page }) => {
  const path = process.env.DSH_REGISTRATION_FIXTURE
  if (!path || ((await stat(path)).mode & 0o077) !== 0) throw new Error('Protected local registration fixture required')
  const fixture = JSON.parse(await readFile(path, 'utf8')) as {
    url: string; freshUrl: string; userServiceUrl: string; handle: string; phone: string; otp: string; inviteCode: string
  }
  for (const value of [fixture.url, fixture.freshUrl, fixture.userServiceUrl]) {
    const url = new URL(value)
    if (url.hostname !== '127.0.0.1' || url.protocol !== 'http:') throw new Error('Loopback-only acceptance')
  }
  for (const [url, existing] of [[fixture.url, false], [fixture.freshUrl, true]] as const) {
    await page.goto(url)
    await completeHarnessFirstRun(page)
    await page.getByRole('button', { name: '打开 AWiki' }).click()
    await page.getByLabel('Handle', { exact: true }).fill(fixture.handle)
    await page.getByLabel('手机号', { exact: true }).fill(fixture.phone)
    await page.getByRole('button', { name: '获取验证码', exact: true }).click()
    if (!existing) {
      const invitation = page.getByLabel('邀请码', { exact: true })
      await expect(invitation).toBeVisible()
      await expect(page.getByRole('button', { name: '获取验证码', exact: true })).toBeDisabled()
      await invitation.fill('invalid-test-invite')
      await page.getByRole('button', { name: '获取验证码', exact: true }).click()
      await expect(page.getByText('邀请码无效或不适用于当前账号，请检查后重试。')).toBeVisible()
      await expect(page.getByLabel('注册验证码', { exact: true })).toHaveCount(0)
      await invitation.fill(fixture.inviteCode)
      await page.getByRole('button', { name: '获取验证码', exact: true }).click()
    } else {
      await expect(page.getByLabel('邀请码', { exact: true })).toHaveCount(0)
    }
    await page.getByLabel('注册验证码', { exact: true }).fill(fixture.otp)
    await page.getByRole('button', { name: '继续', exact: true }).click()
    await page.getByRole('button', { name: '确认并继续', exact: true }).click()
    if (existing) {
      await expect(page.getByRole('button', { name: /加入.*设备/u }).first()).toBeVisible()
    } else {
      await expect(page.getByLabel('注册验证码', { exact: true })).toHaveCount(0, { timeout: 30_000 })
      await expect(page.getByRole('heading', { name: '进入 AWiki', exact: true })).toHaveCount(0)
    }
  }
})
