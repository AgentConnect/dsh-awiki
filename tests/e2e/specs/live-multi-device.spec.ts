import { timingSafeEqual } from 'node:crypto'
import type { Locator, Page } from '@playwright/test'
import { test, expect } from '../fixtures/test.ts'
import { loadProtectedE2eConfig } from '../fixtures/protected-config.ts'
import { readLiveHandoff } from '../fixtures/live-handoff.ts'
import { startHarnessInstance } from '../fixtures/harness-instance.ts'
import { recordResource } from '../fixtures/resource-ledger.ts'
import { CliPeer } from '../fixtures/cli-peer.ts'
import { closeHarnessSettings, completeHarnessBusinessEntry, completeHarnessCopiedProfileEntry, openAwikiSettings } from '../pages/harness-shell.ts'
import { openAwiki } from '../pages/awiki-conversation-page.ts'

const settingsDialogName = /^(?:设置|Settings)$/u
const deviceTabName = /^(?:设备|Devices)$/u

async function openDeviceSettings(page: Page): Promise<Locator> {
  const dialog = page.getByRole('dialog', { name: settingsDialogName })
  if (!await dialog.isVisible()) await openAwikiSettings(page)
  const deviceTab = dialog.getByRole('tab', { name: deviceTabName })
  await deviceTab.click()
  await expect(deviceTab).toHaveAttribute('aria-selected', 'true')
  return dialog
}

async function deviceManagementSurface(page: Page): Promise<Locator> {
  const reminderManagement = page.getByRole('dialog', { name: '设备管理' })
  if (await reminderManagement.isVisible()) return reminderManagement
  return openDeviceSettings(page)
}

async function closeDeviceSettings(page: Page): Promise<void> {
  const reminderManagement = page.getByRole('dialog', { name: '设备管理' })
  if (await reminderManagement.isVisible()) {
    await reminderManagement.getByRole('button', { name: '完成' }).click()
    await expect(reminderManagement).toBeHidden()
    return
  }
  const dialog = page.getByRole('dialog', { name: settingsDialogName })
  if (await dialog.isVisible()) await closeHarnessSettings(page)
}

async function ensureAwikiOpen(page: Page): Promise<void> {
  if (!await page.getByRole('dialog', { name: 'AWiki' }).isVisible()) await openAwiki(page)
}

async function submitExistingHandleJoin(page: Page, phone: string, otp: string, handle?: string): Promise<void> {
  if (handle !== undefined) await page.getByLabel('Handle').fill(handle)
  await page.getByLabel('手机号').fill(phone)
  await page.getByRole('button', { name: '获取验证码' }).click()
  await page.getByLabel('注册验证码').fill(otp)
  await page.getByRole('button', { name: '继续' }).click()
  await page.getByRole('button', { name: '加入新设备（推荐）' }).click()
}

async function approvePendingJoin(admin: Page, joiner: Page): Promise<void> {
  const reminder = admin.getByRole('dialog', { name: '有新设备请求加入' })
  await expect(reminder).toBeVisible({ timeout: 60_000 })
  await reminder.getByRole('button', { name: '立即处理' }).click()
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
}

async function currentDeviceIdentifier(page: Page): Promise<string> {
  const dialog = await openDeviceSettings(page)
  const currentDevice = dialog.locator('article').filter({ hasText: '当前设备' })
  await expect(currentDevice).toHaveCount(1)
  const text = (await currentDevice.locator('code').textContent())?.trim()
  const match = text?.match(/^标识\s+(.+)$/u)
  if (match?.[1] === undefined) throw new Error('DSH E2E current device identifier is unavailable')
  return match[1]
}

async function revokeMemberDevice(admin: Page, identifier: string): Promise<void> {
  const dialog = await deviceManagementSurface(admin)
  const memberDevice = dialog.locator('article').filter({ hasText: `标识 ${identifier}` }).filter({ hasText: '其他设备' })
  await expect(memberDevice).toHaveCount(1)
  await memberDevice.getByRole('button', { name: '撤销', exact: true }).click()
  await memberDevice.getByLabel('撤销确认词').fill('REVOKE')
  await memberDevice.getByRole('button', { name: '确认撤销' }).click()
  await expect(memberDevice).toHaveCount(0, { timeout: 60_000 })
}

async function waitForRevokedDevice(page: Page): Promise<void> {
  const revokedHeading = page.getByRole('heading', { name: '此设备已被撤销' })
  await expect(async () => {
    if (await revokedHeading.isVisible()) return
    const refresh = page.getByRole('button', { name: '刷新 AWiki' })
    await expect(refresh).toBeEnabled()
    await refresh.click()
    await expect(revokedHeading).toBeVisible()
  }).toPass({ timeout: 60_000, intervals: [1_000, 2_000, 5_000] })
}

