import { notFound } from 'next/navigation'
import { WorkEditor } from '@/components/admin/WorkEditor'
import { fetchAdminWorkById } from '@/lib/api/works'
import { AdminErrorPanel } from '@/components/admin/AdminErrorPanel'

export const revalidate = 0

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function EditWorkPage({ params }: PageProps) {
    const { id } = await params
    let work = null
    let loadFailed = false

    try {
        work = await fetchAdminWorkById(id)
    } catch {
        loadFailed = true
    }

    if (!loadFailed && !work) {
        notFound()
    }

    const initialWork = work
        ? {
            ...work,
            thumbnail_url: work.thumbnail_url,
            icon_url: work.icon_url
        }
        : undefined

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-foreground">Edit Work</h1>
            {loadFailed || !initialWork ? (
                <AdminErrorPanel
                    title="Work editor is unavailable"
                    message="The selected work entry could not be loaded. Please retry after checking the backend connection."
                />
            ) : (
                <WorkEditor initialWork={initialWork} />
            )}
        </div>
    )
}
