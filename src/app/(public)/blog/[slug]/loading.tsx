export default function PublicBlogDetailLoading() {
  return (
    <article className="container mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      <div className="space-y-4">
        <div className="h-4 w-28 animate-pulse rounded-full bg-muted/50" />
        <div className="h-12 w-3/4 animate-pulse rounded-2xl bg-muted/50" />
        <div className="h-28 animate-pulse rounded-3xl bg-muted/40" />
        <div className="h-80 animate-pulse rounded-3xl bg-muted/30" />
      </div>
    </article>
  )
}
