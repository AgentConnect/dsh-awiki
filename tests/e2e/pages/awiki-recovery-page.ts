import { expect, type Page } from '@playwright/test'
import type { ProtectedE2eConfig } from '../fixtures/protected-config.ts'
import { closeAwiki, openAwiki } from './awiki-conversation-page.ts'
import { DSH_ASSISTANT_MESSAGE_CONTRACT } from './harness-assistant-contract.ts'

/** Complete visible registration for one dynamic test Handle. */
export async function registerVisibleIdentity(
  page: Page,
  localHandle: string,
  config: ProtectedE2eConfig,
): Promise<void> {
  await openAwiki(page)
  await page.getByLabel('Handle').fill(localHandle)
  await page.getByLabel('手机号').fill(config.phone)
  await page.getByRole('button', { name: '获取验证码' }).click()
  await page.getByLabel('注册验证码').fill(config.otp)
  await page.getByRole('button', { name: '继续' }).click()
  await expect(page.getByRole('button', { name: 'AWiki 账户菜单' })).toBeVisible({ timeout: 60_000 })
}

/** Complete the existing visible phone Recovery flow for the same Handle. */
export async function recoverVisibleIdentity(
  page: Page,
  localHandle: string,
  config: ProtectedE2eConfig,
): Promise<void> {
  await page.getByLabel('Handle').fill(localHandle)
  await page.getByLabel('手机号').fill(config.phone)
  await page.getByRole('button', { name: '获取验证码' }).click()
  await page.getByLabel('注册验证码').fill(config.otp)
  await page.getByRole('button', { name: '继续' }).click()
  await page.getByRole('button', { name: '恢复 Handle（会替换 DID）' }).click()
  await page.getByLabel('恢复验证码').fill(config.otp)
  await page.getByRole('button', { name: '验证恢复信息' }).click()
  await page.getByRole('button', { name: '确认并恢复身份' }).click()
  await waitForRecoveryCompletion(page)
}

export async function waitForRecoveryCompletion(page: Page): Promise<void> {
  const deadline = Date.now() + 180_000
  const account = page.getByRole('button', { name: 'AWiki 账户菜单' })
  while (Date.now() < deadline) {
    if (await account.isVisible()) return
    const action = page.getByRole('button', { name: /确认并恢复身份|重新检查恢复结果|继续完成本机切换/u })
    if (await action.isVisible()) await action.click()
    await page.waitForTimeout(2_000)
  }
  throw new Error('DSH E2E Recovery did not reach active state')
}

async function openSettingsSection(page: Page, name: string): Promise<void> {
  const settings = page.getByRole('button', { name: /^(?:Settings|设置)$/iu }).first()
  await expect(settings).toBeVisible()
  await settings.click()
  const section = page.getByText(name, { exact: true }).last()
  await expect(section).toBeVisible()
  await section.click()
}

async function closeSettings(page: Page): Promise<void> {
  const close = page.getByRole('button', { name: /关闭设置|Close settings/iu })
  if (await close.isVisible()) await close.click()
  else await page.keyboard.press('Escape')
}

