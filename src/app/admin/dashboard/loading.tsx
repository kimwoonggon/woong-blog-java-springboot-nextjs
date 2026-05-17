export default function AdminDashboardLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-10 w-56 animate-pulse rounded-2xl bg-muted/50" />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="h-32 animate-pulse rounded-3xl bg-muted/40" />
        <div className="h-32 animate-pulse rounded-3xl bg-muted/40" />
        <div className="h-32 animate-pulse rounded-3xl bg-muted/40" />
      </div>
      <div className="h-80 animate-pulse rounded-3xl bg-muted/30" />
    </div>
  )
}
