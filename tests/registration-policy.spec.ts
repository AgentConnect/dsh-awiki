import { describe, expect, it } from 'vitest'
import {
  registrationHandleLocalPart,
  shortHandleInviteRequired,
} from '../src/registration-policy.ts'

describe('short Handle invitation policy', () => {
  it.each(['abc', 'Ab-C', '@abc', 'wba://abcd.awiki.info', 'abcd.awiki.info'])(
    'requires an invitation for a valid three- or four-character local part: %s',
    (handle) => {
      expect(shortHandleInviteRequired(handle)).toBe(true)
    },
  )

  it.each(['ab', 'abcde', '-abc', 'abc-', 'ab--c', 'a/b', ''])(
    'does not misclassify a boundary or invalid local part: %s',
    (handle) => {
      expect(shortHandleInviteRequired(handle)).toBe(false)
    },
  )

  it('normalizes supported Handle forms before applying the policy', () => {
    expect(registrationHandleLocalPart(' @Alice.AWIKI.INFO ')).toBe('alice')
    expect(registrationHandleLocalPart('wba://Bob.awiki.info')).toBe('bob')
  })
})
