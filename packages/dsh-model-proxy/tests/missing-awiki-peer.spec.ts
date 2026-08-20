import { describe, expect, it } from 'vitest'
import {
  AWIKI_PLUGIN_INSTALL_HINT,
  rethrowAwikiPluginDependencyError,
} from '../src/dependency-error.ts'

describe('model-proxy package dependency diagnostics', () => {
  it.each([
    'ERR_MODULE_NOT_FOUND',
    'ERR_PACKAGE_PATH_NOT_EXPORTED',
  ])('turns %s for the AWiki peer into an actionable profile install error', (code) => {
    const cause = Object.assign(new Error("Cannot load '@awiki/dsh-plugin/model-proxy-contract'"), { code })

    expect(() => rethrowAwikiPluginDependencyError(cause)).toThrow(AWIKI_PLUGIN_INSTALL_HINT)
    try {
      rethrowAwikiPluginDependencyError(cause)
    } catch (error) {
      expect((error as Error).cause).toBe(cause)
    }
  })

  it('does not rewrite unrelated module failures', () => {
    const cause = Object.assign(new Error("Cannot find package '@deepseek-ai/dsh-llm'"), {
      code: 'ERR_MODULE_NOT_FOUND',
    })

    expect(() => rethrowAwikiPluginDependencyError(cause)).toThrow(cause)
  })
})
