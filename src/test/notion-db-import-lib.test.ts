import { describe, expect, it } from 'vitest'
import {
  buildBlogContentSqlExpressions,
  blocksToHtml,
  generateExcerpt,
  normalizeTitle,
  rewriteHtmlWithAssetManifest,
  slugify,
} from '../../scripts/notion-db-import-lib.mjs'

describe('notion db import helpers', () => {
  it('slugifies mixed text safely', () => {
    expect(slugify('Hello World !!!', 'post')).toBe('hello-world')
    expect(slugify('한글 제목', 'post')).toBe('한글-제목')
  })

  it('generates excerpts from html', () => {
    expect(generateExcerpt('<p>Hello</p><p>World</p>')).toBe('Hello World')
  })

  it('builds public body sql fields for direct blog imports', () => {
    const expressions = buildBlogContentSqlExpressions("<p>Reader body's text</p>")

    expect(expressions.contentJsonExpr).toBe("jsonb_build_object('html', '<p>Reader body''s text</p>')")
    expect(expressions.publicContentHtmlExpr).toBe("'<p>Reader body''s text</p>'")
    expect(expressions.publicContentMarkdownExpr).toBe("''")
  })

  it('normalizes titles for duplicate-title lookup', () => {
    expect(normalizeTitle('  Hello   World  ')).toBe('Hello World')
    expect(normalizeTitle('한글   제목')).toBe('한글 제목')
  })

  it('renders notion blocks to html', () => {
    const blocks = [
      { type: 'heading_1', heading_1: { rich_text: [{ plain_text: 'Title', annotations: {} }] } },
      { type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'Body', annotations: {} }] } },
    ]

    expect(blocksToHtml(blocks)).toContain('<h1>Title</h1>')
    expect(blocksToHtml(blocks)).toContain('<p>Body</p>')
  })

  it('rewrites downloaded image urls to local media urls', () => {
    const html = '<p><img src="https://example.com/a.png" alt="" /></p>'
    const result = rewriteHtmlWithAssetManifest(
      html,
      [{ url: 'https://example.com/a.png', path: '/tmp/a.png', status: 'downloaded' }],
      'sample-post',
    )

    expect(result.html).toContain('/media/blogs/notion/sample-post-001.png')
    expect(result.copiedAssets[0].relativePath).toBe('blogs/notion/sample-post-001.png')
  })
})
