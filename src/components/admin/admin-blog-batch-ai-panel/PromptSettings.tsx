import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface PromptSettingsProps {
  customPrompt: string
  hasUnsavedPrompt: boolean
  onCustomPromptChange: (value: string) => void
  onResetSystemPrompt: () => void
  onSaveSystemPrompt: () => void
}

export function PromptSettings({
  customPrompt,
  hasUnsavedPrompt,
  onCustomPromptChange,
  onResetSystemPrompt,
  onSaveSystemPrompt,
}: PromptSettingsProps) {
  return (
    <div className="mt-3 space-y-2 rounded-md border border-input bg-background px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor="batch-ai-system-prompt" className="text-xs text-muted-foreground">
          System prompt
        </Label>
        <div className="flex items-center gap-2">
          {hasUnsavedPrompt ? (
            <span className="text-xs text-amber-600">Unsaved</span>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={onResetSystemPrompt}>
            Reset
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onSaveSystemPrompt}>
            Save prompt
          </Button>
        </div>
      </div>
      <Textarea
        id="batch-ai-system-prompt"
        aria-label="Batch AI system prompt"
        value={customPrompt}
        onChange={(event) => onCustomPromptChange(event.target.value)}
        className="max-h-44 min-h-28 resize-y text-sm"
      />
    </div>
  )
}
