// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearIntegrationOperation,
  clearIntegrationOperations,
  durableIntegrationOperationId,
} from '../src/client/integration-operation.ts'

describe('Integration browser operation recovery', () => {
  beforeEach(() => localStorage.clear())

  it('reuses one id for the same action and replaces it when the intent changes', () => {
    const first = durableIntegrationOperationId('create', '{"name":"one"}')
    expect(durableIntegrationOperationId('create', '{"name":"one"}')).toBe(first)
    expect(durableIntegrationOperationId('create', '{"name":"two"}')).not.toBe(first)
    expect(durableIntegrationOperationId('update', '{"name":"one"}')).not.toBe(first)
  })

  it('retires individual and all uncertain operations after definitive results', () => {
    const create = durableIntegrationOperationId('create', 'create')
    clearIntegrationOperation('create')
    expect(durableIntegrationOperationId('create', 'create')).not.toBe(create)

    const update = durableIntegrationOperationId('update', 'update')
    const rotate = durableIntegrationOperationId('rotate', 'rotate')
    const reopen = durableIntegrationOperationId('reopen', 'reopen')
    clearIntegrationOperations()
    expect(durableIntegrationOperationId('update', 'update')).not.toBe(update)
    expect(durableIntegrationOperationId('rotate', 'rotate')).not.toBe(rotate)
    expect(durableIntegrationOperationId('reopen', 'reopen')).not.toBe(reopen)
  })
})
