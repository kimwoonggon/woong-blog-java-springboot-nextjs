import { describe, expect, it } from 'vitest'
import { sanitizeHtml } from '@/lib/content/html-sanitizer'

function parseSanitizedFragment(html: string) {
  const template = document.createElement('template')
  template.innerHTML = html
  return template.content
}

function withoutDocument<T>(callback: () => T) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: undefined,
  })

  try {
    return callback()
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, 'document', descriptor)
    } else {
      Reflect.deleteProperty(globalThis, 'document')
    }
  }
}

describe('html sanitizer', () => {
  it('removes event handlers and protocol-relative urls while preserving safe links and images', () => {
    const fragment = parseSanitizedFragment(sanitizeHtml(`
      <p>
        <a href="//evil.example/phish" target="_blank" onclick="alert(1)">bad link</a>
        <img src="//evil.example/tracker.png" onerror="alert(1)" alt="tracker">
        <a href="/safe" target="_blank">safe link</a>
        <img src="data:image/png;base64,AAAA" alt="pixel">
      </p>
    `))

    const badLink = fragment.querySelector('a')
    const unsafeImage = fragment.querySelector('img[alt="tracker"]')
    const safeLink = fragment.querySelector('a[href="/safe"]')
    const safeImage = fragment.querySelector('img[alt="pixel"]')

    expect(badLink?.getAttribute('href')).toBeNull()
    expect(badLink?.getAttribute('onclick')).toBeNull()
    expect(badLink?.getAttribute('rel')).toBe('noopener noreferrer')
    expect(unsafeImage?.getAttribute('src')).toBeNull()
    expect(unsafeImage?.getAttribute('onerror')).toBeNull()
    expect(safeLink?.getAttribute('href')).toBe('/safe')
    expect(safeLink?.getAttribute('rel')).toBe('noopener noreferrer')
    expect(safeImage?.getAttribute('src')).toBe('data:image/png;base64,AAAA')
  })

  it('keeps the server fallback from leaking unquoted handlers or unsafe urls', () => {
    const output = withoutDocument(() => sanitizeHtml(`
      <p>
        <img src=javascript:alert(1) onerror=alert(1) alt="bad">
        <a href=javascript:alert(1) onclick=alert(1)>bad link</a>
        <img src="//evil.example/tracker.png" alt="tracker">
        <script>throw new Error("leak")</script>
        <a href="/safe">safe link</a>
      </p>
    `))

    expect(output).not.toMatch(/javascript:|onerror|onclick|evil\.example|<script|throw new Error/i)
    expect(output).toContain('<a href="/safe">safe link</a>')
  })
})
