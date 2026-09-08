// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AwikiDraftProvider, AwikiDraftStore, useDraftState } from '../src/client/drafts.tsx'
afterEach(cleanup)

it('isolates owners and conversations, clears auth on tenant change, and rejects callbacks captured before a reset', () => {
  const store = new AwikiDraftStore()
  store.setScope('shanghai', 'alice')
  const first = store.getScope('chat:one')
  store.write(first, 'chat:one', 'draft', '', true)
  expect(store.read(first, 'chat:two', '', true)).toBe('')
  const flow = store.getScope('identity:otp')
  const epoch = store.epoch(flow)
  store.write(flow, 'identity:otp', '123456', '', true)
  store.setScope('silicon', 'alice')
  expect(store.read(store.getScope('chat:one'), 'chat:one', '', true)).toBe('')
  store.write(flow, 'identity:otp', 'stale-secret', '', true, epoch)
  store.setScope('shanghai', 'alice')
  expect(store.read(first, 'chat:one', '', true)).toBe('draft')
  expect(store.read(flow, 'identity:otp', '', true)).toBe('')
  const oldEpoch = store.epoch(first)
  store.clearScope()
  store.write(first, 'chat:one', 'old response', '', true, oldEpoch)
  expect(store.read(first, 'chat:one', '', true)).toBe('')
  expect(store.hasUnsavedChanges()).toBe(false)
})

it('keeps nullable drafts through remount, warns for real browser reload only while dirty, and clears on save', () => {
  const store = new AwikiDraftStore()
  store.setScope('shanghai', 'alice')
  function Form() {
    const [value, set] = useDraftState<string | null>('profile:draft', null)
    return <><input aria-label="draft" value={value ?? ''} onChange={event => set(event.target.value)} /><button onClick={() => set(null)}>save</button></>
  }
  const mount = () => render(<AwikiDraftProvider store={store}><Form /></AwikiDraftProvider>)
  const first = mount()
  fireEvent.change(screen.getByLabelText('draft'), { target: { value: 'private draft' } })
  const dirty = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(dirty)
  expect(dirty.defaultPrevented).toBe(true)
  first.unmount()
  mount()
  expect(screen.getByLabelText('draft')).toHaveProperty('value', 'private draft')
  fireEvent.click(screen.getByText('save'))
  expect(screen.getByLabelText('draft')).toHaveProperty('value', '')
  const clean = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(clean)
  expect(clean.defaultPrevented).toBe(false)
  act(() => store.clear())
})
