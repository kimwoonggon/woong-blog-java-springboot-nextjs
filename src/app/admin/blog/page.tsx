import Link from 'next/link'
import { Plus } from 'lucide-react'
import { AdminErrorPanel } from '@/components/admin/AdminErrorPanel'
import { AdminBlogTableClient } from '@/components/admin/AdminBlogTableClient'
import { Button } from '@/components/ui/button'
import { fetchAdminBlogs, type BlogAdminItem } from '@/lib/api/blogs'

export const dynamic = 'force-dynamic'

export default async function AdminBlogPage() {
    let blogs: BlogAdminItem[] = []
    let loadFailed = false

    try {
        blogs = await fetchAdminBlogs()
    } catch {
        loadFailed = true
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Blog Posts</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Manage all blog posts. Click a title to edit.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline">
                        <Link href="/admin/blog/notion">Notion View</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/admin/blog/new">
                            <Plus className="mr-2 h-4 w-4" /> Add Post
                        </Link>
                    </Button>
                </div>
            </div>

            {loadFailed ? (
                <AdminErrorPanel
                    title="Blog administration is unavailable"
                    message="Blog posts could not be loaded from the backend. Please retry after checking the API and database connection."
                />
            ) : (
                <AdminBlogTableClient blogs={blogs} />
            )}
        </div>
    )
}
