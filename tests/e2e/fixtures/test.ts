import { test as base, expect, type Page } from '@playwright/test'
import { startHarnessInstance, type HarnessInstance } from './harness-instance.ts'
import { loadProtectedE2eConfig } from './protected-config.ts'

export const test = base.extend<object, { harness: HarnessInstance; dshPage: Page }>({
  harness: [async ({}, use) => {
    const configPath = process.env.DSH_AWIKI_E2E_CONFIG
    const config = configPath === undefined ? undefined : await loadProtectedE2eConfig(configPath)
    const harness = await startHarnessInstance(config === undefined ? {} : { target: config.targetBinding })
    try {
      await use(harness)
    } finally {
      await harness.stop()
    }
  }, { scope: 'worker', timeout: 20 * 60_000 }],
  dshPage: [async ({ browser }, use) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
    const page = await context.newPage()
    try {
      await use(page)
    } finally {
      await context.close()
    }
  }, { scope: 'worker' }],
})

export { expect }
