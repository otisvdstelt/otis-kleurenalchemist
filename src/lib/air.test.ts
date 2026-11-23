import { describe, expect, it } from 'vitest'
import { clockPhase } from './air'

describe('clockPhase', () => {
  it('is nacht na achten en voor zevenen', () => {
    expect(clockPhase(new Date(2026, 0, 1, 21))).toBe('night')
    expect(clockPhase(new Date(2026, 0, 1, 3))).toBe('night')
    expect(clockPhase(new Date(2026, 0, 1, 7))).toBe('day')
    expect(clockPhase(new Date(2026, 0, 1, 19, 59))).toBe('day')
  })
})
