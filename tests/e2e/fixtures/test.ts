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
  // A clean macOS runner builds the Identity and IM Core native candidates
  // sequentially. Their individual fail-closed timeouts remain enforced by
  // the Harness; this outer budget must cover both builds plus profile setup.
  }, { scope: 'worker', timeout: 40 * 60_000 }],
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
