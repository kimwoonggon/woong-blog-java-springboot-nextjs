export interface BlogContentPayload {
  html?: string
  markdown?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const MEANINGFUL_HTML_PATTERN = /<(?:!DOCTYPE|html|body|p|div|h[1-6]|ul|ol|li|blockquote|code|pre|img|a|table|thead|tbody|tr|td|th|section|article|br|hr|span|strong|em|html-snippet|three-js-block|mermaid-block)\b/i
const MARKDOWN_PATTERN = /(^|\n)\s*(?:#{1,6}\s+|[-*+]\s+|\d+\.\s+|>\s+|```|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\))/m
const SIMPLE_WRAPPER_ONLY_PATTERN = /^<\/?(?:p|div)(?:\s[^>]*)?>|<br\s*\/?>$/i

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeHtmlAttribute(value: string) {
  return escapeHtml(value)
}

function sanitizeUrl(value: string) {
  const trimmed = value.trim()
  if (/^(https?:\/\/|\/|\.\/|\.\.\/|#|mailto:)/i.test(trimmed)) {
    return escapeHtml(trimmed)
  }

  return '#'
}

function renderInlineMarkdown(value: string) {
  let rendered = escapeHtml(value)

  rendered = rendered.replace(/`([^`]+)`/g, '<code>$1</code>')
  rendered = rendered.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt: string, url: string) => {
    return `<img src="${sanitizeUrl(url)}" alt="${escapeHtml(alt)}" />`
  })
  rendered = rendered.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, text: string, url: string) => {
    return `<a href="${sanitizeUrl(url)}">${text}</a>`
  })
  rendered = rendered.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  rendered = rendered.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  rendered = rendered.replace(/(^|[^\*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
  rendered = rendered.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>')

  return rendered
}

function flushParagraph(paragraphLines: string[], blocks: string[]) {
  if (paragraphLines.length === 0) {
    return
  }

  blocks.push(`<p>${renderInlineMarkdown(paragraphLines.join(' '))}</p>`)
  paragraphLines.length = 0
}

function flushList(listType: 'ul' | 'ol' | null, listItems: string[], blocks: string[]) {
  if (!listType || listItems.length === 0) {
    return
  }

  const items = listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join('')
  blocks.push(`<${listType}>${items}</${listType}>`)
  listItems.length = 0
}

function flushBlockquote(blockquoteLines: string[], blocks: string[]) {
  if (blockquoteLines.length === 0) {
    return
  }

  blocks.push(`<blockquote><p>${renderInlineMarkdown(blockquoteLines.join(' '))}</p></blockquote>`)
  blockquoteLines.length = 0
}

function flushCodeBlock(codeLines: string[], blocks: string[], language: string | null) {
  if (codeLines.length === 0) {
    return
  }

  const code = codeLines.join('\n')
  if (language) {
    blocks.push(`<pre><code class="language-${escapeHtmlAttribute(language)}">${escapeHtml(code)}</code></pre>`)
  } else {
    blocks.push(`<pre><code>${escapeHtml(code)}</code></pre>`)
  }
  codeLines.length = 0
}

export function parseBlogContentJson(raw: string | null | undefined): BlogContentPayload | null {
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) {
      return null
    }

    return {
      html: typeof parsed.html === 'string' ? parsed.html : undefined,
      markdown: typeof parsed.markdown === 'string' ? parsed.markdown : undefined,
    }
  } catch {
    return null
  }
}

export function looksLikeHtml(value: string) {
  return MEANINGFUL_HTML_PATTERN.test(value)
}

export function looksLikeMarkdown(value: string) {
  return MARKDOWN_PATTERN.test(value)
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#10;/gi, '\n')
    .replace(/&#13;/gi, '\n')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
}

function expandFlattenedMarkdown(value: string) {
  let text = value
    .replace(/\s+(#{1,6}\s+)/g, '\n\n$1')
    .replace(/\s+(---)\s+/g, '\n\n$1\n\n')
    .replace(/\s+(-\s+`[^`]+`)/g, '\n$1')
    .replace(/\s+(-\s+\*\*[^*]+\*\*)/g, '\n$1')
    .replace(/\s+(-\s+[A-Za-z가-힣0-9(])/g, '\n$1')
    .replace(/\s+(bash\s+\$)/g, '\n\n```bash\n$')
    .replace(/\s+\$\s+ralplan/g, '\n$ ralplan')

  if (text.includes('```bash')) {
    const bashBlockCount = (text.match(/```bash/g) ?? []).length
    const closingFenceCount = (text.match(/\n```/g) ?? []).length
    if (bashBlockCount > closingFenceCount) {
      text = `${text}\n\`\`\``
    }
  }

  return text.trim()
}

function extractMarkdownFromSimpleHtml(html: string) {
  const tags = html.match(/<[^>]+>/g) ?? []
  if (tags.some((tag) => !SIMPLE_WRAPPER_ONLY_PATTERN.test(tag.trim()))) {
    return null
  }

  const text = decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*<p(?:\s[^>]*)?>/gi, '\n\n')
      .replace(/<\/div>\s*<div(?:\s[^>]*)?>/gi, '\n\n')
      .replace(/<\/?(?:p|div)(?:\s[^>]*)?>/gi, '')
      .trim(),
  )

  const expanded = expandFlattenedMarkdown(text)
  if (looksLikeMarkdown(expanded)) {
    return expanded
  }

  return looksLikeMarkdown(text) ? text : null
}

