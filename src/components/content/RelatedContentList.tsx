"use client"

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useResponsivePageSize } from '@/hooks/useResponsivePageSize'

interface RelatedContentItem {
  id: string
  slug: string
  title: string
  excerpt: string
  publishedAt?: string | null
  tags?: string[]
  category?: string
}

interface RelatedContentListProps {
  heading: string
  hrefBase: '/blog' | '/works'
  items: RelatedContentItem[]
  currentItemId?: string
  desktopPageSize?: number
  tabletPageSize?: number
  mobilePageSize?: number
  testIdBase: string
  centerCurrentOnInitialPage?: boolean
}

const relatedDateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function formatPublishedDate(publishedAt?: string | null) {
  if (!publishedAt) {
    return '—'
  }

  const date = new Date(publishedAt)
  return Number.isNaN(date.getTime()) ? '—' : relatedDateFormatter.format(date)
}

interface RelatedContentPagerProps extends RelatedContentListProps {
  pageSize: number
}

function getPageWindow(currentPage: number, totalPages: number, radius = 2) {
  const windowSize = radius * 2 + 1
  const start = Math.max(1, Math.min(currentPage - radius, totalPages - windowSize + 1))
  const end = Math.min(totalPages, start + windowSize - 1)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function resolveInitialPage(
  searchParams: URLSearchParams,
  items: RelatedContentItem[],
  currentItemId: string | undefined,
  pageSize: number,
  centerCurrentOnInitialPage: boolean,
) {
  const requestedPage = Number.parseInt(searchParams.get('relatedPage') ?? '', 10)
  if (Number.isFinite(requestedPage) && requestedPage > 0) {
    return requestedPage
  }

  if (!currentItemId) {
    return 1
  }

  const currentIndex = items.findIndex((item) => item.id === currentItemId)
  if (currentIndex < 0) {
    return 1
  }

  if (!centerCurrentOnInitialPage || pageSize < 5 || items.length <= pageSize) {
    return Math.floor(currentIndex / pageSize) + 1
  }

  const totalWindows = Math.max(1, items.length - pageSize + 1)
  const centeredWindow = currentIndex - Math.floor(pageSize / 2) + 1
  const boundedCenteredWindow = Math.max(1, Math.min(totalWindows, centeredWindow))
  return boundedCenteredWindow
}

function RelatedContentPager({
  heading,
  hrefBase,
  items,
  currentItemId,
  pageSize,
  testIdBase,
  centerCurrentOnInitialPage = false,
}: RelatedContentPagerProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const initialPage = resolveInitialPage(searchParams, items, currentItemId, pageSize, centerCurrentOnInitialPage)
  const [page, setPage] = useState(initialPage)
  const useSlidingWindow = centerCurrentOnInitialPage && pageSize >= 5
  const totalPages = useSlidingWindow
    ? Math.max(1, items.length - pageSize + 1)
    : Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, totalPages)

  const visibleItems = useMemo(() => {
    const start = useSlidingWindow
      ? currentPage - 1
      : (currentPage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [currentPage, items, pageSize, useSlidingWindow])

  const pageWindow = getPageWindow(currentPage, totalPages)

  const updateRelatedPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('relatedPage', String(nextPage))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    setPage(nextPage)
  }

  if (items.length === 0) {
    return null
  }

  const isBlogList = hrefBase === '/blog'
  const followUpCopy = isBlogList
    ? 'Continue through adjacent writing without losing your place.'
    : 'Move through neighboring case studies without resetting the page.'

  return (
    <section className="mt-12 space-y-5 bg-white dark:bg-background">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-heading font-bold text-foreground text-balance">{heading}</h2>
          <p className="max-w-2xl text-sm text-muted-foreground text-pretty">{followUpCopy}</p>
        </div>
        <span className="shrink-0 rounded-full border border-border/80 bg-white px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground dark:bg-card">
          {visibleItems.length} visible
        </span>
      </div>

      <div data-testid={`${testIdBase}-grid`} className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleItems.map((item) => {
          const card = (
            <article
              className={[
                'responsive-feed-card flex h-full flex-col overflow-hidden rounded-2xl bg-white py-0 shadow-sm transition dark:bg-card',
                item.id === currentItemId
                  ? 'border-2 border-brand-accent ring-1 ring-brand-accent/20'
                  : 'border border-border/80 hover:border-primary/30 hover:shadow-md',
              ].join(' ')}
            >
              {isBlogList ? (
                <div aria-hidden="true" className="study-card-stripe h-1 w-full" />
              ) : null}
              <div className="flex flex-1 flex-col p-4 sm:p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                  <time dateTime={item.publishedAt ?? undefined} className="font-mono tabular-nums">
                    {formatPublishedDate(item.publishedAt)}
                  </time>
                  {item.category ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {item.category}
                    </span>
                  ) : null}
                  {item.id === currentItemId ? (
                    <span className="rounded-full bg-brand-accent px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-white">
                      Current
                    </span>
                  ) : null}
                </div>
                <h3 className="responsive-feed-title line-clamp-2 min-w-0 break-words text-lg font-heading font-bold leading-tight text-foreground text-pretty sm:text-xl">
                  {item.title}
                </h3>
                {item.excerpt && item.id !== currentItemId ? (
                  <p className="mt-2 line-clamp-2 min-w-0 flex-1 break-words text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
                    {item.excerpt}
                  </p>
                ) : (
                  <div className="flex-1" aria-hidden="true" />
                )}
                {item.tags?.length ? (
                  <ul aria-hidden="true" className="responsive-feed-copy mt-3 flex flex-wrap gap-2">
                    {item.tags.slice(0, 1).map((tag) => (
                      <li
                        key={tag}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                      >
                        #{tag}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </article>
          )

          if (item.id === currentItemId) {
            return (
              <div
                key={item.id}
                data-testid={`${testIdBase}-current-card`}
              >
                {card}
              </div>
            )
          }

          return (
            <Link
              key={item.id}
              href={`${hrefBase}/${item.slug}?relatedPage=${currentPage}`}
              prefetch={false}
              className="group block h-full"
              data-testid={`${testIdBase}-card`}
            >
              {card}
            </Link>
          )
        })}
      </div>

      <nav aria-label={`${heading} pagination`} className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm dark:bg-card">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {pageWindow.map((pageNumber) => (
            <Button
              key={pageNumber}
              type="button"
              variant={pageNumber === currentPage ? 'default' : 'outline'}
              size="sm"
              aria-current={pageNumber === currentPage ? 'page' : undefined}
              aria-label={`Go to page ${pageNumber}`}
              onClick={() => updateRelatedPage(pageNumber)}
            >
              {pageNumber}
            </Button>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            aria-label="Go to first related page"
            onClick={() => updateRelatedPage(1)}
          >
            First
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            aria-label="Go to previous related page"
            onClick={() => updateRelatedPage(Math.max(1, currentPage - 1))}
          >
            Previous
          </Button>
          <span className="text-sm tabular-nums text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            aria-label="Go to next related page"
            onClick={() => updateRelatedPage(Math.min(totalPages, currentPage + 1))}
          >
            Next
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            aria-label="Go to last related page"
            onClick={() => updateRelatedPage(totalPages)}
          >
            Last
          </Button>
        </div>
      </nav>
    </section>
  )
}

export function RelatedContentList({
  desktopPageSize = 6,
  tabletPageSize = 4,
  mobilePageSize = 2,
  centerCurrentOnInitialPage = false,
  ...props
}: RelatedContentListProps) {
  const pageSize = useResponsivePageSize(desktopPageSize, tabletPageSize, mobilePageSize)

  if (props.items.length === 0) {
    return null
  }

  return (
    <RelatedContentPager
      key={`${pageSize}-${props.items.length}-${centerCurrentOnInitialPage ? 'centered' : 'paged'}`}
      {...props}
      pageSize={pageSize}
      centerCurrentOnInitialPage={centerCurrentOnInitialPage}
    />
  )
}
