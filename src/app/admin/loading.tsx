export default function AdminSegmentLoading() {
  return (
    <div className="flex min-h-screen flex-col gap-6 bg-gray-50 p-6 md:p-12 dark:bg-gray-900">
      <div className="h-10 w-52 animate-pulse rounded-2xl bg-muted/50" />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="h-36 animate-pulse rounded-3xl bg-muted/40" />
        <div className="h-36 animate-pulse rounded-3xl bg-muted/40" />
        <div className="h-36 animate-pulse rounded-3xl bg-muted/40" />
      </div>
    </div>
  )
}
