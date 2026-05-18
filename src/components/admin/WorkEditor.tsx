"use client"

import { WorkContentSection } from '@/components/admin/work-editor/WorkContentSection'
import { WorkEditorSaveBar } from '@/components/admin/work-editor/WorkEditorSaveBar'
import { WorkEditorTabs } from '@/components/admin/work-editor/WorkEditorTabs'
import { WorkGeneralSection } from '@/components/admin/work-editor/WorkGeneralSection'
import { WorkMediaSection } from '@/components/admin/work-editor/WorkMediaSection'
import { UnsavedChangesDialog } from '@/components/admin/work-editor/UnsavedChangesDialog'
import { useWorkEditorController } from '@/components/admin/work-editor/useWorkEditorController'
import type { WorkEditorProps } from '@/components/admin/work-editor/types'

export function WorkEditor(props: WorkEditorProps) {
  const {
    generalSectionProps,
    tabsProps,
    mediaSectionProps,
    contentSectionProps,
    saveBarProps,
    unsavedDialogProps,
  } = useWorkEditorController(props)

  return (
    <div className="space-y-8 max-w-4xl">
      <WorkGeneralSection {...generalSectionProps} />
      <WorkEditorTabs {...tabsProps} />
      <WorkMediaSection {...mediaSectionProps} />
      <WorkContentSection {...contentSectionProps} />
      <WorkEditorSaveBar {...saveBarProps} />
      <UnsavedChangesDialog {...unsavedDialogProps} />
    </div>
  )
}
