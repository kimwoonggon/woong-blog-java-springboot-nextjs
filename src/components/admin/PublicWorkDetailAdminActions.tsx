"use client"

import { Suspense, useEffect, useState, useTransition } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { AdminErrorPanel } from '@/components/admin/AdminErrorPanel'
import { InlineAdminEditorShell } from '@/components/admin/InlineAdminEditorShell'
import { PublicAdminClientGate } from '@/components/admin/PublicAdminClientGate'
import { Button } from '@/components/ui/button'
import { fetchWithCsrf } from '@/lib/api/auth'
import { getBrowserApiBaseUrl } from '@/lib/api/browser'
import type { AdminWorkDetailPayload } from '@/lib/api/works'
import { deleteAdminWork } from '@/lib/api/admin-mutations'
import { sanitizeAdminMutationError } from '@/lib/admin-save-error'
import { toast } from 'sonner'

interface PublicWorkDetailAdminActionsProps {
  workId: string
}

type LoadState = 'idle' | 'loading' | 'loaded' | 'error'

const WorkEditor = dynamic(
  () => import('@/components/admin/WorkEditor').then((module) => module.WorkEditor),
  {
    ssr: false,
    loading: () => <p className="text-sm text-muted-foreground">Loading editor...</p>,
  },
)

async function fetchAdminWorkDetail(workId: string) {
  const response = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/admin/works/${encodeURIComponent(workId)}`, {
    cache: 'no-store',
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error('Failed to load the requested work item.')
  }

  return response.json() as Promise<AdminWorkDetailPayload>
}

function PublicWorkDetailAdminActionsContent({ workId, afterDeleteHref }: { workId: string; afterDeleteHref: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<LoadState>('idle')
  const [work, setWork] = useState<AdminWorkDetailPayload | null>(null)
  const [isDeleting, startDeleteTransition] = useTransition()

  useEffect(() => {
    if (!open || state !== 'loading') {
      return
    }

    let cancelled = false

    fetchAdminWorkDetail(workId)
      .then((nextWork) => {
        if (cancelled) return
        setWork(nextWork)
        setState(nextWork ? 'loaded' : 'error')
      })
      .catch(() => {
        if (!cancelled) setState('error')
      })

    return () => {
      cancelled = true
    }
  }, [open, state, workId])

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (nextOpen && state === 'idle') {
      setState('loading')
    }
  }

  function handleDelete() {
    if (!work?.id || isDeleting || !window.confirm('이 작업을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    startDeleteTransition(async () => {
      try {
        await deleteAdminWork(work.id, work.slug)
        toast.success('Work deleted')
        router.push(afterDeleteHref)
        router.refresh()
      } catch (error) {
        toast.error(sanitizeAdminMutationError(
          error instanceof Error ? error.message : '',
          'Work could not be deleted. Please retry after the backend is healthy.',
        ))
      }
    })
  }

  const deleteAction = work?.id ? (
    <Button
      type="button"
      variant="outline"
      className="gap-2 rounded-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      <Trash2 className="h-4 w-4" />
      {isDeleting ? '삭제 중...' : '삭제'}
    </Button>
  ) : null

  return (
    <InlineAdminEditorShell
      open={open}
      onOpenChange={handleOpenChange}
      triggerLabel="작업 수정"
      title="Work Inline Editor"
      description="현재 작업 상세 뷰를 유지한 채 바로 수정하거나 삭제합니다."
      actions={deleteAction}
    >
      {state === 'loading' || state === 'idle' ? (
        <p className="text-sm text-muted-foreground">Loading editor...</p>
      ) : null}
      {state === 'error' ? (
        <AdminErrorPanel
          title="Inline work editor is unavailable"
          message="The public work view loaded, but the admin edit payload could not be loaded. Please retry after the backend is healthy."
        />
      ) : null}
      {state === 'loaded' && work ? (
        <WorkEditor
          initialWork={work}
          inlineMode
          onSaved={() => setOpen(false)}
        />
      ) : null}
    </InlineAdminEditorShell>
  )
}

export function PublicWorkDetailAdminActions(props: PublicWorkDetailAdminActionsProps) {
  return (
    <PublicAdminClientGate>
      <Suspense fallback={null}>
        <PublicWorkDetailAdminActionsGate {...props} />
      </Suspense>
    </PublicAdminClientGate>
  )
}

function resolveSafeReturnTo(returnTo?: string | null) {
  if (!returnTo) {
    return null
  }

  let decodedReturnTo = returnTo

  try {
    decodedReturnTo = decodeURIComponent(returnTo)
  } catch {
    decodedReturnTo = returnTo
  }

  if (!decodedReturnTo.startsWith('/') || decodedReturnTo.startsWith('//')) {
    return null
  }

  return decodedReturnTo
}

function resolveWorkAfterDeleteHref(searchParams: URLSearchParams) {
  const requestedReturnTo = resolveSafeReturnTo(searchParams.get('returnTo'))
  if (requestedReturnTo) {
    return requestedReturnTo
  }

  const relatedPage = searchParams.get('relatedPage')
  return relatedPage ? `/works?page=${encodeURIComponent(relatedPage)}&pageSize=8` : '/works'
}

function PublicWorkDetailAdminActionsGate({ workId }: PublicWorkDetailAdminActionsProps) {
  const searchParams = useSearchParams()

  return (
    <PublicWorkDetailAdminActionsContent
      workId={workId}
      afterDeleteHref={resolveWorkAfterDeleteHref(searchParams)}
    />
  )
}
