import Link from 'next/link'
import { Briefcase, Eye, FileText } from 'lucide-react'
import { AdminDashboardCollections } from '@/components/admin/AdminDashboardCollections'
import { AdminErrorPanel } from '@/components/admin/AdminErrorPanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchAdminDashboardSummary } from '@/lib/api/admin-dashboard'
import { fetchAdminBlogs, type BlogAdminItem } from '@/lib/api/blogs'
import { fetchAdminWorks, type WorkAdminItem } from '@/lib/api/works'

export const dynamic = 'force-dynamic'

interface PageProps {
    searchParams?: Promise<{ __qaSummaryFail?: string; __qaCollectionsFail?: string; __qaSlow?: string }>
}

type DashboardSummary = {
    worksCount?: unknown
    blogsCount?: unknown
    viewsCount?: unknown
}

function formatDashboardCount(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : '—'
}

export default async function AdminDashboard({ searchParams }: PageProps) {
    const resolvedSearchParams = await searchParams
    if (resolvedSearchParams?.__qaSlow === '1') {
        await new Promise((resolve) => setTimeout(resolve, 600))
    }
    let summary: DashboardSummary | null = null
    let works: WorkAdminItem[] = []
    let blogs: BlogAdminItem[] = []
    let workLoadFailed = false
    let blogLoadFailed = false

    if (resolvedSearchParams?.__qaSummaryFail === '1') {
        summary = null
    } else {
        try {
            summary = await fetchAdminDashboardSummary()
        } catch {
            summary = null
        }
    }

    if (resolvedSearchParams?.__qaCollectionsFail === '1') {
        workLoadFailed = true
        blogLoadFailed = true
    } else {
        try {
            works = await fetchAdminWorks()
        } catch {
            workLoadFailed = true
        }

        try {
            blogs = await fetchAdminBlogs()
        } catch {
            blogLoadFailed = true
        }
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Jump to the public site, list views, or the new blog Notion workspace without leaving this screen.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/">
                        <Button variant="outline">Open Site</Button>
                    </Link>
                    <Link href="/admin/members">
                        <Button variant="outline">Members</Button>
                    </Link>
                    <Link href="/admin/blog/notion">
                        <Button>Blog Notion View</Button>
                    </Link>
                </div>
            </div>

            {summary ? (
                <div className="grid gap-6 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                            <Eye className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatDashboardCount(summary.viewsCount)}</div>
                            <p className="text-xs text-muted-foreground">Tracked page views</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Works</CardTitle>
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatDashboardCount(summary.worksCount)}</div>
                            <p className="text-xs text-muted-foreground">All projects in the portfolio</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Blog Posts</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatDashboardCount(summary.blogsCount)}</div>
                            <p className="text-xs text-muted-foreground">All articles in the portfolio</p>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <AdminErrorPanel
                    title="Dashboard data is unavailable"
                    message="The admin dashboard could not be loaded. Please refresh or try again after the backend is healthy."
                />
            )}

            {workLoadFailed || blogLoadFailed ? (
                <AdminErrorPanel
                    title={workLoadFailed && blogLoadFailed
                        ? 'Dashboard content lists are unavailable'
                        : 'Dashboard content lists are partially unavailable'}
                    message={workLoadFailed && blogLoadFailed
                        ? 'Works or blog posts could not be loaded for the dashboard. Please retry after checking the API and database connection.'
                        : 'Some dashboard content could not be loaded. Available sections remain visible; retry after checking the API and database connection.'}
                />
            ) : null}

            <AdminDashboardCollections
                works={works}
                blogs={blogs}
                worksUnavailable={workLoadFailed}
                blogsUnavailable={blogLoadFailed}
            />
        </div>
    )
}
