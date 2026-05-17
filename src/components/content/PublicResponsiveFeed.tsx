"use client"

import Image from 'next/image'
import Link from 'next/link'
import { BriefcaseBusiness } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { BlogListItem, PagedBlogsPayload } from '@/lib/api/blogs'
import type { PagedWorksPayload, WorkListItem } from '@/lib/api/works'

type FeedKind = 'blog' | 'works'
type FeedItem = BlogListItem | WorkListItem
type FeedPayload = PagedBlogsPayload | PagedWorksPayload
type ViewportMode = 'mobile' | 'tablet' | 'desktop'

interface PublicResponsiveFeedProps {
  kind: FeedKind
  query: string
  desktopPayload: FeedPayload
  mobileInitialPayload: FeedPayload
  desktopReturnTo: string
}

interface StudyMobileRestoreState {
  query: string
  loadedPageCount: number
  pageSize: number
  scrollY: number
  restoreOnHistoryReturn?: boolean
}

const MOBILE_PAGE_SIZE = 10
const studyRestoreStorageKey = 'woong-study-mobile-feed-state'
const studyRestoreHistoryKey = '__studyFeedRestore'
const loadMoreErrorMessage = 'Failed to load more items.'
const restoreErrorMessage = 'Failed to restore the Study feed.'

function formatDateOrUnknown(publishedAt: string | null | undefined, options: Intl.DateTimeFormatOptions) {
  if (!publishedAt) {
    return 'Unknown Date'
  }

  const date = new Date(publishedAt)
  if (Number.isNaN(date.getTime())) {
    return 'Unknown Date'
  }

  return date.toLocaleDateString('en-US', options)
}

function formatBlogDate(publishedAt?: string | null) {
  return formatDateOrUnknown(publishedAt, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatWorkDate(publishedAt?: string | null) {
  return formatDateOrUnknown(publishedAt, {
    year: 'numeric',
    month: 'short',
  })
}

function isWorkItem(item: FeedItem): item is WorkListItem {
  return 'category' in item
}

function buildMobileReturnTo(kind: FeedKind, query: string) {
  const pathname = kind === 'blog' ? '/blog' : '/works'
  const params = new URLSearchParams({
    page: '1',
    pageSize: String(MOBILE_PAGE_SIZE),
  })

  if (query) {
    params.set('query', query)
  }

  return encodeURIComponent(`${pathname}?${params.toString()}`)
}

function buildApiUrl(kind: FeedKind, page: number, query: string) {
  const endpoint = kind === 'blog' ? '/api/public/blogs' : '/api/public/works'
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(MOBILE_PAGE_SIZE),
  })

  if (query) {
    params.set('query', query)
  }

  return `${endpoint}?${params.toString()}`
}

function dedupeItems(existing: FeedItem[], incoming: FeedItem[]) {
  const seen = new Set(existing.map((item) => item.id))
  const next = [...existing]

  for (const item of incoming) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      next.push(item)
    }
  }

  return next
}

function resolveViewportMode() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'desktop' as ViewportMode
  }

  if (window.matchMedia('(max-width: 767px)').matches) {
    return 'mobile' as ViewportMode
  }

  if (window.matchMedia('(max-width: 1023px)').matches) {
    return 'tablet' as ViewportMode
  }

  return 'desktop' as ViewportMode
}

function isStudyMobileRestoreState(value: unknown): value is StudyMobileRestoreState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Record<string, unknown>
  return typeof record.query === 'string'
    && typeof record.loadedPageCount === 'number'
    && typeof record.pageSize === 'number'
    && typeof record.scrollY === 'number'
    && (typeof record.restoreOnHistoryReturn === 'undefined' || typeof record.restoreOnHistoryReturn === 'boolean')
}

function readStudyHistoryRestoreState(query: string) {
  const historyState = typeof window !== 'undefined'
    ? (window.history.state as Record<string, unknown> | null)?.[studyRestoreHistoryKey]
    : null

  if (isStudyMobileRestoreState(historyState) && historyState.query === query) {
    return historyState
  }

  return null
}

