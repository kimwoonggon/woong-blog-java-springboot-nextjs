'use client'

export default function PublicBlogDetailError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <article className="container mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">Study detail</p>
        <h2 className="mt-3 text-2xl font-semibold text-foreground">This article could not be loaded.</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Retry once the service is healthy.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Retry
        </button>
      </div>
    </article>
  )
}
