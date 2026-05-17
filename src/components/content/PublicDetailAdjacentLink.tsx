"use client"

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface PublicDetailAdjacentLinkProps {
  hrefBase: '/blog' | '/works'
  slug: string
  label: 'Next' | 'Previous'
  title: string
  alignEnd?: boolean
}

function resolveSafeReturnTo(returnTo?: string | null) {
  if (!returnTo) {
    return null
  }

  let decodedReturnTo = returnTo

  try {
    decodedReturnTo = decodeURIComponent(returnTo)
  } catch {
    decodedReturnTo = returnTo
  }

  if (!decodedReturnTo.startsWith('/') || decodedReturnTo.startsWith('//')) {
    return null
  }

  return decodedReturnTo
}

function buildDetailQuerySuffix(searchParams: URLSearchParams) {
  const params = new URLSearchParams()
  const returnTo = resolveSafeReturnTo(searchParams.get('returnTo'))
  const relatedPage = searchParams.get('relatedPage')

  if (returnTo) {
    params.set('returnTo', returnTo)
  }

  if (relatedPage) {
    params.set('relatedPage', relatedPage)
  }

  const query = params.toString()
  return query ? `?${query}` : ''
}

export function PublicDetailAdjacentLink({
  hrefBase,
  slug,
  label,
  title,
  alignEnd = false,
}: PublicDetailAdjacentLinkProps) {
  const searchParams = useSearchParams()
  const href = `${hrefBase}/${slug}${buildDetailQuerySuffix(searchParams)}`

  return (
    <Link
      href={href}
      prefetch={false}
      className={[
        'group rounded-2xl border border-border/80 bg-white p-4 transition hover:border-primary/30 hover:shadow-sm dark:bg-card',
        alignEnd ? 'text-left sm:justify-self-end' : '',
      ].join(' ')}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-base font-semibold text-foreground text-balance transition-colors group-hover:text-brand-accent">{title}</p>
    </Link>
  )
}
