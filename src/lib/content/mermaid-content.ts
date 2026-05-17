export type MermaidContentSegment =
  | { type: 'html'; html: string }
  | { type: 'mermaid'; code: string }

export function decodeBasicHtmlEntities(value: string) {
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

export function stripMermaidForExcerpt(value: string) {
  return stripCustomMermaidBlocks(value)
}

function stripCustomMermaidBlocks(value: string) {
  const segments = splitCustomMermaidBlocks(value)
  return segments
    .filter((segment): segment is { type: 'html'; html: string } => segment.type === 'html')
    .map((segment) => segment.html)
    .join(' ')
}

function extractAttribute(attributes: string, attributeName: string) {
  const pattern = new RegExp(`${attributeName}=(["'])([\\s\\S]*?)\\1`, 'i')
  return pattern.exec(attributes)?.[2] ?? ''
}

function findTagEnd(htmlContent: string, startIndex: number) {
  let quote: '"' | "'" | null = null

  for (let index = startIndex; index < htmlContent.length; index += 1) {
    const character = htmlContent[index]
    if ((character === '"' || character === "'") && htmlContent[index - 1] !== '\\') {
      quote = quote === character ? null : quote ?? character
      continue
    }

    if (character === '>' && !quote) {
      return index
    }
  }

  return -1
}

function splitCustomMermaidBlocks(htmlContent: string): MermaidContentSegment[] {
  const segments: MermaidContentSegment[] = []
  let lastIndex = 0
  let cursor = 0

  while (cursor < htmlContent.length) {
    const start = htmlContent.toLowerCase().indexOf('<mermaid-block', cursor)
    if (start < 0) {
      break
    }

    const openingEnd = findTagEnd(htmlContent, start)
    if (openingEnd < 0) {
      break
    }

    const closingStart = htmlContent.toLowerCase().indexOf('</mermaid-block>', openingEnd + 1)
    const end = closingStart >= 0 ? closingStart + '</mermaid-block>'.length : openingEnd + 1

    if (start > lastIndex) {
      segments.push({ type: 'html', html: htmlContent.slice(lastIndex, start) })
    }

    const openingTag = htmlContent.slice(start, openingEnd + 1)
    const code = decodeBasicHtmlEntities(extractAttribute(openingTag, 'data-code'))
    segments.push({ type: 'mermaid', code })

    lastIndex = end
    cursor = end
  }

  if (lastIndex < htmlContent.length) {
    segments.push({ type: 'html', html: htmlContent.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ type: 'html', html: htmlContent }]
}

export function splitMermaidContent(htmlContent: string): MermaidContentSegment[] {
  return splitCustomMermaidBlocks(htmlContent)
}

export function containsMermaidSyntax(htmlContent: string) {
  return htmlContent.toLowerCase().includes('<mermaid-block')
}
