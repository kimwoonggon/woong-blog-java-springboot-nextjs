export function clearBeforeUnloadWarning() {
  if (typeof window !== 'undefined') {
    window.onbeforeunload = null
  }
}

export function resolveReturnTo(requestedReturnTo: string | null, fallback = '/admin/works') {
  if (!requestedReturnTo) {
    return fallback
  }

  if (!requestedReturnTo.startsWith('/') || requestedReturnTo.startsWith('//')) {
    return fallback
  }

  return requestedReturnTo
}

export function buildInlineDetailQuerySuffix(searchParams: URLSearchParams) {
  const nextParams = new URLSearchParams(searchParams)
  nextParams.delete('returnTo')
  const nextQuery = nextParams.toString()
  return nextQuery ? `?${nextQuery}` : ''
}
