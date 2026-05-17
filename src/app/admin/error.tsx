'use client'

export default function AdminSegmentError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen flex-col items-start justify-center gap-4 bg-gray-50 px-6 py-12 dark:bg-gray-900 md:px-12">
      <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">Admin</p>
      <h2 className="text-3xl font-semibold text-foreground">The admin workspace could not be loaded.</h2>
      <p className="max-w-2xl text-sm text-muted-foreground">
        Retry after the session and backend are healthy.
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
