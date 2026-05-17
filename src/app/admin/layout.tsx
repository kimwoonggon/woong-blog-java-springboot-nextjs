import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowUpRight } from 'lucide-react'
import { AdminLogoutButton } from '@/app/admin/AdminLogoutButton'
import { AdminSidebarNav } from '@/components/admin/AdminSidebarNav'
import { Button } from '@/components/ui/button'
import { fetchServerSession } from '@/lib/api/server'

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await fetchServerSession()

    if (!session.authenticated) {
        redirect('/login')
    }

    if (session.role !== 'admin') {
        redirect('/')
    }

    return (
        <div className="flex min-h-screen flex-col bg-muted/30 md:flex-row">
            <aside className="w-full border-b border-border bg-background p-4 md:w-64 md:border-b-0 md:border-r">
                <div className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Admin</p>
                    <h1 className="mt-1 text-lg font-semibold text-foreground">Admin Panel</h1>
                </div>

                <div className="mb-6 flex flex-wrap items-center gap-2">
                    <Button asChild variant="outline" size="sm" className="gap-2">
                        <Link href="/" target="_blank">
                            <ArrowUpRight aria-hidden="true" size={14} />
                            View Site
                        </Link>
                    </Button>
                    <AdminLogoutButton />
                </div>

                <AdminSidebarNav />
            </aside>

            <main className="flex-1 bg-muted/30 p-6 md:p-12">
                {children}
            </main>
        </div>
    )
}
