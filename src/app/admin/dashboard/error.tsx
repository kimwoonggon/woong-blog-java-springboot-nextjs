'use client'

export default function AdminDashboardError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">Dashboard</p>
      <h2 className="mt-3 text-2xl font-semibold text-foreground">Dashboard data is unavailable.</h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Retry after the backend and session state recover.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90"
      >
        Retry
      </button>
    </div>
  )
}
