import { afterEach, expect, it, vi } from 'vitest'
import { CliPeer } from '../fixtures/cli-peer.ts'
import { reviewedE2eTargets, type ProtectedE2eConfig } from '../fixtures/protected-config.ts'

vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => { throw new Error('Mail contract tests must not launch a CLI') }),
}))
afterEach(() => vi.restoreAllMocks())

const expected = { subject: 'fixture', body: 'fixture body', to: 'cli@example.test', from: 'dsh@example.test' }
const summary = { id: 'mail-1', subject: expected.subject, to: [], from: [expected.from] }
function fixture() {
  const peer = CliPeer.reopen({
    cliBinary: '/unused', targetBinding: reviewedE2eTargets['rwiki-cn-testing'],
  } as ProtectedE2eConfig, {
    root: '/unused', home: '/unused', workspace: '/unused', vaultRootKey: 'unit-only',
    handle: 'unit', did: 'unit-did', accountId: 'unit-account',
  })
  const run = vi.spyOn(peer as unknown as { run(args: readonly string[]): Promise<unknown> }, 'run')
  return { peer, run }
}

it('reads the CLI account and nested mail detail JSON contract', async () => {
  const { peer, run } = fixture()
  run.mockResolvedValueOnce({ ok: true, data: { mailbox_address: expected.to } })
  await expect(peer.mailAccountAddress()).resolves.toBe(expected.to)
  run.mockResolvedValueOnce({ ok: true, data: { mailbox_address: expected.to } })
  run.mockResolvedValueOnce({ ok: true, data: { messages: [summary], total: 1, has_more: false, next_cursor: null } })
  run.mockResolvedValueOnce({ ok: true, data: { summary, body_text: expected.body, attachments: [] } })
  await expect(peer.waitForMail(expected)).resolves.toBeUndefined()
  expect(run).toHaveBeenLastCalledWith(['--format', 'json', 'mail', 'read', '--id', 'mail-1'])
})

it.each([
  { summary: { ...summary, id: 'other' }, body_text: expected.body },
  { summary: { ...summary, subject: 'other' }, body_text: expected.body },
  { summary: { ...summary, from: ['other@example.test'] }, body_text: expected.body },
  { summary: { ...summary, to: ['other@example.test'] }, body_text: expected.body },
  { summary: { ...summary, to: [expected.to, 'other@example.test'] }, body_text: expected.body },
  { ...summary, body_text: expected.body },
  { summary, body_text: null }, { summary, body_text: 'other' },
])('rejects mismatched or flattened detail without exposing it', async detail => {
  const { peer, run } = fixture()
  run.mockResolvedValueOnce({ data: { mailbox_address: expected.to } })
    .mockResolvedValueOnce({ data: { messages: [summary] } }).mockResolvedValueOnce({ data: detail })
  await expect(peer.waitForMail(expected)).rejects.toThrow(/^DSH E2E CLI /u)
})

it.each([
  { messages: [summary, summary] }, { messages: null },
  { messages: [{ ...summary, id: '' }] },
  { messages: [{ ...summary, from: ['other@example.test'] }] },
  { messages: [{ ...summary, to: ['other@example.test'] }] },
])('rejects duplicate or invalid inbox summaries before reading', async data => {
  const { peer, run } = fixture()
  run.mockResolvedValueOnce({ data: { mailbox_address: expected.to } }).mockResolvedValue({ data })
  await expect(peer.waitForMail(expected)).rejects.toThrow()
  expect(run).toHaveBeenCalledTimes(2)
})

it('rejects a mail summary from a different authenticated mailbox', async () => {
  const { peer, run } = fixture()
  run.mockResolvedValueOnce({ data: { mailbox_address: 'other@example.test' } })
  await expect(peer.waitForMail(expected)).rejects.toThrow('mailbox does not match')
  expect(run).toHaveBeenCalledTimes(1)
})

it('requires an explicit accepted send and preserves optional message_id', async () => {
  const { peer, run } = fixture()
  // SendEmailResult.message_id is optional in Core; delivery is the independent oracle.
  run.mockResolvedValue({ data: { accepted: true, message_id: null, warnings: [] } })
  await expect(peer.sendMail(expected.to, expected.subject, expected.body)).resolves.toBeUndefined()
  expect(run).toHaveBeenLastCalledWith(['--format', 'json', 'mail', 'send', '--to', expected.to, '--subject', expected.subject, '--body', expected.body])
  for (const accepted of [false, undefined, 'true']) {
    run.mockResolvedValue({ data: { accepted } })
    await expect(peer.sendMail(expected.to, expected.subject, expected.body)).rejects.toThrow('not accepted')
  }
  run.mockResolvedValue({ data: { mailbox_address: null } })
  await expect(peer.mailAccountAddress()).rejects.toThrow('mailbox address')
})
