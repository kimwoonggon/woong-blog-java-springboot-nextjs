import Link from 'next/link'

interface PublicPaginationProps {
  pathname: string
  currentPage: number
  totalPages: number
  pageSize: number
  ariaLabel: string
  queryParams?: Record<string, string | null | undefined>
}

function getPageWindow(currentPage: number, totalPages: number, windowSize = 5) {
  const half = Math.floor(windowSize / 2)
  const start = Math.max(1, Math.min(currentPage - half, totalPages - windowSize + 1))
  const end = Math.min(totalPages, start + windowSize - 1)

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

function buildPageHref(pathname: string, page: number, pageSize: number, queryParams?: Record<string, string | null | undefined>) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  params.set('pageSize', String(pageSize))

  for (const [key, value] of Object.entries(queryParams ?? {})) {
    if (value) {
      params.set(key, value)
    }
  }

  return `${pathname}?${params.toString()}`
}

export function PublicPagination({
  pathname,
  currentPage,
  totalPages,
  pageSize,
  ariaLabel,
  queryParams,
}: PublicPaginationProps) {
  const pageWindow = getPageWindow(currentPage, totalPages)

  return (
    <nav aria-label={ariaLabel} className="space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {pageWindow.map((pageNumber) => (
          <Link
            key={pageNumber}
            href={buildPageHref(pathname, pageNumber, pageSize, queryParams)}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              pageNumber === currentPage
                ? 'border-sky-400 bg-sky-500 text-white dark:border-sky-600 dark:bg-sky-600'
                : 'hover:bg-accent'
            }`}
          >
            {pageNumber}
          </Link>
        ))}
      </div>
      <div className="flex items-center justify-center gap-3">
        {currentPage > 1 ? (
          <Link
            href={buildPageHref(pathname, 1, pageSize, queryParams)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            First
          </Link>
        ) : (
          <span className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-4 py-2 text-sm text-muted-foreground">First</span>
        )}
        {currentPage > 1 ? (
          <Link
            href={buildPageHref(pathname, currentPage - 1, pageSize, queryParams)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Previous
          </Link>
        ) : (
          <span className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-4 py-2 text-sm text-muted-foreground">Previous</span>
        )}
        <span className="text-sm text-muted-foreground">
          {currentPage} / {totalPages}
        </span>
        {currentPage < totalPages ? (
          <Link
            href={buildPageHref(pathname, currentPage + 1, pageSize, queryParams)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Next
          </Link>
        ) : (
          <span className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-4 py-2 text-sm text-muted-foreground">Next</span>
        )}
        {currentPage < totalPages ? (
          <Link
            href={buildPageHref(pathname, totalPages, pageSize, queryParams)}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Last
          </Link>
        ) : (
          <span className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-4 py-2 text-sm text-muted-foreground">Last</span>
        )}
      </div>
    </nav>
  )
}
