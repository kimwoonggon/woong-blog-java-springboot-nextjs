'use client'

export default function PublicSegmentError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-start justify-center gap-4 px-4 py-12 md:px-6">
      <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">Public pages</p>
      <h2 className="text-3xl font-semibold text-foreground">This page could not be loaded.</h2>
      <p className="max-w-2xl text-sm text-muted-foreground">
        The public content request failed. Retry once the service is healthy.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        Retry
      </button>
    </div>
  )
}
