import { notFound } from 'next/navigation'
import { PublicBlogDetailAdminActions } from '@/components/admin/PublicBlogDetailAdminActions'
import { PublicDetailAdjacentLink } from '@/components/content/PublicDetailAdjacentLink'
import { RelatedContentList } from '@/components/content/RelatedContentList'
import { InteractiveRenderer } from '@/components/content/InteractiveRenderer'
import { TableOfContents } from '@/components/content/TableOfContents'
import { Badge } from '@/components/ui/badge'
import { Metadata } from 'next'
import { Suspense } from 'react'
import { resolveBlogRenderableContent } from '@/lib/content/blog-content'
import { fetchPublicBlogContext, fetchPublicBlogBySlug, fetchPublicBlogs } from '@/lib/api/blogs'
import { createPublicMetadata } from '@/lib/seo'
import { formatDetailPublishDate } from './blog-detail-helpers'

export const revalidate = 60

const detailRelatedContextLimit = 24

interface PageProps {
    params: Promise<{ slug: string }>
}

function safeDecodeSlug(slug: string) {
    try {
        return decodeURIComponent(slug)
    } catch {
        return null
    }
}

function buildBlogMetadataPath(slug: string) {
    const cleanedSlug = slug.trim()
    return cleanedSlug ? `/blog/${encodeURIComponent(cleanedSlug)}` : '/blog'
}

function normalizeStaticParamSlug(slug: unknown) {
    if (typeof slug !== 'string') {
        return null
    }

    const cleanedSlug = slug.trim()
    if (!cleanedSlug || cleanedSlug.includes('/') || cleanedSlug.includes('?') || cleanedSlug.includes('#')) {
        return null
    }

    return cleanedSlug
}

function toSortablePublishedTime(publishedAt?: string | null) {
    if (!publishedAt) {
        return Number.NEGATIVE_INFINITY
    }

    const timestamp = Date.parse(publishedAt)
    return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp
}

function compareBlogListItems(left: { title: string; publishedAt?: string | null }, right: { title: string; publishedAt?: string | null }) {
    const publishedTimeDelta = toSortablePublishedTime(right.publishedAt) - toSortablePublishedTime(left.publishedAt)
    if (publishedTimeDelta !== 0) {
        return publishedTimeDelta
    }

    return left.title.localeCompare(right.title)
}

function buildRelatedBlogs(blog: NonNullable<Awaited<ReturnType<typeof fetchPublicBlogBySlug>>>, related: NonNullable<Awaited<ReturnType<typeof fetchPublicBlogContext>>>['related'] = []) {
    const byId = new Map<string, typeof related[number] | typeof blog>()
    for (const item of [blog, ...related]) {
        if (!byId.has(item.id)) {
            byId.set(item.id, item)
        }
    }

    return Array.from(byId.values()).sort(compareBlogListItems)
}

export async function generateStaticParams() {
    const firstPage = await fetchPublicBlogs(1, 100).catch(() => null)
    if (!firstPage) {
        return []
    }

    const blogs = [...firstPage.items]
    for (let page = 2; page <= firstPage.totalPages; page += 1) {
        const nextPage = await fetchPublicBlogs(page, 100).catch(() => null)
        if (!nextPage) {
            break
        }
        blogs.push(...nextPage.items)
    }

    return blogs.flatMap((blog) => {
        const slug = normalizeStaticParamSlug(blog.slug)
        return slug ? [{ slug }] : []
    })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params
    const decodedSlug = safeDecodeSlug(slug)
    if (!decodedSlug) return {}

    const blog = await fetchPublicBlogBySlug(decodedSlug).catch(() => null)

    if (!blog) return {}

    return createPublicMetadata({
        title: blog.title,
        description: blog.excerpt,
        path: buildBlogMetadataPath(blog.slug),
        type: 'article',
    })
}

