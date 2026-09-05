import { join } from 'node:path'
import { test, expect } from '../fixtures/test.ts'
import { loadProtectedE2eConfig } from '../fixtures/protected-config.ts'
import { recordResource } from '../fixtures/resource-ledger.ts'
import { CliPeer } from '../fixtures/cli-peer.ts'
import { writeLiveHandoff } from '../fixtures/live-handoff.ts'
import { completeHarnessFirstRun } from '../pages/harness-shell.ts'

test('provision two independent DSH Web E2E identities without recording media', async ({ page, harness }) => {
  const configPath = process.env.DSH_AWIKI_E2E_CONFIG
  const runId = process.env.DSH_AWIKI_E2E_RUN_ID
  const privateLedger = process.env.DSH_AWIKI_E2E_PRIVATE_LEDGER
  const sharedRoot = process.env.DSH_AWIKI_E2E_SHARED_ROOT
  if (configPath === undefined || runId === undefined || privateLedger === undefined || sharedRoot === undefined) {
    throw new Error('DSH E2E live setup environment is incomplete')
  }
  const config = await loadProtectedE2eConfig(configPath)
  const suffix = runId.slice(-8)
  const dshLocalHandle = `${config.handlePrefix}d${suffix}`
  const cliLocalHandle = `${config.handlePrefix}c${suffix}`
  const dshHandle = `${dshLocalHandle}.${config.targetBinding.didDomain}`
  const cliHandle = `${cliLocalHandle}.${config.targetBinding.didDomain}`
  await recordResource(privateLedger, {
    kind: 'identity',
    identifier: dshHandle,
    status: 'pending',
    reasonCode: 'planned_registration',
  })
  await recordResource(privateLedger, {
    kind: 'identity',
    identifier: cliHandle,
    status: 'pending',
    reasonCode: 'planned_registration',
  })
  const cli = await CliPeer.provision(config, join(sharedRoot, 'cli-peer'), cliLocalHandle)
  await cli.primeDirectInbox()

  await page.goto(harness.url, { waitUntil: 'domcontentloaded' })
  await completeHarnessFirstRun(page)
  await page.getByRole('button', { name: '打开 AWiki' }).click()
  await expect(page.getByRole('heading', { name: '进入 AWiki' })).toBeVisible()
  await page.getByLabel('Handle').fill(dshLocalHandle)
  await page.getByLabel('手机号').fill(config.phone)
  await page.getByRole('button', { name: '获取验证码' }).click()
  await expect(page.getByRole('heading', { name: '验证身份' })).toBeVisible()
  await page.getByLabel('注册验证码').fill(config.otp)
  await page.getByRole('button', { name: '继续' }).click()
  await expect(page.getByRole('button', { name: 'AWiki 账户菜单' })).toBeVisible({ timeout: 60_000 })
  const dshDid = await cli.resolveDid(dshHandle)
  await writeLiveHandoff({
    schemaVersion: 1,
    runId,
    dsh: { handle: dshHandle, did: dshDid },
    cli: cli.state,
  })
})
