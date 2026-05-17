
import { BlogEditor } from '@/components/admin/BlogEditor'

export default function NewBlogPage() {
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-foreground">New Post</h1>
            <BlogEditor />
        </div>
    )
}
