export interface HtmlFormContent {
  html?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function readFormDataString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

export function readCommaSeparatedFormData(formData: FormData, key: string) {
  return readFormDataString(formData, key)
    .split(',')
    .map((tag) => tag.trim())
}

export function parseHtmlFormContent(raw: string): HtmlFormContent {
  if (!raw) {
    return {}
  }

  const parsed = JSON.parse(raw) as unknown
  if (!isRecord(parsed)) {
    return {}
  }

  return typeof parsed.html === 'string' ? { html: parsed.html } : {}
}

export function parseJsonRecord(raw: string): Record<string, unknown> {
  if (!raw) {
    return {}
  }

  const parsed = JSON.parse(raw) as unknown
  return isRecord(parsed) ? parsed : {}
}
