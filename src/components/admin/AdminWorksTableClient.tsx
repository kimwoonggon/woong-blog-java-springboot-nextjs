'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Eye, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { WorkAdminItem } from '@/lib/api/works'
import { deleteAdminWork, deleteManyAdminWorks } from '@/lib/api/admin-mutations'
import { sanitizeAdminMutationError } from '@/lib/admin-save-error'
import { useResponsivePageSize } from '@/hooks/useResponsivePageSize'
import { anyContainsNormalizedSearch } from '@/lib/search/normalized-search'
import { toast } from 'sonner'

interface AdminWorksTableClientProps {
  works: WorkAdminItem[]
}

interface PendingWorkDelete {
  ids: string[]
  title: string
}

function matchesWorkQuery(work: WorkAdminItem, query: string) {
  return anyContainsNormalizedSearch([work.title, work.category, ...normalizeTextArray(work.tags)], query)
}

function normalizeDisplayText(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeTextArray(value: unknown) {
  return Array.isArray(value)
    ? value
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => item.trim())
    : []
}

function normalizeRouteSegment(value: unknown) {
  return typeof value === 'string' && value.trim() ? encodeURIComponent(value.trim()) : ''
}

function normalizeMutationId(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function buildAdminWorkHref(id: unknown, returnTo: string) {
  const segment = normalizeRouteSegment(id)
  return segment ? `/admin/works/${segment}?returnTo=${returnTo}` : `/admin/works?returnTo=${returnTo}`
}

function buildPublicWorkHref(slug: unknown) {
  const segment = normalizeRouteSegment(slug)
  return segment ? `/works/${segment}` : '/works'
}

function normalizePageParam(value: string | null) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function formatAdminDate(value?: string | null) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

function deferStateUpdate(callback: () => void) {
  queueMicrotask(callback)
}

function replaceBrowserUrl(pathname: string, queryString: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.history.replaceState(window.history.state, '', queryString ? `${pathname}?${queryString}` : pathname)
}

function subscribeToHydration() {
  return () => undefined
}

function getHydratedSnapshot() {
  return true
}

function getServerHydratedSnapshot() {
  return false
}

export function AdminWorksTableClient({ works }: AdminWorksTableClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const requestedPage = normalizePageParam(searchParams.get('page'))
  const requestedQuery = searchParams.get('query') ?? ''
  const searchParamsKey = searchParams.toString()
  const lastWrittenSearchParamsRef = useRef<string | null>(null)
  const hasMountedSearchSyncRef = useRef(false)
  const hasMountedUrlWriteRef = useRef(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [workItems, setWorkItems] = useState(works)
  const [query, setQuery] = useState(requestedQuery)
  const [pendingDelete, setPendingDelete] = useState<PendingWorkDelete | null>(null)
  const [page, setPage] = useState(requestedPage)
  const deleteRestoreFocusRef = useRef<HTMLElement | null>(null)
  const isInteractive = useSyncExternalStore(subscribeToHydration, getHydratedSnapshot, getServerHydratedSnapshot)
  const [isPending, startTransition] = useTransition()
  const pageSize = useResponsivePageSize(12, 8, 6)

  useEffect(() => {
    setWorkItems(works)
  }, [works])

  const filteredWorks = useMemo(() => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return workItems
    }

    return workItems.filter((work) => matchesWorkQuery(work, trimmedQuery))
  }, [workItems, query])
  const totalPages = Math.max(1, Math.ceil(filteredWorks.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const returnTo = useMemo(() => {
    const params = new URLSearchParams()
    if (currentPage > 1) {
      params.set('page', String(currentPage))
    }
    if (pageSize > 0) {
      params.set('pageSize', String(pageSize))
    }
    if (query.trim()) {
      params.set('query', query.trim())
    }

    const suffix = params.toString()
    return encodeURIComponent(suffix ? `${pathname}?${suffix}` : pathname)
  }, [currentPage, pageSize, pathname, query])
  const visibleWorks = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredWorks.slice(start, start + pageSize)
  }, [currentPage, filteredWorks, pageSize])
  const visibleIds = useMemo(() => (
    visibleWorks.map((work) => normalizeMutationId(work.id)).filter(Boolean)
  ), [visibleWorks])
  const effectiveSelectedIds = useMemo(
    () => selectedIds.filter((id) => filteredWorks.some((work) => normalizeMutationId(work.id) === id)),
    [filteredWorks, selectedIds],
  )
  const selectedCount = effectiveSelectedIds.length
  const allSelected = visibleWorks.length > 0 && visibleIds.every((id) => effectiveSelectedIds.includes(id))
  const selectedSet = useMemo(() => new Set(effectiveSelectedIds), [effectiveSelectedIds])
  const emptyTableMessage = query.trim() ? 'No matching works found.' : 'No works found.'

  useEffect(() => {
    if (!hasMountedSearchSyncRef.current) {
      hasMountedSearchSyncRef.current = true
      return
    }

    if (lastWrittenSearchParamsRef.current === searchParamsKey) {
      lastWrittenSearchParamsRef.current = null
      return
    }

    let cancelled = false
    deferStateUpdate(() => {
      if (!cancelled) {
        if (document.activeElement === searchInputRef.current) {
          return
        }
        setQuery(requestedQuery)
        setPage(requestedPage)
        setSelectedIds([])
      }
    })

    return () => {
      cancelled = true
    }
  }, [requestedPage, requestedQuery, searchParamsKey])

  useEffect(() => {
    if (page !== currentPage) {
      let cancelled = false
      deferStateUpdate(() => {
        if (!cancelled) {
          setPage(currentPage)
          setSelectedIds([])
        }
      })

      return () => {
        cancelled = true
      }
    }
  }, [currentPage, page])

  useEffect(() => {
    if (!hasMountedUrlWriteRef.current) {
      hasMountedUrlWriteRef.current = true
      return
    }

    const params = new URLSearchParams(searchParamsKey)

    if (currentPage > 1) {
      params.set('page', String(currentPage))
    } else {
      params.delete('page')
    }

    params.set('pageSize', String(pageSize))

    if (query.trim()) {
      params.set('query', query.trim())
    } else {
      params.delete('query')
    }

    const nextQueryString = params.toString()
    const currentQueryString = searchParamsKey
    if (nextQueryString === currentQueryString) {
      return
    }

    lastWrittenSearchParamsRef.current = nextQueryString
    replaceBrowserUrl(pathname, nextQueryString)
  }, [currentPage, pageSize, pathname, query, router, searchParamsKey])

  function toggle(id: string) {
    if (!id) {
      return
    }

    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  function toggleAll() {
    setSelectedIds((current) => (
      visibleIds.every((id) => current.includes(id))
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])]
    ))
  }

  function requestDelete(ids: string[], title: string, restoreFocusTarget?: HTMLElement | null) {
    const validIds = ids.map(normalizeMutationId).filter(Boolean)
    if (validIds.length === 0 || isPending) {
      return
    }

    deleteRestoreFocusRef.current = restoreFocusTarget ?? null
    setPendingDelete({ ids: validIds, title })
  }

  function closeDeleteDialog({ restoreFocus = true } = {}) {
    const focusTarget = deleteRestoreFocusRef.current
    deleteRestoreFocusRef.current = null
    setPendingDelete(null)

    if (restoreFocus && focusTarget && document.contains(focusTarget)) {
      queueMicrotask(() => {
        focusTarget.focus()
      })
    }
  }

  function runDelete() {
    if (!pendingDelete || isPending) {
      return
    }

    startTransition(async () => {
      try {
        if (pendingDelete.ids.length === 1) {
          const work = workItems.find((item) => normalizeMutationId(item.id) === pendingDelete.ids[0])
          await deleteAdminWork(pendingDelete.ids[0], work?.slug)
        } else {
          await deleteManyAdminWorks(pendingDelete.ids)
        }
        setWorkItems((current) => current.filter((work) => !pendingDelete.ids.includes(work.id)))
        setSelectedIds((current) => current.filter((id) => !pendingDelete.ids.includes(id)))
        closeDeleteDialog({ restoreFocus: false })
        router.refresh()
      } catch (error) {
        toast.error(sanitizeAdminMutationError(
          error instanceof Error ? error.message : '',
          'Works could not be deleted. Please retry after the backend is healthy.',
        ))
      }
    })
  }

  return (
    <div className="rounded-md border border-border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-[240px] flex-1 items-center gap-3">
          <Input
            ref={searchInputRef}
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value
              setQuery(nextQuery)
              setPage(1)
              setSelectedIds([])
            }}
            placeholder="Search by title, tags, or category…"
            aria-label="Search work titles"
            className="max-w-sm"
            disabled={!isInteractive}
          />
          <p className="text-sm text-muted-foreground">
            {filteredWorks.length} shown · {selectedCount > 0 ? `${selectedCount} selected` : 'Select rows to enable bulk delete.'}
          </p>
        </div>
        {selectedCount > 0 ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={(event) => requestDelete(effectiveSelectedIds, `${selectedCount} selected works`, event.currentTarget)}
            disabled={isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected
          </Button>
        ) : null}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                aria-label="Select all works"
                checked={allSelected}
                onCheckedChange={toggleAll}
                disabled={visibleIds.length === 0}
              />
            </TableHead>
            <TableHead>Thumbnail</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Published Date</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleWorks.length > 0 ? (
            visibleWorks.map((work, index) => {
              const title = normalizeDisplayText(work.title, 'Untitled work')
              const category = normalizeDisplayText(work.category, 'Uncategorized')
              const workId = normalizeMutationId(work.id)
              const adminHref = buildAdminWorkHref(work.id, returnTo)
              const publicHref = buildPublicWorkHref(work.slug)

              return (
              <TableRow
                key={normalizeDisplayText(work.id, `work-${index}`)}
                data-testid="admin-work-row"
                data-state={workId && selectedSet.has(workId) ? 'selected' : undefined}
              >
                <TableCell>
                  <Checkbox
                    aria-label={`Select ${title}`}
                    checked={workId ? selectedSet.has(workId) : false}
                    onCheckedChange={() => toggle(workId)}
                    disabled={!workId}
                  />
                </TableCell>
                <TableCell>
                  {work.thumbnailUrl ? (
                    <div className="overflow-hidden rounded-md border border-border bg-muted">
                      <Image
                        src={work.thumbnailUrl}
                        alt={`${title} thumbnail`}
                        width={64}
                        height={48}
                        unoptimized
                        className="h-12 w-16 object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-12 w-16 items-center justify-center rounded-md border border-dashed border-border bg-muted px-2 text-center text-[11px] font-medium text-muted-foreground">
                      No image
                    </div>
                  )}
                </TableCell>
                <TableCell className="min-w-0 font-medium">
                  <Link
                    href={adminHref}
                    prefetch={false}
                    className="block truncate transition-colors hover:text-primary hover:underline"
                  >
                    {title}
                  </Link>
                </TableCell>
                <TableCell>
                  {work.published ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100/80 dark:bg-green-900/40 dark:text-green-300">
                      Published
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100/80 dark:bg-yellow-900/40 dark:text-yellow-300">
                      Draft
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm tabular-nums text-muted-foreground">
                  {formatAdminDate(work.publishedAt)}
                </TableCell>
                <TableCell>{category}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="ghost" size="icon">
                      <Link
                        href={publicHref}
                        prefetch={false}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`View public work: ${title}`}
                        title="View Public"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon">
                      <Link
                        href={adminHref}
                        prefetch={false}
                        aria-label={`Edit work: ${title}`}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      aria-label={`Delete work: ${title}`}
                      title="Delete"
                      onClick={(event) => requestDelete([workId], title, event.currentTarget)}
                      disabled={isPending || !workId}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                {emptyTableMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex flex-wrap items-center justify-center gap-3 border-t border-border px-4 py-3 sm:justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Previous page"
          disabled={currentPage <= 1}
          onClick={() => {
            setSelectedIds([])
            setPage((active) => Math.max(1, active - 1))
          }}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </Button>
        <span className="text-sm tabular-nums text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Next page"
          disabled={currentPage >= totalPages}
          onClick={() => {
            setSelectedIds([])
            setPage((active) => Math.min(totalPages, active + 1))
          }}
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingDelete ? `Delete ${pendingDelete.title}?` : 'Delete item?'}
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The selected work will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => closeDeleteDialog()} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={runDelete} disabled={isPending}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