test('[DSH-WEB-MULTI-DEVICE-001] ready-admin approves a member that receives Direct updates', async ({ browser, dshPage: admin, harness }) => {
  test.setTimeout(5 * 60_000)
  const configPath = process.env.DSH_AWIKI_E2E_CONFIG
  const privateLedger = process.env.DSH_AWIKI_E2E_PRIVATE_LEDGER
  if (configPath === undefined || privateLedger === undefined) throw new Error('DSH E2E multi-device environment is incomplete')
  const config = await loadProtectedE2eConfig(configPath)
  const handoff = await readLiveHandoff()
  const cli = CliPeer.reopen(config, handoff.cli)
  const localHandle = handoff.dsh.handle.replace(/\.rwiki\.cn$/u, '')
  const joinerHarness = await startHarnessInstance({ isolated: true, profileSource: harness.dshHome })
  const joinerContext = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  try {
    const joiner = await joinerContext.newPage()
    await joiner.goto(joinerHarness.url, { waitUntil: 'domcontentloaded' })
    await completeHarnessCopiedProfileEntry(joiner)
    await openAwiki(joiner)
    await submitExistingHandleJoin(joiner, config.phone, config.otp, localHandle)

    await admin.goto(harness.url, { waitUntil: 'domcontentloaded' })
    await completeHarnessBusinessEntry(admin)
    await openAwiki(admin)
    await approvePendingJoin(admin, joiner)
    await expect(admin.getByText('其他设备', { exact: true })).toBeVisible({ timeout: 60_000 })
    await expect(admin.getByText('成员设备', { exact: true })).toBeVisible({ timeout: 60_000 })
    await openAwikiSettings(joiner)
    await joiner.getByRole('tab', { name: /^(?:设备|Devices)$/u }).click()
    await expect(joiner.getByText(/当前设备不是可用的管理设备/u)).toBeVisible()

    const marker = `cli-to-dsh-member-${handoff.runId}`
    const messageId = `msg-cli-to-dsh-member-${handoff.runId}`
    expect(await cli.sendDirect(handoff.dsh.did, marker, messageId)).toBe(messageId)
    await recordResource(privateLedger, {
      kind: 'message',
      identifier: messageId,
      status: 'pending',
      reasonCode: 'created',
    })
    await closeHarnessSettings(joiner)
    await openAwiki(joiner)
    const conversation = joiner.getByRole('button').filter({ hasText: marker })
    await expect(conversation).toHaveCount(1, { timeout: 60_000 })
    await conversation.click()
    const received = joiner.locator(`[data-message-id="${messageId}"]`)
    await expect(received).toHaveCount(1)
    await expect(received.getByText(marker, { exact: true })).toHaveCount(1)
  } finally {
    await joinerContext.close().catch(() => undefined)
    await joinerHarness.stop().catch(() => undefined)
  }
})

test('[DSH-WEB-MULTI-DEVICE-002] revoked member rejoins twice and remains message-capable', async ({ browser, dshPage: admin, harness }) => {
  test.setTimeout(12 * 60_000)
  const configPath = process.env.DSH_AWIKI_E2E_CONFIG
  const privateLedger = process.env.DSH_AWIKI_E2E_PRIVATE_LEDGER
  if (configPath === undefined || privateLedger === undefined) throw new Error('DSH E2E multi-device environment is incomplete')
  const config = await loadProtectedE2eConfig(configPath)
  const handoff = await readLiveHandoff()
  const cli = CliPeer.reopen(config, handoff.cli)
  const localHandle = handoff.dsh.handle.replace(/\.rwiki\.cn$/u, '')
  const joinerHarness = await startHarnessInstance({ isolated: true, profileSource: harness.dshHome })
  const joinerContext = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  try {
    const joiner = await joinerContext.newPage()
    await joiner.goto(joinerHarness.url, { waitUntil: 'domcontentloaded' })
    await completeHarnessCopiedProfileEntry(joiner)
    await openAwiki(joiner)
    await submitExistingHandleJoin(joiner, config.phone, config.otp, localHandle)

    await admin.goto(harness.url, { waitUntil: 'domcontentloaded' })
    await completeHarnessBusinessEntry(admin)
    await openAwiki(admin)
    await approvePendingJoin(admin, joiner)

    let identifier = await currentDeviceIdentifier(joiner)
    await closeDeviceSettings(joiner)
    await openAwiki(joiner)

    for (let cycle = 1; cycle <= 2; cycle += 1) {
      await revokeMemberDevice(admin, identifier)
      await closeDeviceSettings(admin)
      await waitForRevokedDevice(joiner)

      await joiner.getByRole('button', { name: '重新加入此设备' }).click()
      await expect(joiner.getByRole('heading', { name: '重新加入设备' })).toBeVisible({ timeout: 60_000 })
      await submitExistingHandleJoin(joiner, config.phone, config.otp)

      await ensureAwikiOpen(admin)
      await approvePendingJoin(admin, joiner)

      const replacementIdentifier = await currentDeviceIdentifier(joiner)
      expect(replacementIdentifier, `cycle ${cycle} must install a fresh device key`).not.toBe(identifier)
      identifier = replacementIdentifier
      await closeDeviceSettings(joiner)
      await openAwiki(joiner)
    }

    const marker = `cli-to-rejoined-dsh-member-${handoff.runId}`
    const messageId = `msg-cli-to-rejoined-dsh-member-${handoff.runId}`
    expect(await cli.sendDirect(handoff.dsh.did, marker, messageId)).toBe(messageId)
    await recordResource(privateLedger, {
      kind: 'message',
      identifier: messageId,
      status: 'pending',
      reasonCode: 'created',
    })
    const conversation = joiner.getByRole('button').filter({ hasText: marker })
    await expect(conversation).toHaveCount(1, { timeout: 60_000 })
    await conversation.click()
    const received = joiner.locator(`[data-message-id="${messageId}"]`)
    await expect(received).toHaveCount(1)
    await expect(received.getByText(marker, { exact: true })).toHaveCount(1)
  } finally {
    await joinerContext.close().catch(() => undefined)
    await joinerHarness.stop().catch(() => undefined)
  }
})