function extractHtmlCodeFromSimpleHtml(html: string) {
  const tags = html.match(/<[^>]+>/g) ?? []
  if (tags.some((tag) => !SIMPLE_WRAPPER_ONLY_PATTERN.test(tag.trim()))) {
    return null
  }

  const text = decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*<p(?:\s[^>]*)?>/gi, '\n\n')
      .replace(/<\/div>\s*<div(?:\s[^>]*)?>/gi, '\n\n')
      .replace(/<\/?(?:p|div)(?:\s[^>]*)?>/gi, '')
      .trim(),
  )

  return looksLikeHtml(text) ? text : null
}

export function renderMarkdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const blocks: string[] = []
  const paragraphLines: string[] = []
  const blockquoteLines: string[] = []
  const listItems: string[] = []
  const codeLines: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let inCodeBlock = false
  let codeBlockLanguage: string | null = null

  const flushAll = () => {
    flushParagraph(paragraphLines, blocks)
    flushList(listType, listItems, blocks)
    listType = null
    flushBlockquote(blockquoteLines, blocks)
  }

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()

    const fenceMatch = line.trim().match(/^```(\w[\w-]*)?\s*$/)
    if (fenceMatch) {
      flushParagraph(paragraphLines, blocks)
      flushList(listType, listItems, blocks)
      listType = null
      flushBlockquote(blockquoteLines, blocks)

      if (inCodeBlock) {
        flushCodeBlock(codeLines, blocks, codeBlockLanguage)
        inCodeBlock = false
        codeBlockLanguage = null
      } else {
        inCodeBlock = true
        codeBlockLanguage = fenceMatch[1]?.toLowerCase() ?? null
      }
      continue
    }

    if (inCodeBlock) {
      codeLines.push(rawLine)
      continue
    }

    if (line.trim() === '') {
      flushAll()
      continue
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      flushAll()
      const level = headingMatch[1].length
      blocks.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`)
      continue
    }

    const blockquoteMatch = line.match(/^>\s?(.*)$/)
    if (blockquoteMatch) {
      flushParagraph(paragraphLines, blocks)
      flushList(listType, listItems, blocks)
      listType = null
      blockquoteLines.push(blockquoteMatch[1])
      continue
    }

    const orderedMatch = line.match(/^\d+\.\s+(.*)$/)
    if (orderedMatch) {
      flushParagraph(paragraphLines, blocks)
      flushBlockquote(blockquoteLines, blocks)
      if (listType && listType !== 'ol') {
        flushList(listType, listItems, blocks)
      }
      listType = 'ol'
      listItems.push(orderedMatch[1])
      continue
    }

    const unorderedMatch = line.match(/^[-*+]\s+(.*)$/)
    if (unorderedMatch) {
      flushParagraph(paragraphLines, blocks)
      flushBlockquote(blockquoteLines, blocks)
      if (listType && listType !== 'ul') {
        flushList(listType, listItems, blocks)
      }
      listType = 'ul'
      listItems.push(unorderedMatch[1])
      continue
    }

    flushList(listType, listItems, blocks)
    listType = null
    flushBlockquote(blockquoteLines, blocks)
    paragraphLines.push(line.trim())
  }

  if (inCodeBlock) {
    flushCodeBlock(codeLines, blocks, codeBlockLanguage)
  }

  flushAll()

  return blocks.join('\n')
}

export function resolveBlogRenderableHtml(raw: string | null | undefined) {
  const parsed = parseBlogContentJson(raw)
  if (!parsed) {
    return ''
  }

  const markdown = parsed.markdown?.trim() ?? ''
  const html = parsed.html?.trim() ?? ''

  if (markdown) {
    return renderMarkdownToHtml(markdown)
  }

  if (!html) {
    return ''
  }

  const wrappedMarkdown = extractMarkdownFromSimpleHtml(html)
  if (wrappedMarkdown) {
    return renderMarkdownToHtml(wrappedMarkdown)
  }

  if (looksLikeHtml(html) || !looksLikeMarkdown(html)) {
    return html
  }

  return renderMarkdownToHtml(html)
}

export function resolveBlogRenderableContent(
  content: BlogContentPayload | null | undefined,
  legacyContentJson?: string | null,
) {
  const markdown = content?.markdown?.trim() ?? ''
  const html = content?.html?.trim() ?? ''

  if (markdown || html) {
    return resolveBlogRenderableHtml(JSON.stringify({ html: content?.html, markdown: content?.markdown }))
  }

  return resolveBlogRenderableHtml(legacyContentJson)
}

export function normalizeBlogHtmlForSave(html: string) {
  const trimmed = html.trim()
  if (!trimmed) {
    return ''
  }

  const rawHtml = extractHtmlCodeFromSimpleHtml(trimmed)
  if (rawHtml) {
    return rawHtml
  }

  const markdown = extractMarkdownFromSimpleHtml(trimmed)
  if (markdown) {
    return renderMarkdownToHtml(markdown)
  }

  return trimmed
}
