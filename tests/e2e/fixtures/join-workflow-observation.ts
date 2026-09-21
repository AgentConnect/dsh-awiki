/** Closed response projection for credential-sensitive Join browser evidence. */
export function projectJoinWorkflow(value: unknown): Record<string, string | boolean>[] {
  const states: Record<string, string | boolean>[] = []
  const inspect = (value: unknown, depth = 0): void => {
    if (depth > 12 || states.length >= 80 || value === null || typeof value !== 'object') return
    const record = value as Record<string, unknown>
    if (typeof record.joining === 'boolean' && Array.isArray(record.recoveries)) {
      states.push({ kind: 'access', joining: record.joining, choicePresent: record.choice != null })
    }
    if (typeof record.phase === 'string' && ['pending', 'sas-ready', 'expired', 'rejected', 'cancelled', 'authorized'].includes(record.phase)
      && typeof record.completed === 'boolean') {
      states.push({ kind: 'progress', phase: record.phase, completed: record.completed })
    }
    if (record.ok === false && record.error !== null && typeof record.error === 'object') {
      const code = (record.error as Record<string, unknown>).code
      states.push({ kind: 'failure', code: typeof code === 'string' && ['network', 'remote', 'conflict', 'forbidden', 'not-found', 'unauthorized'].includes(code) ? code : 'other' })
    }
    for (const item of Object.values(record)) inspect(item, depth + 1)
  }
  inspect(value)
  return states
}