/** Invoke the real Settings danger-zone action and require the unregistered product state. */
export async function clearVisibleLocalData(page: Page): Promise<void> {
  if (await page.getByRole('dialog', { name: 'AWiki' }).isVisible()) await closeAwiki(page)
  await openSettingsSection(page, 'AWiki')
  await page.getByRole('button', { name: '清空本地 AWiki 数据' }).click()
  const dialog = page.getByRole('dialog', { name: '确认清空本地 AWiki 数据' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel(/请输入.*永久清空/u).fill('永久清空')
  await dialog.getByRole('button', { name: '永久清空' }).click()
  await expect(dialog).toBeHidden({ timeout: 60_000 })
  await closeSettings(page)
  await openAwiki(page)
  await expect(page.getByRole('heading', { name: '进入 AWiki' })).toBeVisible()
}

export interface MailCacheCounts {
  readonly mailKeys: number
  readonly unrelatedSentinelPresent: boolean
}

/** Seed one unrelated origin key and return count-only Mail cache evidence. */
export async function seedMailCacheSentinel(page: Page): Promise<MailCacheCounts> {
  return page.evaluate(() => {
    localStorage.setItem('dsh-e2e:unrelated-sentinel', 'preserve')
    return {
      mailKeys: Object.keys(localStorage).filter(key => (
        key.startsWith('awiki:mail-list:v2:') || key.startsWith('awiki:mail-folder:v1:')
      )).length,
      unrelatedSentinelPresent: localStorage.getItem('dsh-e2e:unrelated-sentinel') === 'preserve',
    }
  })
}

/** Return count-only post-clear evidence and remove the unrelated task sentinel. */
export async function readClearedMailCacheCounts(page: Page): Promise<MailCacheCounts> {
  return page.evaluate(() => {
    const value = {
      mailKeys: Object.keys(localStorage).filter(key => (
        key.startsWith('awiki:mail-list:v2:') || key.startsWith('awiki:mail-folder:v1:')
      )).length,
      unrelatedSentinelPresent: localStorage.getItem('dsh-e2e:unrelated-sentinel') === 'preserve',
    }
    localStorage.removeItem('dsh-e2e:unrelated-sentinel')
    return value
  })
}

/** Send one visible plain-text mail and require exactly one sent row. */
export async function sendVisibleMail(
  page: Page,
  recipient: string,
  subject: string,
  body: string,
): Promise<void> {
  await page.getByRole('tab', { name: /^邮件/u }).click()
  await expect(page.getByRole('complementary', { name: '邮箱导航' })).toBeVisible()
  await page.getByRole('button', { name: '写邮件' }).click()
  await page.getByLabel('收件人').fill(recipient)
  await page.getByLabel('主题').fill(subject)
  await page.getByLabel('正文').fill(body)
  await page.getByRole('button', { name: '发送' }).click()
  const confirm = page.getByRole('dialog', { name: '确认发送邮件' })
  await confirm.getByRole('button', { name: '确认发送' }).click()
  await expect(page.getByText(/邮件已发送/u)).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole('region', { name: '发件箱' }).getByText(subject, { exact: true })).toHaveCount(1)
}

async function selectMailFolder(page: Page, folder: '收件箱' | '发件箱'): Promise<void> {
  await page.getByRole('complementary', { name: '邮箱导航' }).getByRole('button', { name: folder }).click()
  await expect(page.getByRole('region', { name: folder })).toBeVisible()
}

async function waitForMailSubject(page: Page, folder: '收件箱' | '发件箱', subject: string): Promise<void> {
  await selectMailFolder(page, folder)
  const region = page.getByRole('region', { name: folder })
  await expect(async () => {
    await page.getByRole('button', { name: `刷新${folder}` }).click()
    await expect(region.getByText(subject, { exact: true })).toHaveCount(1)
  }).toPass({ timeout: 120_000, intervals: [1_000, 2_000, 5_000] })
}

/** Require recovered server inbox/sent history through visible Mail UI. */
export async function restoreVisibleMailHistory(
  page: Page,
  inboundSubject: string,
  sentSubjects: readonly string[],
): Promise<void> {
  await page.getByRole('tab', { name: /^邮件/u }).click()
  await waitForMailSubject(page, '收件箱', inboundSubject)
  await selectMailFolder(page, '发件箱')
  const sent = page.getByRole('region', { name: '发件箱' })
  for (const subject of sentSubjects) await expect(sent.getByText(subject, { exact: true })).toHaveCount(1)
}

/** Open one exact historical row and require its visible server detail. */
export async function openVisibleHistoricalMailDetail(
  page: Page,
  folder: '收件箱' | '发件箱',
  subject: string,
  expectedBody: string,
  attachmentName?: string,
): Promise<void> {
  await selectMailFolder(page, folder)
  const region = page.getByRole('region', { name: folder })
  const row = region.getByRole('button', { name: new RegExp(subject.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u') })
  await expect(row).toHaveCount(1)
  await row.click()
  await expect(page.getByText(expectedBody, { exact: true })).toBeVisible()
  if (attachmentName !== undefined) await expect(page.getByText(attachmentName, { exact: true })).toBeVisible()
}

/** Enable the hosted provider through Settings and complete one visible main-chat request. */
export async function completeVisibleModelPrompt(
  page: Page,
  prompt: string,
  expectedText: string,
): Promise<void> {
  if (await page.getByRole('dialog', { name: 'AWiki' }).isVisible()) await closeAwiki(page)
  await openSettingsSection(page, '快速充值')
  const enable = page.getByRole('button', { name: '启用' })
  if (await enable.isVisible()) await enable.click()
  await expect(page.getByText('已启用', { exact: true })).toBeVisible({ timeout: 60_000 })
  await closeSettings(page)
  const newChat = page.getByRole('button', { name: /新建对话|New chat/iu })
  if (await newChat.isVisible()) await newChat.click()
  const composer = page.locator('textarea:visible').last()
  await expect(composer).toBeVisible()
  const completions = page.locator(DSH_ASSISTANT_MESSAGE_CONTRACT.selector)
    .filter({ has: page.getByText(expectedText, { exact: true }) })
  const previousCompletions = await completions.count()
  await composer.fill(prompt)
  await page.getByRole('button', { name: /发送|Send/iu }).last().click()
  await expect(completions).toHaveCount(previousCompletions + 1, { timeout: 180_000 })
}
