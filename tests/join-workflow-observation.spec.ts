import { describe, expect, it } from 'vitest'
import { projectJoinWorkflow } from './e2e/fixtures/join-workflow-observation.ts'

describe('Join evidence projection', () => {
  it('retains only closed workflow facts from transport envelopes', () => {
    expect(projectJoinWorkflow({ value: [
      { joining: true, recoveries: [], choice: { phone: 'private' }, token: 'private' },
      { phase: 'sas-ready', completed: false, sas: 'private', expiresAt: 'private' },
      { ok: false, error: { code: 'private', message: 'private' } },
      { phase: 'private', completed: true },
    ] })).toEqual([
      { kind: 'access', joining: true, choicePresent: true },
      { kind: 'progress', phase: 'sas-ready', completed: false },
      { kind: 'failure', code: 'other' },
    ])
  })
  it('bounds repeated states and recursive envelopes', () => {
    expect(projectJoinWorkflow(Array.from({ length: 100 }, () => ({ joining: true, recoveries: [], choice: null })))).toHaveLength(80)
    let value: unknown = { joining: true, recoveries: [] }
    for (let i = 0; i < 14; i++) value = { value }
    expect(projectJoinWorkflow(value)).toEqual([])
  })
})