function readStudySessionRestoreState(query: string) {
  if (typeof window === 'undefined') {
    return null
  }

  const rawSessionState = window.sessionStorage.getItem(studyRestoreStorageKey)
  if (!rawSessionState) {
    return null
  }

  try {
    const parsed = JSON.parse(rawSessionState) as unknown
    return isStudyMobileRestoreState(parsed) && parsed.query === query ? parsed : null
  } catch {
    return null
  }
}

function persistStudyRestoreState(state: StudyMobileRestoreState) {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(studyRestoreStorageKey, JSON.stringify(state))
  const currentState = window.history.state && typeof window.history.state === 'object'
    ? window.history.state as Record<string, unknown>
    : {}
  window.history.replaceState(
    {
      ...currentState,
      [studyRestoreHistoryKey]: state,
    },
    '',
    window.location.href,
  )
}

export function PublicResponsiveFeed({
  kind,
  query,
  desktopPayload,
  mobileInitialPayload,
  desktopReturnTo,
}: PublicResponsiveFeedProps) {
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop')
  const [hasResolvedViewport, setHasResolvedViewport] = useState(false)
  const [items, setItems] = useState<FeedItem[]>(mobileInitialPayload.items)
  const [page, setPage] = useState(mobileInitialPayload.page)
  const [totalPages, setTotalPages] = useState(Math.max(1, mobileInitialPayload.totalPages))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isReadingRestoreActive, setIsReadingRestoreActive] = useState(false)
  const loadingRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const restoredSignatureRef = useRef<string | null>(null)
  const previousQueryRef = useRef(query)
  const readingRestoreActiveRef = useRef(false)

  useEffect(() => {
    const syncMode = () => {
      setViewportMode(resolveViewportMode())
      setHasResolvedViewport(true)
    }

    syncMode()
    window.addEventListener('resize', syncMode)
    window.addEventListener('pageshow', syncMode)

    return () => {
      window.removeEventListener('resize', syncMode)
      window.removeEventListener('pageshow', syncMode)
    }
  }, [])

  useEffect(() => {
    const queryChanged = previousQueryRef.current !== query
    previousQueryRef.current = query

    const pendingHistoryRestore = kind === 'blog'
      ? readStudySessionRestoreState(query)?.restoreOnHistoryReturn === true
      : false

    if (!queryChanged && (readingRestoreActiveRef.current || isReadingRestoreActive || pendingHistoryRestore)) {
      return
    }

    readingRestoreActiveRef.current = false
    setItems(mobileInitialPayload.items)
    setPage(mobileInitialPayload.page)
    setTotalPages(Math.max(1, mobileInitialPayload.totalPages))
    setError(null)
    setIsReadingRestoreActive(false)
    restoredSignatureRef.current = null
  }, [isReadingRestoreActive, kind, mobileInitialPayload, query])

  const isCompact = viewportMode !== 'desktop'
  const isStudyMobileAuto = kind === 'blog' && viewportMode === 'mobile'
  const isMobileAutoInfinite = viewportMode === 'mobile'
  const canRestoreStudyReadingState = hasResolvedViewport && kind === 'blog' && viewportMode === 'mobile'
  const hasMore = page < totalPages

  const fetchPage = useCallback(async (targetPage: number) => {
    const response = await fetch(buildApiUrl(kind, targetPage, query), {
      credentials: 'same-origin',
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(loadMoreErrorMessage)
    }

    return await response.json() as FeedPayload
  }, [kind, query])

  const appendPayload = useCallback((payload: FeedPayload) => {
    setItems((currentItems) => dedupeItems(currentItems, payload.items))
    setPage(payload.page)
    setTotalPages(Math.max(1, payload.totalPages))
  }, [])

  const markStudyHistoryReturnRestore = useCallback(() => {
    if (kind !== 'blog' || viewportMode !== 'mobile') {
      return
    }

    persistStudyRestoreState({
      query,
      loadedPageCount: page,
      pageSize: MOBILE_PAGE_SIZE,
      scrollY: window.scrollY,
      restoreOnHistoryReturn: true,
    })
  }, [kind, page, query, viewportMode])

  const loadNextPage = useCallback(async () => {
    if (!isCompact || !hasMore || loadingRef.current) {
      return
    }

    const nextPage = page + 1
    loadingRef.current = true
    setLoading(true)
    setError(null)

    try {
      appendPayload(await fetchPage(nextPage))
    } catch {
      setError(loadMoreErrorMessage)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [appendPayload, fetchPage, hasMore, isCompact, page])

  useEffect(() => {
    if (!isMobileAutoInfinite || isRestoring || !hasMore || !sentinelRef.current) {
      return
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        void loadNextPage()
      }
    }, {
      rootMargin: '240px 0px',
      threshold: 0,
    })

    observer.observe(sentinelRef.current)

    return () => {
      observer.disconnect()
    }
  }, [hasMore, isMobileAutoInfinite, isRestoring, loadNextPage])

  useEffect(() => {
    if (!canRestoreStudyReadingState) {
      return
    }

    const sessionState = readStudySessionRestoreState(query)
    const historyState = readStudyHistoryRestoreState(query)
    const storedState = historyState ?? sessionState
    if (!storedState || storedState.pageSize !== MOBILE_PAGE_SIZE) {
      return
    }

    const signature = `${storedState.query}:${storedState.loadedPageCount}:${storedState.scrollY}`
    if (restoredSignatureRef.current === signature) {
      return
    }

    restoredSignatureRef.current = signature

    if (storedState.loadedPageCount <= 1 && storedState.scrollY <= 0) {
      return
    }

    let cancelled = false
    let restoreCompleted = false

    const restore = async () => {
      loadingRef.current = true
      setLoading(true)
      setIsRestoring(true)
      readingRestoreActiveRef.current = true
      setIsReadingRestoreActive(true)
      setError(null)

      try {
        let nextItems = mobileInitialPayload.items
        let nextPage = mobileInitialPayload.page
        let nextTotalPages = Math.max(1, mobileInitialPayload.totalPages)

        for (let targetPage = mobileInitialPayload.page + 1; targetPage <= storedState.loadedPageCount; targetPage += 1) {
          const payload = await fetchPage(targetPage)
          if (cancelled) {
            return
          }

          nextItems = dedupeItems(nextItems, payload.items)
          nextPage = payload.page
          nextTotalPages = Math.max(1, payload.totalPages)
        }

        setItems(nextItems)
        setPage(nextPage)
        setTotalPages(nextTotalPages)
        if (!cancelled) {
          window.scrollTo(0, storedState.scrollY)
          window.requestAnimationFrame(() => window.scrollTo(0, storedState.scrollY))
          restoreCompleted = true

          window.sessionStorage.setItem(studyRestoreStorageKey, JSON.stringify({
            ...storedState,
            restoreOnHistoryReturn: false,
          }))
        }
      } catch {
        if (!cancelled) {
          setError(restoreErrorMessage)
        }
      } finally {
        if (!cancelled) {
          loadingRef.current = false
          setLoading(false)
          setIsRestoring(false)
        }
      }
    }

    void restore()

    return () => {
      cancelled = true
      if (!restoreCompleted) {
        loadingRef.current = false
        if (restoredSignatureRef.current === signature) {
          restoredSignatureRef.current = null
        }
      }
    }
  }, [canRestoreStudyReadingState, fetchPage, mobileInitialPayload.items, mobileInitialPayload.page, mobileInitialPayload.totalPages, query, viewportMode])

  useEffect(() => {
    if (viewportMode === 'mobile' || !isReadingRestoreActive) {
      return
    }

    readingRestoreActiveRef.current = false
    setIsReadingRestoreActive(false)
    restoredSignatureRef.current = null
  }, [isReadingRestoreActive, viewportMode])

  useEffect(() => {
    if (!isStudyMobileAuto || resolveViewportMode() !== 'mobile') {
      return
    }

    const saveState = () => {
      if (resolveViewportMode() !== 'mobile') {
        return
      }

      if (readStudySessionRestoreState(query)?.restoreOnHistoryReturn) {
        return
      }

      persistStudyRestoreState({
        query,
        loadedPageCount: page,
        pageSize: MOBILE_PAGE_SIZE,
        scrollY: window.scrollY,
        restoreOnHistoryReturn: false,
      })
    }

    const scheduleSave = () => {
      window.requestAnimationFrame(saveState)
    }

    saveState()
    window.addEventListener('scroll', scheduleSave, { passive: true })

    return () => {
      window.removeEventListener('scroll', scheduleSave)
    }
  }, [isStudyMobileAuto, page, query])

  const shouldUseRestoredReadingState = kind === 'blog' && isReadingRestoreActive
  const renderedItems = isCompact || shouldUseRestoredReadingState ? items : desktopPayload.items
  const returnTo = isCompact || shouldUseRestoredReadingState ? buildMobileReturnTo(kind, query) : desktopReturnTo
  const relatedPage = isCompact || shouldUseRestoredReadingState ? 1 : desktopPayload.page
  const feedMode = shouldUseRestoredReadingState ? 'restored-reading' : isMobileAutoInfinite ? 'auto-infinite' : isCompact ? 'load-more' : 'pagination'
  const emptyText = kind === 'blog'
    ? query ? 'No studies found.' : 'No blog posts found.'
    : query ? 'No matching works found.' : 'No works found.'
  const gridClassName = shouldUseRestoredReadingState
    ? 'mx-auto grid max-w-2xl gap-5'
    : kind === 'blog'
      ? 'grid gap-5 md:grid-cols-2 xl:grid-cols-3'
    : 'grid gap-5 md:grid-cols-2 xl:grid-cols-4'

  return (
    <>
      <div data-testid={`${kind}-responsive-feed`} data-feed-mode={feedMode}>
        <div
          data-testid={kind === 'blog' ? 'blog-grid' : 'works-grid'}
          data-feed-testid={`${kind}-responsive-feed`}
          data-feed-mode={feedMode}
          data-feed-layout={shouldUseRestoredReadingState ? 'reading-restore' : undefined}
          className={gridClassName}
        >
          {renderedItems.length > 0 ? (
            renderedItems.map((item) => (
              kind === 'blog'
                ? <BlogCard key={item.id} item={item as BlogListItem} returnTo={returnTo} relatedPage={relatedPage} onNavigate={markStudyHistoryReturnRestore} />
                : <WorkCard key={item.id} item={item as WorkListItem} returnTo={returnTo} relatedPage={relatedPage} />
            ))
          ) : (
            <div className={kind === 'blog' ? 'py-20 text-center text-muted-foreground' : 'col-span-full rounded-2xl border border-dashed border-border/80 bg-muted/30 px-6 py-20 text-center text-muted-foreground'}>
              {emptyText}
            </div>
          )}
        </div>
      </div>

      {isCompact ? (
        <div className="mt-8 flex flex-col items-center gap-3" data-testid={`${kind}-infinite-controls`}>
          {error ? (
            <p role="status" className="text-sm text-destructive">{error}</p>
          ) : null}
          {isMobileAutoInfinite ? (
            <>
              {hasMore ? (
                <div ref={sentinelRef} data-testid={`${kind}-load-sentinel`} className="h-1 w-full" aria-hidden="true" />
              ) : null}
              {loading ? <p className="text-sm text-muted-foreground" role="status">Loading...</p> : null}
            </>
          ) : hasMore ? (
            <button
              type="button"
              data-testid={`${kind}-load-more`}
              onClick={() => void loadNextPage()}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-70"
            >
              {loading ? 'Loading...' : 'Load more'}
            </button>
          ) : null}
          {!hasMore ? (
            <p className="text-sm text-muted-foreground" role="status">End of list</p>
          ) : null}
        </div>
      ) : null}
    </>
  )
}

