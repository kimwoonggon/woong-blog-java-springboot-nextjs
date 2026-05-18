import { Button } from '@/components/ui/button'

interface WorkEditorSaveBarProps {
  saveError: string | null
  inlineMode: boolean
  isEditing: boolean
  isSaving: boolean
  isDirty: boolean
  hasPersistedVideoChanges: boolean
  hasStagedVideos: boolean
  title: string
  onCancel: () => void
  onSave: () => void
}

export function WorkEditorSaveBar({
  saveError,
  inlineMode,
  isEditing,
  isSaving,
  isDirty,
  hasPersistedVideoChanges,
  hasStagedVideos,
  title,
  onCancel,
  onSave,
}: WorkEditorSaveBarProps) {
  return (
    <div className="flex flex-col gap-3 border-t pt-8 sm:flex-row sm:items-center sm:justify-end">
      {saveError ? (
        <p role="alert" aria-live="polite" data-testid="admin-work-form-error" className="text-sm text-red-600 sm:mr-auto">
          {saveError}
        </p>
      ) : null}
      {!inlineMode && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
      )}

      {isEditing ? (
        <Button
          type="button"
          onClick={onSave}
          disabled={isSaving || (!isDirty && !hasPersistedVideoChanges) || !title.trim()}
          className="px-8 font-medium"
        >
          {isSaving ? 'Saving…' : 'Update Work'}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onSave}
          disabled={isSaving || !isDirty || !title.trim()}
          className="px-8 font-medium"
        >
          {isSaving ? 'Creating…' : hasStagedVideos ? 'Create with Videos' : 'Create Work'}
        </Button>
      )}
    </div>
  )
}
