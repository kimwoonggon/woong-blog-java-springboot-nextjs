import { describe, expect, it } from 'vitest'
import { containsNormalizedSearch, normalizeSearchText } from '@/lib/search/normalized-search'

describe('normalized search', () => {
  it('ignores case, punctuation, and spacing when matching compact acronyms', () => {
    const target = 'T,B,N 안녕하세요'

    expect(containsNormalizedSearch(target, 'TB')).toBe(true)
    expect(containsNormalizedSearch(target, 'TBN')).toBe(true)
    expect(containsNormalizedSearch(target, 'tbn')).toBe(true)
  })

  it('keeps Korean and English text searchable after normalization', () => {
    expect(normalizeSearchText(' Next.js  테스트 ')).toContain('nextjs')
    expect(normalizeSearchText(' Next.js  테스트 ')).toContain('테스트')
  })

  it.each([
    ['whitespace-only query', 'Anything searchable', '   \n\t  ', true],
    ['null query', 'Anything searchable', null, true],
    ['undefined target with real query', undefined, 'missing', false],
    ['empty target with empty query', '', '', true],
    ['mixed Korean and English with repeated spaces', 'Next.js   테스트 문서', 'nextjs 테스트', true],
    ['case-insensitive English', 'Frontend Reinforcement', 'frontEND', true],
    ['symbol-heavy compact query', 'T,B,N 안녕하세요', '!!!t---b___n???', true],
    ['symbol-heavy Korean query', '테스트 기반 개발', '***테!!스--트***', true],
  ])('handles %s', (_label, value, query, expected) => {
    expect(containsNormalizedSearch(value, query)).toBe(expected)
  })

  it.each([
    ['   repeated   spaces   ', 'repeatedspaces'],
    ['Ｔ，Ｂ，Ｎ 안녕하세요', 'tbn안녕하세요'],
    [null, ''],
    [undefined, ''],
    ['!@#$%^&*()', ''],
  ])('normalizes %j to %j', (value, expected) => {
    expect(normalizeSearchText(value)).toBe(expected)
  })
})
