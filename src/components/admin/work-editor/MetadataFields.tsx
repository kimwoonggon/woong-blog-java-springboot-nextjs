import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MetadataField } from '@/components/admin/work-editor/metadata'

interface MetadataFieldsProps {
  fields: MetadataField[]
  onAddField: () => void
  onUpdateField: (fieldId: string, nextField: Partial<Pick<MetadataField, 'key' | 'value'>>) => void
  onRemoveField: (fieldId: string) => void
}

export function MetadataFields({
  fields,
  onAddField,
  onUpdateField,
  onRemoveField,
}: MetadataFieldsProps) {
  return (
    <div className="space-y-4 rounded-2xl border border-border/80 bg-background p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium">Flexible Metadata</h3>
          <p className="text-sm text-muted-foreground">
            Add structured key/value fields without editing raw JSON.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onAddField}>
          <Plus size={14} />
          Add Field
        </Button>
      </div>
      {fields.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
          No metadata fields yet.
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-col gap-2 md:flex-row">
              <div className="space-y-2 md:w-1/3">
                <Label htmlFor={`metadata-key-${field.id}`}>Key</Label>
                <Input
                  id={`metadata-key-${field.id}`}
                  placeholder="e.g. role…"
                  value={field.key}
                  onChange={(event) => onUpdateField(field.id, { key: event.target.value })}
                />
              </div>
              <div className="space-y-2 md:flex-1">
                <Label htmlFor={`metadata-value-${field.id}`}>Value</Label>
                <Input
                  id={`metadata-value-${field.id}`}
                  placeholder="e.g. Lead Frontend Engineer…"
                  value={field.value}
                  onChange={(event) => onUpdateField(field.id, { value: event.target.value })}
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove metadata field ${index + 1}`}
                  onClick={() => onRemoveField(field.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
