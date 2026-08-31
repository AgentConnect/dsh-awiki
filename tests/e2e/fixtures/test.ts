import { test as base, expect, type Page } from '@playwright/test'
import { startHarnessInstance, type HarnessInstance } from './harness-instance.ts'

export const test = base.extend<object, { harness: HarnessInstance; dshPage: Page }>({
  harness: [async ({}, use) => {
    const harness = await startHarnessInstance()
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
