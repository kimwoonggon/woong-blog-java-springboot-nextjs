import Link from 'next/link'

interface EdgePaginationNavProps {
  pathname: string
  currentPage: number
  totalPages: number
  pageSize: number
  queryParams?: Record<string, string | null | undefined>
}

function navButtonClass(side: 'left' | 'right', disabled: boolean) {
  return `fixed top-1/2 z-40 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-background/90 text-lg font-semibold shadow-sm backdrop-blur transition-colors lg:inline-flex ${
    side === 'left' ? 'left-4 lg:left-6' : 'right-4 lg:right-6'
  } ${disabled ? 'cursor-not-allowed opacity-40' : 'hover:bg-accent'}`
}

export function EdgePaginationNav({
  pathname,
  currentPage,
  totalPages,
  pageSize,
  queryParams,
}: EdgePaginationNavProps) {
  const buildHref = (page: number) => {
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
  const previousHref = currentPage > 1 ? buildHref(currentPage - 1) : null
  const nextHref = currentPage < totalPages ? buildHref(currentPage + 1) : null

  return (
    <>
      {previousHref ? (
        <Link href={previousHref} aria-label="이전 페이지로 가기" className={navButtonClass('left', false)}>
          {'<-'}
        </Link>
      ) : (
        <span aria-label="이전 페이지 없음" className={navButtonClass('left', true)}>
          {'<-'}
        </span>
      )}
      {nextHref ? (
        <Link href={nextHref} aria-label="다음 페이지로 가기" className={navButtonClass('right', false)}>
          {'->'}
        </Link>
      ) : (
        <span aria-label="다음 페이지 없음" className={navButtonClass('right', true)}>
          {'->'}
        </span>
      )}
    </>
  )
}
