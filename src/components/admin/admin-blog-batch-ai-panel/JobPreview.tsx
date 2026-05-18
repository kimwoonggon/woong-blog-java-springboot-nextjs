interface JobPreviewProps {
  fixedHtml: string
}

export function JobPreview({ fixedHtml }: JobPreviewProps) {
  return (
    <div className="rounded-xl border border-border/70 bg-background p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Preview</p>
      <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: fixedHtml }} />
    </div>
  )
}
