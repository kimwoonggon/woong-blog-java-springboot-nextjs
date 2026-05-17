const ALLOWED_TAGS = new Set([
  'a',
  'article',
  'blockquote',
  'br',
  'code',
  'details',
  'div',
  'em',
  'figcaption',
  'figure',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'hr',
  'html-snippet',
  'img',
  'li',
  'ol',
  'p',
  'pre',
  'mermaid-block',
  'section',
  'span',
  'strong',
  'summary',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'three-js-block',
  'tr',
  'ul',
  'work-video-embed',
])

const GLOBAL_ATTRIBUTES = new Set([
  'aria-label',
  'class',
  'data-video-id',
  'id',
  'title',
])

const TAG_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'rel', 'target']),
  img: new Set(['alt', 'height', 'loading', 'src', 'width']),
  'html-snippet': new Set(['html']),
  'mermaid-block': new Set(['data-code']),
  'three-js-block': new Set(['height']),
}

function isAllowedUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return false
  }

  if (trimmed.startsWith('//')) {
    return false
  }

  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return true
  }

  if (/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,/i.test(trimmed)) {
    return true
  }

  try {
    const url = new URL(trimmed)
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)
  } catch {
    return false
  }
}

function sanitizeElement(element: Element) {
  const tagName = element.tagName.toLowerCase()

  for (const child of Array.from(element.children)) {
    sanitizeElement(child)
  }

  if (!ALLOWED_TAGS.has(tagName)) {
    element.replaceWith(...Array.from(element.childNodes))
    return
  }

  const allowedAttributes = TAG_ATTRIBUTES[tagName] ?? new Set<string>()
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase()
    const value = attribute.value
    const isAllowedAttribute = GLOBAL_ATTRIBUTES.has(name) || allowedAttributes.has(name)
    const isEventHandler = name.startsWith('on')

    if (!isAllowedAttribute || isEventHandler || name === 'style') {
      element.removeAttribute(attribute.name)
      continue
    }

    if ((name === 'href' || name === 'src') && !isAllowedUrl(value)) {
      element.removeAttribute(attribute.name)
    }
  }

  if (tagName === 'a') {
    const target = element.getAttribute('target')
    if (target === '_blank') {
      element.setAttribute('rel', 'noopener noreferrer')
    }
  }
}

export function sanitizeHtml(html: string) {
  if (typeof document === 'undefined') {
    return html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/\s(?:href|src)\s*=\s*(?:"\s*(?:javascript:|\/\/)[^"]*"|'\s*(?:javascript:|\/\/)[^']*'|(?:javascript:|\/\/)[^\s>]*)/gi, '')
  }

  const template = document.createElement('template')
  template.innerHTML = html

  for (const child of Array.from(template.content.children)) {
    sanitizeElement(child)
  }

  return template.innerHTML
}
