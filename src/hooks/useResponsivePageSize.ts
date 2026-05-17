"use client"

import { useEffect, useState } from 'react'
import { resolveResponsivePageSize } from '@/lib/responsive-page-size'

export function useResponsivePageSize(
  desktopPageSize: number,
  tabletPageSize: number,
  mobilePageSize: number,
) {
  const [pageSize, setPageSize] = useState(desktopPageSize)

  useEffect(() => {
    const syncPageSize = () => {
      setPageSize(
        resolveResponsivePageSize({
          width: window.innerWidth,
          height: window.innerHeight,
          desktopPageSize,
          tabletPageSize,
          mobilePageSize,
        }),
      )
    }

    syncPageSize()
    window.addEventListener('resize', syncPageSize)

    return () => {
      window.removeEventListener('resize', syncPageSize)
    }
  }, [desktopPageSize, mobilePageSize, tabletPageSize])

  return pageSize
}
