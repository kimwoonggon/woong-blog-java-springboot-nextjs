import { notFound } from 'next/navigation'
import { BlogEditor } from '@/components/admin/BlogEditor'
import { fetchAdminBlogById } from '@/lib/api/blogs'
import { AdminErrorPanel } from '@/components/admin/AdminErrorPanel'

export const revalidate = 0

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditBlogPage({ params }: PageProps) {
    const { id } = await params
    let blog = null
    let loadFailed = false

    try {
        blog = await fetchAdminBlogById(id)
    } catch {
        loadFailed = true
    }

    if (!loadFailed && !blog) {
        notFound()
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-foreground">Edit Post</h1>
            {loadFailed || !blog ? (
                <AdminErrorPanel
                    title="Blog editor is unavailable"
                    message="The selected blog post could not be loaded. Please retry after checking the backend connection."
                />
            ) : (
                <BlogEditor initialBlog={blog} />
            )}
        </div>
    )
}
