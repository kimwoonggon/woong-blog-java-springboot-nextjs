
import { PublicWorksListAdminCreate } from '@/components/admin/PublicWorksListAdminCreate'
import { PublicAdminClientGate } from '@/components/admin/PublicAdminClientGate'
import { PublicAdminLink } from '@/components/admin/PublicAdminLink'
import { PublicResponsiveFeed } from '@/components/content/PublicResponsiveFeed'
import { EdgePaginationNav } from '@/components/layout/EdgePaginationNav'
import { PublicSearchForm } from '@/components/layout/PublicSearchForm'
import { PublicPagination } from '@/components/layout/PublicPagination'
import { ResponsivePageSizeSync } from '@/components/layout/ResponsivePageSizeSync'
import { fetchPublicWorks, type PublicWorkSearchParams } from '@/lib/api/works'
import { createPublicMetadata } from '@/lib/seo'
import { headers } from 'next/headers'

export const revalidate = 60
export const metadata = createPublicMetadata({
    title: 'Works',
    description: 'Selected portfolio work, projects, and technical case studies related to Woonggon Kim.',
    path: '/works',
})

interface PageProps {
    searchParams?: Promise<{
        page?: string
        pageSize?: string
        query?: string
        searchMode?: string
        focusSearch?: string
        __qaEmpty?: string
        __qaNoImage?: string
    }>
}

const DESKTOP_PAGE_SIZE = 8
const TABLET_PAGE_SIZE = 6
const MOBILE_PAGE_SIZE = 4
const INFINITE_PAGE_SIZE = 10
const ENABLE_LOCAL_QA_FLAGS = process.env.ENABLE_LOCAL_ADMIN_SHORTCUT === 'true' || process.env.NODE_ENV !== 'production'

function isLocalQaHost(hostHeader: string | null) {
    if (!hostHeader) {
        return false
    }

    return hostHeader
        .split(',')
        .map((value) => value.trim().split(':')[0]?.toLowerCase())
        .some((hostname) => hostname === 'localhost' || hostname === '127.0.0.1')
}

async function canUseLocalQaFlags() {
    if (!ENABLE_LOCAL_QA_FLAGS) {
        return false
    }

    const requestHeaders = await headers()
    return isLocalQaHost(requestHeaders.get('host')) || isLocalQaHost(requestHeaders.get('x-forwarded-host'))
}

function resolveRequestedPageSize(pageSizeParam?: string) {
    const parsedPageSize = Number.parseInt(pageSizeParam ?? String(DESKTOP_PAGE_SIZE), 10) || DESKTOP_PAGE_SIZE
    const safePageSize = Math.max(1, parsedPageSize)
    const supportedPageSizes = new Set([DESKTOP_PAGE_SIZE, TABLET_PAGE_SIZE, MOBILE_PAGE_SIZE])

    if (safePageSize < MOBILE_PAGE_SIZE || supportedPageSizes.has(safePageSize)) {
        return safePageSize
    }

    return DESKTOP_PAGE_SIZE
}

export default async function WorksPage({ searchParams }: PageProps) {
    const resolvedSearchParams = await searchParams
    const requestedLocalQaFlag = resolvedSearchParams?.__qaEmpty === '1' || resolvedSearchParams?.__qaNoImage === '1'
    const localQaFlagsEnabled = requestedLocalQaFlag ? await canUseLocalQaFlags() : false
    const qaEmptyWorks = resolvedSearchParams?.__qaEmpty === '1' && localQaFlagsEnabled
    const qaNoImageWorks = resolvedSearchParams?.__qaNoImage === '1' && localQaFlagsEnabled
    const currentPage = Math.max(1, Number.parseInt(resolvedSearchParams?.page ?? '1', 10) || 1)
    const currentPageSize = resolveRequestedPageSize(resolvedSearchParams?.pageSize)
    const searchQuery = resolvedSearchParams?.query?.trim() ?? ''
    const shouldFocusSearch = resolvedSearchParams?.focusSearch === '1'
    const legacySearchMode = resolvedSearchParams?.searchMode === 'content' || resolvedSearchParams?.searchMode === 'title'
        ? resolvedSearchParams.searchMode
        : undefined
    const queryParams: PublicWorkSearchParams | undefined = searchQuery ? { query: searchQuery, legacySearchMode } : undefined
    const paginationQueryParams: Record<string, string> | undefined = searchQuery ? { query: searchQuery } : undefined
    const [worksPayload, mobileWorksPayload] = qaEmptyWorks
        ? [
            { items: [], page: 1, pageSize: currentPageSize, totalItems: 0, totalPages: 1 },
            { items: [], page: 1, pageSize: INFINITE_PAGE_SIZE, totalItems: 0, totalPages: 1 },
        ]
        : await Promise.all([
            fetchPublicWorks(currentPage, currentPageSize, queryParams),
            fetchPublicWorks(1, INFINITE_PAGE_SIZE, queryParams),
        ])
    const totalPages = Math.max(1, worksPayload.totalPages)
    const page = worksPayload.page
    const pagedWorks = qaNoImageWorks
        ? worksPayload.items.map((work) => ({
            ...work,
            thumbnailUrl: null,
        }))
        : worksPayload.items
    const returnToParams = new URLSearchParams({
        page: String(page),
        pageSize: String(currentPageSize),
    })
    if (searchQuery) {
        returnToParams.set('query', searchQuery)
    }
    const returnTo = encodeURIComponent(`/works?${returnToParams.toString()}`)

    return (
        <div className="container mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
            <EdgePaginationNav
                pathname="/works"
                currentPage={page}
                totalPages={totalPages}
                pageSize={currentPageSize}
                queryParams={paginationQueryParams}
            />
            <ResponsivePageSizeSync
                desktopPageSize={DESKTOP_PAGE_SIZE}
                tabletPageSize={TABLET_PAGE_SIZE}
                mobilePageSize={MOBILE_PAGE_SIZE}
                infiniteBelowDesktop
                infinitePageSize={INFINITE_PAGE_SIZE}
            />
            <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <h1 className="text-3xl font-heading font-bold text-foreground md:text-4xl">Works</h1>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    <PublicSearchForm
                        action="/works"
                        inputId="work-search"
                        inputName="query"
                        query={searchQuery}
                        placeholder="Search work"
                        inputAriaLabel="Search works"
                        shouldFocusSearch={shouldFocusSearch}
                        clearHref="/works"
                        clearLabel="Clear works search"
                    />
                    <PublicAdminClientGate>
                        <PublicAdminLink href="/admin/works" label="작업 관리" canShow variant="manage" />
                    </PublicAdminClientGate>
                </div>
            </div>
            <PublicWorksListAdminCreate />
            <PublicResponsiveFeed
                kind="works"
                query={searchQuery}
                desktopPayload={{ ...worksPayload, items: pagedWorks }}
                mobileInitialPayload={mobileWorksPayload}
                desktopReturnTo={returnTo}
            />
            <div className="mt-6 hidden rounded-2xl border border-border/70 bg-background/80 p-4 shadow-sm lg:block">
                <PublicPagination
                    pathname="/works"
                    currentPage={page}
                    totalPages={totalPages}
                    pageSize={currentPageSize}
                    ariaLabel="Works pagination"
                    queryParams={paginationQueryParams}
                />
            </div>
        </div>
    )
}