function BlogCard({
  item,
  returnTo,
  relatedPage,
  onNavigate,
}: {
  item: BlogListItem
  returnTo: string
  relatedPage: number
  onNavigate?: () => void
}) {
  return (
    <Link
      href={`/blog/${item.slug}?returnTo=${returnTo}&relatedPage=${relatedPage}`}
      prefetch={false}
      onClick={onNavigate}
      className="group/card block h-full min-w-0"
      data-testid="blog-card"
    >
      <Card className="responsive-feed-card flex h-full min-w-0 flex-col gap-0 overflow-hidden rounded-2xl border-border/80 bg-background py-0 shadow-sm transition hover:border-primary/30 hover:shadow-md">
        <div data-testid="blog-card-accent-stripe" className="study-card-stripe h-1 w-full rounded-t-2xl" />
        <CardHeader className="min-w-0 px-4 pt-4 pb-0 sm:px-5 sm:pt-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full bg-brand-navy px-2.5 py-0.5 text-xs text-white hover:bg-brand-navy/90">
              {formatBlogDate(item.publishedAt)}
            </Badge>
            {item.tags?.map((tag) => (
              <span key={tag} className="max-w-full rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground [overflow-wrap:anywhere]">
                {tag}
              </span>
            ))}
          </div>
          <CardTitle className="responsive-feed-title line-clamp-2 min-w-0 break-words text-lg font-heading font-bold leading-tight text-foreground transition-colors [overflow-wrap:anywhere] group-hover/card:text-brand-accent sm:text-xl">
            {item.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-w-0 flex-1 flex-col px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
          {item.excerpt ? (
            <p className="responsive-feed-copy line-clamp-3 min-w-0 flex-1 break-words text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere] sm:text-base">
              {item.excerpt}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  )
}

function WorkCard({ item, returnTo, relatedPage }: { item: WorkListItem; returnTo: string; relatedPage: number }) {
  const thumbnailUrl = item.thumbnailUrl ?? null
  const publishDate = formatWorkDate(item.publishedAt)
  const category = isWorkItem(item) ? item.category : ''
  const excerpt = item.excerpt?.trim() || `${category || 'Selected'} work.`

  return (
    <Link
      href={`/works/${item.slug}?returnTo=${returnTo}&relatedPage=${relatedPage}`}
      prefetch={false}
      className="group/card block h-full"
      data-testid="work-card"
    >
      <article className="responsive-feed-card works-feed-card flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-background shadow-sm transition hover:border-primary/30 hover:shadow-md">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={item.title}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              className="responsive-feed-image object-cover transition-transform duration-500 group-hover/card:scale-105"
            />
          ) : (
            <div data-testid="work-card-no-image-placeholder" className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-muted/80 text-muted-foreground">
              <BriefcaseBusiness className="h-8 w-8" aria-hidden="true" />
              <span className="text-xs font-medium">No Image</span>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full bg-brand-navy px-2.5 py-0.5 text-xs text-white hover:bg-brand-navy/90">
              {publishDate}
            </Badge>
            <span className="responsive-feed-copy text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {category}
            </span>
          </div>
          <h2 className="responsive-feed-title works-feed-title line-clamp-2 text-lg font-heading font-bold leading-tight text-foreground transition-colors group-hover/card:text-brand-accent sm:text-xl">
            {item.title}
          </h2>
          <p className="responsive-feed-copy works-feed-excerpt mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-foreground/80">
            {excerpt}
          </p>
          <div className="works-feed-tags mt-4 flex flex-wrap content-start gap-1.5 overflow-hidden">
            {item.tags?.slice(0, 2).map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </article>
    </Link>
  )
}
