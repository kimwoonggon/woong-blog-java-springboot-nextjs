import { describe, expect, it } from 'vitest'
import {
  splitMermaidContent,
  stripMermaidForExcerpt,
} from '@/lib/content/mermaid-content'

describe('mermaid content helpers', () => {
  it('splits custom mermaid blocks without treating arrows as HTML tag ends', () => {
    const segments = splitMermaidContent('<p>Intro</p><mermaid-block data-code="flowchart TD\n  A --> B\n  User->>Frontend: Login"></mermaid-block><p>Outro</p>')

    expect(segments).toEqual([
      { type: 'html', html: '<p>Intro</p>' },
      { type: 'mermaid', code: 'flowchart TD\n  A --> B\n  User->>Frontend: Login' },
      { type: 'html', html: '<p>Outro</p>' },
    ])
  })

  it('does not infer Mermaid from language-mermaid code blocks', () => {
    const segments = splitMermaidContent('<pre><code>const x = 1</code></pre><pre><code class="language-mermaid">sequenceDiagram\nUser-&gt;&gt;Frontend: Login</code></pre>')

    expect(segments).toEqual([
      { type: 'html', html: '<pre><code>const x = 1</code></pre><pre><code class="language-mermaid">sequenceDiagram\nUser-&gt;&gt;Frontend: Login</code></pre>' },
    ])
  })

  it('does not infer Mermaid from paragraph-wrapped fences', () => {
    const html = '<p>```mermaid</p><p>sequenceDiagram</p><p>User-&gt;&gt;Frontend: Login</p><p>```</p>'

    expect(splitMermaidContent(html)).toEqual([{ type: 'html', html }])
  })

  it('strips mermaid blocks and fences from excerpts without leaking source', () => {
    const excerpt = stripMermaidForExcerpt('<p>Before</p><mermaid-block data-code="sequenceDiagram\nUser->>Frontend: Login"></mermaid-block><p>After</p>')

    expect(excerpt).toContain('<p>Before</p>')
    expect(excerpt).toContain('<p>After</p>')
    expect(excerpt).not.toContain('sequenceDiagram')
    expect(excerpt).not.toContain('User->>Frontend')
  })
})
