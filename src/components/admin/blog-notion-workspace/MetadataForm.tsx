import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface MetadataFormProps {
    published: boolean
    tagsInput: string
    title: string
    onPublishedChange: (value: boolean) => void
    onTagsInputChange: (value: string) => void
    onTitleChange: (value: string) => void
}

export function MetadataForm({
    onPublishedChange,
    onTagsInputChange,
    onTitleChange,
    published,
    tagsInput,
    title,
}: MetadataFormProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notion-blog-title">Title</Label>
                <Input
                    id="notion-blog-title"
                    value={title}
                    onChange={(event) => onTitleChange(event.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="notion-blog-tags">Tags</Label>
                <Input
                    id="notion-blog-tags"
                    value={tagsInput}
                    onChange={(event) => onTagsInputChange(event.target.value)}
                    placeholder="react, portfolio, notes"
                />
            </div>
            <div className="flex items-end">
                <div className="flex items-center space-x-2 rounded-2xl border border-border/80 px-4 py-3">
                    <Checkbox
                        id="notion-blog-published"
                        checked={published}
                        onCheckedChange={(value) => onPublishedChange(Boolean(value))}
                    />
                    <Label htmlFor="notion-blog-published" className="cursor-pointer">Published</Label>
                </div>
            </div>
        </div>
    )
}
