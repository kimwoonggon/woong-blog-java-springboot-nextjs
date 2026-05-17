"use client"

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { deleteAdminWork } from '@/lib/api/admin-mutations'
import { sanitizeAdminMutationError } from '@/lib/admin-save-error'
import { InlineAdminEditorShell } from '@/components/admin/InlineAdminEditorShell'
import { WorkEditor } from '@/components/admin/WorkEditor'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface InlineWorkEditorSectionProps {
  initialWork: Parameters<typeof WorkEditor>[0]['initialWork']
  afterDeleteHref: string
  title?: string
  description?: string
  triggerLabel?: string
}

export function InlineWorkEditorSection({
  initialWork,
  afterDeleteHref,
  title = 'Work Inline Editor',
  description = '현재 작업 상세 뷰를 유지한 채 바로 수정하거나 삭제합니다.',
  triggerLabel = '작업 수정',
}: InlineWorkEditorSectionProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    const workId = initialWork?.id
    if (!workId || isPending || !window.confirm('이 작업을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    startTransition(async () => {
      try {
        await deleteAdminWork(workId, initialWork?.slug)
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

  return (
    <InlineAdminEditorShell
      open={open}
      onOpenChange={setOpen}
      triggerLabel={triggerLabel}
      title={title}
      description={description}
      actions={(
        <Button
          type="button"
          variant="outline"
          className="gap-2 rounded-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash2 className="h-4 w-4" />
          {isPending ? '삭제 중...' : '삭제'}
        </Button>
      )}
    >
      <WorkEditor
        initialWork={initialWork}
        inlineMode
        onSaved={() => setOpen(false)}
      />
    </InlineAdminEditorShell>
  )
}
