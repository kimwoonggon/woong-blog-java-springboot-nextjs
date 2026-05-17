import { describe, expect, it } from 'vitest'
import {
  isBlockPageContent,
  isHtmlPageContent,
  parsePageContentJson,
  toHomeContent,
} from '@/lib/content/page-content'

describe('page-content helpers', () => {
  it('parses raw JSON strings into unknown content values', () => {
    expect(parsePageContentJson(undefined)).toBeNull()
    expect(parsePageContentJson('{"html":"<p>Hello</p>"}')).toEqual({ html: '<p>Hello</p>' })
  })

  it('returns null for malformed or empty page content without leaking parser errors', () => {
    for (const raw of ['', null, undefined, '{not json', '["not", "a", "page"]']) {
      expect(parsePageContentJson(raw)).toBeNull()
    }
  })

  it('detects html and block content safely', () => {
    expect(isHtmlPageContent({ html: '<p>Hello</p>' })).toBe(true)
    expect(isHtmlPageContent({ html: 1 })).toBe(false)

    expect(isBlockPageContent({
      blocks: [{ id: '1', type: 'p', text: 'Hello' }],
    })).toBe(true)
    expect(isBlockPageContent({
      blocks: [{ id: 1, type: 'p' }],
    })).toBe(false)
    expect(isBlockPageContent({
      blocks: [
        { id: 'unknown-1', type: 'unknown-block', text: '알 수 없는 블록' },
        { id: 'code-1', type: 'code', text: 'const value = 1' },
      ],
    })).toBe(true)
  })

  it('filters home content down to optional string fields', () => {
    expect(toHomeContent(null)).toEqual({})
    expect(toHomeContent({
      headline: 'Headline',
      introText: 'Intro',
      profileImageUrl: '/avatar.png',
      ignored: 1,
    })).toEqual({
      headline: 'Headline',
      introText: 'Intro',
      profileImageUrl: '/avatar.png',
    })
    expect(toHomeContent({ headline: 1 })).toEqual({
      headline: undefined,
      introText: undefined,
      profileImageUrl: undefined,
    })
  })
})