export default async function BlogDetailPage({ params }: PageProps) {
    const { slug } = await params
    const decodedSlug = decodeURIComponent(slug)
    const [blog, context] = await Promise.all([
        fetchPublicBlogBySlug(decodedSlug),
        fetchPublicBlogContext(decodedSlug, detailRelatedContextLimit).catch(() => null),
    ])

    if (!blog) {
        notFound()
    }

    const renderedContent = resolveBlogRenderableContent(blog.content, blog.contentJson)

    const publishDate = formatDetailPublishDate(blog.publishedAt)
    const newerBlog = context?.newer ?? null
    const olderBlog = context?.older ?? null
    const relatedBlogs = buildRelatedBlogs(blog, context?.related ?? [])

    return (
        <article data-testid="blog-detail-page-shell" className="mx-auto w-full max-w-[82rem] bg-white px-4 py-8 dark:bg-background md:px-6 md:py-12">
            <div data-testid="blog-article-content-layout" className="mx-auto w-full min-w-0 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,48rem)_minmax(0,1fr)] xl:items-start xl:gap-12">
                <div data-testid="blog-detail-body" className="mx-auto min-w-0 w-full max-w-3xl rounded-[2rem] border border-border/70 bg-white px-5 py-6 text-card-foreground shadow-sm dark:bg-card md:px-8 md:py-8 xl:col-start-2">
                    <header className="mb-8">
                        <h1 className="mb-4 text-3xl font-heading font-bold leading-tight text-foreground text-balance md:text-4xl">
                            <span data-testid="blog-detail-title">{blog.title}</span>
                        </h1>
                        <div className="mb-6 flex flex-wrap items-center gap-4 font-medium text-muted-foreground">
                            <Badge variant="secondary" className="rounded-full bg-brand-navy px-3 text-white hover:bg-brand-navy/90">
                                <time dateTime={blog.publishedAt ?? undefined}>{publishDate}</time>
                            </Badge>
                            <ul aria-label="Post tags" className="flex flex-wrap gap-2 font-mono text-sm">
                                {blog.tags?.map((tag: string) => (
                                    <li key={tag}>
                                        <span className="cursor-default rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:text-brand-accent">
                                            #{tag}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </header>

                    <PublicBlogDetailAdminActions blogId={blog.id} />

                    <div id="blog-detail-content" className="mt-8 min-w-0 overflow-hidden bg-white dark:bg-card">
                        {renderedContent && (
                            <InteractiveRenderer html={renderedContent} />
                        )}
                    </div>

                </div>

                <aside className="hidden xl:sticky xl:top-28 xl:col-start-3 xl:block xl:w-[clamp(13rem,calc(50vw-27rem),20rem)] xl:max-w-none xl:justify-self-start xl:self-start">
                    <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
                        <TableOfContents contentRootId="blog-detail-content" />
                    </div>
                </aside>
            </div>

            <div className="mx-auto w-full max-w-3xl">
                {(olderBlog || newerBlog) && (
                    <Suspense fallback={null}>
                        <nav
                            aria-label="Study navigation"
                            data-testid="blog-prev-next"
                            className="mt-12 grid gap-3 border-t border-border/70 pt-8 sm:grid-cols-2"
                        >
                            {newerBlog ? (
                                <PublicDetailAdjacentLink hrefBase="/blog" slug={newerBlog.slug} label="Next" title={newerBlog.title} />
                            ) : (
                                <div aria-hidden="true" />
                            )}
                            {olderBlog ? (
                                <PublicDetailAdjacentLink hrefBase="/blog" slug={olderBlog.slug} label="Previous" title={olderBlog.title} alignEnd />
                            ) : null}
                        </nav>
                    </Suspense>
                )}

                <div data-testid="blog-related-shell" className="mt-16 border-t bg-white pt-12 dark:bg-background">
                    <Suspense fallback={null}>
                        <RelatedContentList
                            heading="More Studies"
                            hrefBase="/blog"
                            items={relatedBlogs}
                            currentItemId={blog.id}
                            desktopPageSize={9}
                            tabletPageSize={4}
                            mobilePageSize={5}
                            testIdBase="related-blog"
                            centerCurrentOnInitialPage
                        />
                    </Suspense>
                </div>
            </div>
        </article>
    )
}
