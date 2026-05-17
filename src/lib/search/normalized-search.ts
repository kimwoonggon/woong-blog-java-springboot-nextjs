export function normalizeSearchText(value: string | null | undefined) {
  const text = value ?? ''
  const normalized = typeof text.normalize === 'function' ? text.normalize('NFKC') : text

  return normalized
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

export function containsNormalizedSearch(value: string | null | undefined, query: string | null | undefined) {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) {
    return true
  }

  return normalizeSearchText(value).includes(normalizedQuery)
}

export function anyContainsNormalizedSearch(values: Array<string | null | undefined>, query: string | null | undefined) {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) {
    return true
  }

  return values.some((value) => normalizeSearchText(value).includes(normalizedQuery))
}
