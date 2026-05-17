"use client"

import { useEffect, useRef, useState } from 'react'
import { TableOfContents } from './TableOfContents'

interface WorkTableOfContentsRailProps {
  contentRootId: string
  title: string
  rangeStartId: string
  rangeEndId: string
}

const stickyTopOffsetPx = 112
const railVideoAvoidanceGapPx = 16

type TocRangeState = 'before' | 'active' | 'after'

function rectsOverlap(
  left: Pick<DOMRect, 'top' | 'right' | 'bottom' | 'left'>,
  right: Pick<DOMRect, 'top' | 'right' | 'bottom' | 'left'>,
) {
  return left.left < right.right
    && left.right > right.left
    && left.top < right.bottom
    && left.bottom > right.top
}

export function WorkTableOfContentsRail({
  contentRootId,
  title,
  rangeStartId,
  rangeEndId,
}: WorkTableOfContentsRailProps) {
  const [rangeState, setRangeState] = useState<TocRangeState>('active')
  const [videoAvoidanceOffset, setVideoAvoidanceOffset] = useState(0)
  const railRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const syncRangeState = () => {
      const startElement = document.getElementById(rangeStartId)
      const endElement = document.getElementById(rangeEndId)

      if (!startElement || !endElement) {
        setRangeState('active')
        setVideoAvoidanceOffset(0)
        return
      }

      const startTop = startElement.getBoundingClientRect().top + window.scrollY
      const endTop = endElement.getBoundingClientRect().top + window.scrollY
      const stickyTop = window.scrollY + stickyTopOffsetPx

      if (stickyTop < startTop) {
        setRangeState('before')
        setVideoAvoidanceOffset(0)
        return
      }

      if (stickyTop >= endTop) {
        setRangeState('after')
        setVideoAvoidanceOffset(0)
        return
      }

      setRangeState('active')
      const railElement = railRef.current
      if (!railElement) {
        setVideoAvoidanceOffset(0)
        return
      }

      const railRect = railElement.getBoundingClientRect()
      const baseRailRect = {
        top: stickyTopOffsetPx,
        bottom: stickyTopOffsetPx + railRect.height,
        left: railRect.left,
        right: railRect.right,
      }
      const overlappingVideoBottom = Array.from(document.querySelectorAll<HTMLElement>('[data-work-video-frame="true"]'))
        .map((element) => element.getBoundingClientRect())
        .filter((videoRect) => rectsOverlap(baseRailRect, videoRect))
        .reduce((bottom, videoRect) => Math.max(bottom, videoRect.bottom), 0)

      setVideoAvoidanceOffset(overlappingVideoBottom > 0
        ? Math.max(0, Math.ceil(overlappingVideoBottom - stickyTopOffsetPx + railVideoAvoidanceGapPx))
        : 0)
    }

    syncRangeState()
    window.addEventListener('scroll', syncRangeState, { passive: true })
    window.addEventListener('resize', syncRangeState)

    return () => {
      window.removeEventListener('scroll', syncRangeState)
      window.removeEventListener('resize', syncRangeState)
    }
  }, [rangeEndId, rangeStartId])

  const outsideRange = rangeState !== 'active'

  return (
    <div
      ref={railRef}
      data-testid="work-toc-rail"
      data-range-state={rangeState}
      data-video-overlap={videoAvoidanceOffset > 0 ? 'true' : 'false'}
      className={`transition-[opacity,transform] duration-150 ${outsideRange ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
      style={{
        transform: videoAvoidanceOffset > 0 ? `translateY(${videoAvoidanceOffset}px)` : undefined,
      }}
    >
      <div data-testid="work-toc">
        <TableOfContents contentRootId={contentRootId} title={title} testId="work-toc-nav" />
      </div>
    </div>
  )
}
