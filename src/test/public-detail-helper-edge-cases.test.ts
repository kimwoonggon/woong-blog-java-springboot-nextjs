import { describe, expect, it } from 'vitest'
import { formatDetailPublishDate as formatBlogDetailPublishDate } from '@/app/(public)/blog/[slug]/blog-detail-helpers'
import {
  formatDetailPublishDate as formatWorkDetailPublishDate,
  parseWorkContentHtml,
} from '@/app/(public)/works/[slug]/work-detail-helpers'

describe('public detail helper edge cases', () => {
  it.each([
    ['blog missing date', formatBlogDetailPublishDate, null],
    ['blog invalid date', formatBlogDetailPublishDate, 'not-a-date'],
    ['work missing date', formatWorkDetailPublishDate, undefined],
    ['work invalid date', formatWorkDetailPublishDate, '2026-99-99'],
  ])('returns Unknown Date for %s', (_label, formatter, value) => {
    expect(formatter(value)).toBe('Unknown Date')
  })

  it('parses work content html safely without leaking raw parser errors', () => {
    expect(parseWorkContentHtml(JSON.stringify({ html: '<p>안녕하세요</p>' }))).toBe('<p>안녕하세요</p>')
    expect(parseWorkContentHtml(JSON.stringify({ html: 123 }))).toBe('')
    expect(parseWorkContentHtml('{not json')).toBe('')
  })
})
