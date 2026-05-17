"use client"

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { BlogEditor } from '@/components/admin/BlogEditor'
import { deleteAdminBlog } from '@/lib/api/admin-mutations'
import { sanitizeAdminMutationError } from '@/lib/admin-save-error'
import { InlineAdminEditorShell } from '@/components/admin/InlineAdminEditorShell'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface InlineBlogEditorSectionProps {
  initialBlog?: {
    id?: string
    title?: string
    excerpt?: string
    slug?: string
    tags?: string[]
    published?: boolean
    content?: { html?: string }
    publishedAt?: string | null
    updatedAt?: string
  }
  afterDeleteHref?: string
  afterSaveHref?: string
  title?: string
  description?: string
  triggerLabel?: string
}

export function InlineBlogEditorSection({
  initialBlog,
  afterDeleteHref = '/blog',
  afterSaveHref,
  title = 'Blog Inline Editor',
  description = '현재 게시물 뷰를 유지한 채 바로 수정합니다.',
  triggerLabel = '글 수정',
}: InlineBlogEditorSectionProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    const blogId = initialBlog?.id
    if (!blogId || isPending || !window.confirm('이 글을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    startTransition(async () => {
      try {
        await deleteAdminBlog(blogId, initialBlog?.slug)
        toast.success('Study deleted')
        router.push(afterDeleteHref)
        router.refresh()
      } catch (error) {
        toast.error(sanitizeAdminMutationError(
          error instanceof Error ? error.message : '',
          'Study could not be deleted. Please retry after the backend is healthy.',
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
      actions={initialBlog?.id ? (
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
      ) : null}
    >
      <BlogEditor
        initialBlog={initialBlog}
        inlineMode
        inlineReturnTo={afterSaveHref}
        onSaved={() => setOpen(false)}
      />
    </InlineAdminEditorShell>
  )
}
