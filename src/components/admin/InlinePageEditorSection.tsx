"use client"

import { useState } from 'react'
import { InlineAdminEditorShell } from '@/components/admin/InlineAdminEditorShell'
import { PageEditor } from '@/components/admin/PageEditor'

interface InlinePageEditorSectionProps {
  page: Parameters<typeof PageEditor>[0]['page']
  title: string
  description: string
  triggerLabel: string
}

export function InlinePageEditorSection({
  page,
  title,
  description,
  triggerLabel,
}: InlinePageEditorSectionProps) {
  const [open, setOpen] = useState(false)

  return (
    <InlineAdminEditorShell
      open={open}
      onOpenChange={setOpen}
      triggerLabel={triggerLabel}
      title={title}
      description={description}
    >
      <PageEditor
        inlineMode
        page={page}
        onSaved={() => setOpen(false)}
      />
    </InlineAdminEditorShell>
  )
}
