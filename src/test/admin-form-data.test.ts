import { describe, expect, it } from 'vitest'
import {
  parseHtmlFormContent,
  parseJsonRecord,
  readCommaSeparatedFormData,
  readFormDataString,
} from '@/lib/admin/form-data'

describe('admin form-data helpers', () => {
  it('reads only string form entries and falls back to empty strings for missing or file values', () => {
    const formData = new FormData()
    formData.set('title', 'Typed title')
    formData.set('upload', new File(['data'], 'avatar.png', { type: 'image/png' }))

    expect(readFormDataString(formData, 'title')).toBe('Typed title')
    expect(readFormDataString(formData, 'missing')).toBe('')
    expect(readFormDataString(formData, 'upload')).toBe('')
  })

  it('splits comma-separated tag input without unsafe casts', () => {
    const formData = new FormData()
    formData.set('tags', 'alpha, beta, gamma ')

    expect(readCommaSeparatedFormData(formData, 'tags')).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('parses html payloads into a narrow typed shape', () => {
    expect(parseHtmlFormContent('')).toEqual({})
    expect(parseHtmlFormContent('{"html":"<p>Hello</p>"}')).toEqual({ html: '<p>Hello</p>' })
    expect(parseHtmlFormContent('"string"')).toEqual({})
  })

  it('parses JSON object payloads and preserves syntax errors', () => {
    expect(parseJsonRecord('')).toEqual({})
    expect(parseJsonRecord('{"priority":"high"}')).toEqual({ priority: 'high' })
    expect(() => parseJsonRecord('{broken')).toThrow()
  })
})
