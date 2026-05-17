"use client"

import dynamic from 'next/dynamic'
import { PublicAdminClientGate } from '@/components/admin/PublicAdminClientGate'

interface PublicBlogListAdminCreateProps {
  afterSaveHref: string
}

const InlineBlogEditorSection = dynamic(
  () => import('@/components/admin/InlineBlogEditorSection').then((module) => module.InlineBlogEditorSection),
  {
    ssr: false,
    loading: () => null,
  },
)

export function PublicBlogListAdminCreate({ afterSaveHref }: PublicBlogListAdminCreateProps) {
  return (
    <PublicAdminClientGate>
      <InlineBlogEditorSection
        triggerLabel="새 글 쓰기"
        title="Study Inline Create"
        description="Create a new study note inline without leaving the current public page."
        afterSaveHref={afterSaveHref}
      />
    </PublicAdminClientGate>
  )
}
