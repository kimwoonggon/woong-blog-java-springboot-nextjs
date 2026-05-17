import { describe, expect, it } from 'vitest'
import { getErrorMessage } from '@/lib/error-message'

describe('getErrorMessage', () => {
  it('returns the error message for Error instances', () => {
    expect(getErrorMessage(new Error('boom'), 'fallback')).toBe('boom')
  })

  it('falls back for non-Error throws', () => {
    expect(getErrorMessage('boom', 'fallback')).toBe('fallback')
    expect(getErrorMessage(null, 'fallback')).toBe('fallback')
  })
})
