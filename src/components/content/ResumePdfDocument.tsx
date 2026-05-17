"use client"

import { useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

interface ResumePdfDocumentProps {
  url: string
  containerWidth: number
}

export function ResumePdfDocument({ url, containerWidth }: ResumePdfDocumentProps) {
  const [pageCount, setPageCount] = useState(0)

  return (
    <Document
      file={url}
      loading={<p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading resume preview...</p>}
      error={<p className="px-3 py-6 text-center text-sm text-muted-foreground">Resume preview is unavailable. Use the download button to open the PDF.</p>}
      onLoadSuccess={({ numPages }) => setPageCount(numPages)}
      className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4"
    >
      {Array.from({ length: pageCount }, (_, index) => (
        <Page
          key={index + 1}
          pageNumber={index + 1}
          width={Math.min(containerWidth - 24, 900)}
          renderAnnotationLayer={false}
          renderTextLayer={false}
          className="overflow-hidden rounded-xl bg-background shadow-sm"
        />
      ))}
    </Document>
  )
}
