export default function PublicSegmentLoading() {
  return (
    <div className="container mx-auto flex min-h-[60vh] max-w-7xl flex-col gap-16 px-4 py-8 md:px-6 md:py-12">
      <section className="mx-auto flex w-full max-w-5xl flex-col-reverse items-center gap-8 md:grid md:grid-cols-[minmax(0,40rem)_15rem] md:items-center md:justify-center md:gap-12">
        <div className="flex w-full flex-col items-center gap-4 md:items-start">
          <div className="h-4 w-32 animate-pulse rounded-full bg-muted/60" />
          <div className="h-16 w-full max-w-2xl animate-pulse rounded-3xl bg-muted/50" />
          <div className="h-10 w-full max-w-xl animate-pulse rounded-2xl bg-muted/40" />
          <div className="flex gap-4">
            <div className="h-11 w-36 animate-pulse rounded-full bg-muted/50" />
            <div className="h-11 w-32 animate-pulse rounded-full bg-muted/40" />
          </div>
        </div>
        <div className="h-60 w-60 animate-pulse rounded-full bg-muted/50" />
      </section>

      <section className="rounded-[2rem] border border-border/60 bg-muted/20 px-4 py-8 md:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <div className="h-4 w-24 animate-pulse rounded-full bg-muted/50" />
            <div className="h-8 w-48 animate-pulse rounded-2xl bg-muted/40" />
            <div className="h-5 w-96 max-w-full animate-pulse rounded-2xl bg-muted/30" />
          </div>
          <div className="h-5 w-20 animate-pulse rounded-full bg-muted/30" />
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="aspect-[4/3] animate-pulse rounded-3xl bg-muted/40" />
          <div className="aspect-[4/3] animate-pulse rounded-3xl bg-muted/40" />
          <div className="aspect-[4/3] animate-pulse rounded-3xl bg-muted/40" />
        </div>
      </section>

      <section className="rounded-[2rem] border border-border/70 bg-muted/10 px-5 py-8 md:px-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <div className="h-4 w-24 animate-pulse rounded-full bg-muted/50" />
            <div className="h-8 w-40 animate-pulse rounded-2xl bg-muted/40" />
          </div>
          <div className="h-5 w-20 animate-pulse rounded-full bg-muted/30" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-56 animate-pulse rounded-3xl bg-muted/30" />
          <div className="h-56 animate-pulse rounded-3xl bg-muted/30" />
        </div>
      </section>
    </div>
  )
}
