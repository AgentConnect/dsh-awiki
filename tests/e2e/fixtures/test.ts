import { test as base, expect } from '@playwright/test'
import { startHarnessInstance, type HarnessInstance } from './harness-instance.ts'

export const test = base.extend<object, { harness: HarnessInstance }>({
  harness: [async ({}, use) => {
    const harness = await startHarnessInstance()
    try {
      await use(harness)
    } finally {
      await harness.stop()
    }
  }, { scope: 'worker', timeout: 8 * 60_000 }],
})

export { expect }
