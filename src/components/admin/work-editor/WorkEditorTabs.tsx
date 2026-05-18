import { Button } from '@/components/ui/button'
import type { WorkEditorTab } from '@/components/admin/work-editor/types'

const WORK_EDITOR_TABS = [
  { value: 'general', label: 'General' },
  { value: 'media', label: 'Media & Videos' },
  { value: 'content', label: 'Content' },
] as const

interface WorkEditorTabsProps {
  activeTab: WorkEditorTab
  onSelectTab: (tab: WorkEditorTab) => void
}

export function WorkEditorTabs({ activeTab, onSelectTab }: WorkEditorTabsProps) {
  return (
    <div className="sticky top-4 z-10 rounded-2xl border border-border/80 bg-background/95 p-2 shadow-sm backdrop-blur-sm">
      <div className="grid gap-2 sm:grid-cols-3" role="tablist" aria-label="Work editor sections">
        {WORK_EDITOR_TABS.map((tab) => (
          <Button
            key={tab.value}
            type="button"
            role="tab"
            variant={activeTab === tab.value ? 'secondary' : 'ghost'}
            aria-selected={activeTab === tab.value}
            aria-controls={`work-editor-${tab.value}-section`}
            className="justify-center"
            onClick={() => onSelectTab(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
