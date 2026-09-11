import { describe, expect, it } from 'vitest'
import {
  registrationHandleLocalPart,
} from '../src/registration-policy.ts'

describe('registration Handle normalization', () => {
  it('normalizes supported Handle forms', () => {
    expect(registrationHandleLocalPart(' Alice.AWIKI.INFO ')).toBe('alice')
    expect(registrationHandleLocalPart('wba://Bob.awiki.info')).toBe('bob')
  })
})
