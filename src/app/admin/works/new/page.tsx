
import { WorkEditor } from '@/components/admin/WorkEditor'

export default function NewWorkPage() {
    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-foreground">New Work</h1>
            <WorkEditor />
        </div>
    )
}
