"use client"

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

interface ResumePdfViewerProps {
  url: string
}

interface ResumePdfDocumentProps {
  url: string
  containerWidth: number
}

function ResumePdfViewerLoading() {
  return (
    <div className="flex h-full min-h-40 items-center justify-center px-3 py-6">
      <p className="text-center text-sm text-muted-foreground">Loading resume preview...</p>
    </div>
  )
}

const ResumePdfDocument = dynamic<ResumePdfDocumentProps>(
  () => import('@/components/content/ResumePdfDocument').then((module) => module.ResumePdfDocument),
  {
    ssr: false,
    loading: () => <ResumePdfViewerLoading />,
  },
)

export function ResumePdfViewer({ url }: ResumePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState(720)

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const observer = new ResizeObserver(([entry]) => {
      setContainerWidth(Math.max(280, Math.floor(entry.contentRect.width)))
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      data-testid="resume-pdf-viewer"
      className="h-full w-full overflow-y-auto bg-muted/30 px-3 py-4"
    >
      <ResumePdfDocument url={url} containerWidth={containerWidth} />
    </div>
  )
}
