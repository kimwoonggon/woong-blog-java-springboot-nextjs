import { describe, expect, it } from 'vitest'
import {
  looksLikeHtml,
  looksLikeMarkdown,
  normalizeBlogHtmlForSave,
  parseBlogContentJson,
  renderMarkdownToHtml,
  resolveBlogRenderableHtml,
} from '@/lib/content/blog-content'

describe('blog-content helpers', () => {
  it('parses html and markdown fields safely', () => {
    expect(parseBlogContentJson(undefined)).toBeNull()
    expect(parseBlogContentJson('{not json')).toBeNull()
    expect(parseBlogContentJson('[]')).toBeNull()
    expect(parseBlogContentJson('{"html":"<p>Hello</p>","markdown":"# Hello"}')).toEqual({
      html: '<p>Hello</p>',
      markdown: '# Hello',
    })
  })

  it('detects html and markdown-like strings', () => {
    expect(looksLikeHtml('<p>Hello</p>')).toBe(true)
    expect(looksLikeHtml('## Hello')).toBe(false)
    expect(looksLikeMarkdown('## Hello')).toBe(true)
    expect(looksLikeMarkdown('<p>Hello</p>')).toBe(false)
  })

  it('renders core markdown blocks and inline images to html', () => {
    const rendered = renderMarkdownToHtml('## Heading\n\nParagraph with [link](/blog).\n\n![hero](/media/hero.png)')
    expect(rendered).toContain('<h2>Heading</h2>')
    expect(rendered).toContain('<p>Paragraph with <a href="/blog">link</a>.</p>')
    expect(rendered).toContain('<img src="/media/hero.png" alt="hero" />')
  })

  it('preserves Korean multiline code blocks and inline code without leaking parser errors', () => {
    const rendered = resolveBlogRenderableHtml(JSON.stringify({
      markdown: [
        '문단에는 `인라인 코드`가 있습니다.',
        '',
        '```ts',
        'const message = "안녕하세요";',
        'console.log(message);',
        '```',
      ].join('\n'),
    }))

    expect(rendered).toContain('<code>인라인 코드</code>')
    expect(rendered).toContain('<pre><code class="language-ts">')
    expect(rendered).toContain('const message = &quot;안녕하세요&quot;;\nconsole.log(message);')
    expect(rendered).not.toMatch(/SyntaxError|Unexpected token|stack|trace/i)
  })

  it('keeps mermaid fenced markdown as a regular code block', () => {
    const rendered = renderMarkdownToHtml('```mermaid\ngraph TD;\n  A-->B;\n```')

    expect(rendered).toContain('<pre><code class="language-mermaid">')
    expect(rendered).toContain('graph TD;')
    expect(rendered).toContain('A--&gt;B;')
  })

  it('treats markdown stored in html as markdown fallback content', () => {
    const rendered = resolveBlogRenderableHtml(JSON.stringify({
      html: '## Markdown title\n\n![alt](/media/test.png)',
    }))

    expect(rendered).toContain('<h2>Markdown title</h2>')
    expect(rendered).toContain('<img src="/media/test.png" alt="alt" />')
  })

  it('prefers explicit markdown when both html and markdown exist', () => {
    const rendered = resolveBlogRenderableHtml(JSON.stringify({
      html: '<p>Old html</p>',
      markdown: '# Preferred markdown',
    }))

    expect(rendered).toContain('<h1>Preferred markdown</h1>')
    expect(rendered).not.toContain('Old html')
  })

  it('returns safe empty renderable output for malformed or empty content', () => {
    for (const raw of [undefined, null, '', '{not json', JSON.stringify({ html: '', markdown: '' })]) {
      expect(resolveBlogRenderableHtml(raw)).toBe('')
    }
  })

  it('converts markdown text wrapped by simple paragraph tags', () => {
    const rendered = resolveBlogRenderableHtml(JSON.stringify({
      html: '<p>## Wrapped heading</p><p>![wrapped alt](/media/wrapped.png)</p>',
    }))

    expect(rendered).toContain('<h2>Wrapped heading</h2>')
    expect(rendered).toContain('<img src="/media/wrapped.png" alt="wrapped alt" />')
  })

  it('recovers flattened markdown headings and bullet lists from a single wrapped paragraph', () => {
    const rendered = resolveBlogRenderableHtml(JSON.stringify({
      html: '<p>intro text # 개발 및 마이그레이션 계획 ## 1) 목표 요약 - `Next.js`는 서버/클라이언트 역할을 명확히 구분한다. - `ASP.NET Core`는 Minimal API 중심으로 정리한다.</p>',
    }))

    expect(rendered).toContain('<h1>개발 및 마이그레이션 계획</h1>')
    expect(rendered).toContain('<h2>1) 목표 요약</h2>')
    expect(rendered).toContain('<ul>')
    expect(rendered).toContain('<li><code>Next.js</code>는 서버/클라이언트 역할을 명확히 구분한다.</li>')
  })

  it('normalizes raw html code wrapped as text before save', () => {
    const normalized = normalizeBlogHtmlForSave('<p>&lt;h1&gt;HTML 제목&lt;/h1&gt;&lt;p&gt;본문&lt;/p&gt;</p>')

    expect(normalized).toBe('<h1>HTML 제목</h1><p>본문</p>')
  })

  it('normalizes wrapped markdown before save', () => {
    const normalized = normalizeBlogHtmlForSave('<p>## 저장 제목</p><p>- 첫 번째</p><p>- 두 번째</p>')

    expect(normalized).toContain('<h2>저장 제목</h2>')
    expect(normalized).toContain('<ul>')
  })

  it('normalizes flattened plain-text markdown before save', () => {
    const normalized = normalizeBlogHtmlForSave('<p># Summary: 요약 문장. 다음 문장. # OpenGL vs. DirectX UV Mapping at a Glance ## Why This Matters - 첫 번째 포인트 - 두 번째 포인트</p>')

    expect(normalized).toContain('<h1>Summary: 요약 문장. 다음 문장.</h1>')
    expect(normalized).toContain('<h1>OpenGL vs. DirectX UV Mapping at a Glance</h1>')
    expect(normalized).toContain('<h2>Why This Matters</h2>')
    expect(normalized).toContain('<ul>')
  })
})
