import Link from 'next/link'
import { AdminErrorPanel } from '@/components/admin/AdminErrorPanel'
import { BlogNotionWorkspace } from '@/components/admin/BlogNotionWorkspace'
import { Button } from '@/components/ui/button'
import {
    fetchAdminBlogById,
    fetchAdminBlogs,
    type BlogAdminItem,
} from '@/lib/api/blogs'

export const revalidate = 0

interface PageProps {
    searchParams?: Promise<{ id?: string }>
}

export default async function AdminBlogNotionPage({ searchParams }: PageProps) {
    const resolvedSearchParams = await searchParams
    const selectedIdFromQuery = resolvedSearchParams?.id ?? null
    let blogs: BlogAdminItem[] = []
    let selectedBlog = null
    let loadFailed = false

    if (selectedIdFromQuery) {
        const [blogsResult, selectedBlogResult] = await Promise.allSettled([
            fetchAdminBlogs(),
            fetchAdminBlogById(selectedIdFromQuery),
        ])

        if (blogsResult.status === 'fulfilled') {
            blogs = blogsResult.value
        } else {
            loadFailed = true
        }

        if (selectedBlogResult.status === 'fulfilled') {
            selectedBlog = selectedBlogResult.value
        }
    } else {
        try {
            blogs = await fetchAdminBlogs()
        } catch {
            loadFailed = true
        }
    }

    if (loadFailed) {
        return (
            <div className="space-y-8">
                <h1 className="text-3xl font-bold text-foreground">Blog Notion View</h1>
                <AdminErrorPanel
                    title="Blog Notion view is unavailable"
                    message="The blog list could not be loaded. Please retry after checking the backend and database connection."
                />
            </div>
        )
    }

    const selectedId = selectedIdFromQuery ?? blogs[0]?.id ?? null

    if (!selectedBlog && selectedId) {
        try {
            selectedBlog = await fetchAdminBlogById(selectedId)
        } catch {
            selectedBlog = null
        }
    }

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">Blog Notion View</h1>
                <p className="text-muted-foreground">
                    Blog-first, content-first workspace: the left list changes documents, while the editor body autosaves after a short pause.
                </p>
            </div>

            {selectedBlog ? (
                <BlogNotionWorkspace blogs={blogs} activeBlog={selectedBlog} />
            ) : (
                <div className="rounded-3xl border border-dashed border-border/80 bg-background p-8 text-center shadow-sm">
                    <h2 className="text-xl font-semibold text-foreground">Create your first post</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Notion View is ready, but there are no blog documents to open yet.
                    </p>
                    <Link href="/admin/blog/new" className="mt-4 inline-flex">
                        <Button>Create a blog post</Button>
                    </Link>
                </div>
            )}
        </div>
    )
}
