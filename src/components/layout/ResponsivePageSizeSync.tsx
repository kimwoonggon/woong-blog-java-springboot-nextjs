"use client"

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { resolveResponsivePageSize } from '@/lib/responsive-page-size'

interface ResponsivePageSizeSyncProps {
  desktopPageSize: number
  tabletPageSize: number
  mobilePageSize: number
  infiniteBelowDesktop?: boolean
  infinitePageSize?: number
  skipWhenStudyRestorePending?: boolean
}

const studyRestoreStorageKey = 'woong-study-mobile-feed-state'
const studyRestoreHistoryKey = '__studyFeedRestore'

function isPendingStudyRestore(value: unknown, query: string) {
  if (!value || typeof value !== 'object') {
    return false
  }

  const record = value as Record<string, unknown>
  return record.restoreOnHistoryReturn === true && record.query === query
}

function hasPendingStudyRestore(pathname: string, query: string) {
  if (pathname !== '/blog') {
    return false
  }

  const historyRestore = window.history.state && typeof window.history.state === 'object'
    ? (window.history.state as Record<string, unknown>)[studyRestoreHistoryKey]
    : null
  if (isPendingStudyRestore(historyRestore, query)) {
    return true
  }

  const rawSessionRestore = window.sessionStorage.getItem(studyRestoreStorageKey)
  if (!rawSessionRestore) {
    return false
  }

  try {
    return isPendingStudyRestore(JSON.parse(rawSessionRestore) as unknown, query)
  } catch {
    return false
  }
}

export function ResponsivePageSizeSync({
  desktopPageSize,
  tabletPageSize,
  mobilePageSize,
  infiniteBelowDesktop = false,
  infinitePageSize = 10,
  skipWhenStudyRestorePending = false,
}: ResponsivePageSizeSyncProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const sync = () => {
      const isBelowDesktop = window.innerWidth < 1024
      const query = searchParams.get('query')?.trim() ?? ''
      if (skipWhenStudyRestorePending && isBelowDesktop && hasPendingStudyRestore(pathname, query)) {
        return
      }

      if (infiniteBelowDesktop && isBelowDesktop) {
        const currentPage = searchParams.get('page')
        const currentPageSize = searchParams.get('pageSize')
        const params = new URLSearchParams(searchParams.toString())
        params.set('page', '1')
        params.set('pageSize', String(infinitePageSize))
        params.delete('searchMode')

        if (
          currentPage === '1'
          && currentPageSize === String(infinitePageSize)
          && !searchParams.has('searchMode')
        ) {
          return
        }

        router.replace(`${pathname}?${params.toString()}`, { scroll: false })
        return
      }

      const desiredPageSize = resolveResponsivePageSize({
        width: window.innerWidth,
        height: window.innerHeight,
        desktopPageSize,
        tabletPageSize,
        mobilePageSize,
      })
      const currentPageSize = Number.parseInt(searchParams.get('pageSize') ?? '', 10)

      if (
        Number.isFinite(currentPageSize)
        && currentPageSize > 0
        && (currentPageSize === desiredPageSize || currentPageSize < mobilePageSize)
      ) {
        return
      }

      const params = new URLSearchParams(searchParams.toString())
      params.set('pageSize', String(desiredPageSize))
      if (!params.get('page')) {
        params.set('page', '1')
      }

      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }

    sync()
    window.addEventListener('resize', sync)

    return () => {
      window.removeEventListener('resize', sync)
    }
  }, [desktopPageSize, infiniteBelowDesktop, infinitePageSize, mobilePageSize, pathname, router, searchParams, skipWhenStudyRestorePending, tabletPageSize])

  return null
}
