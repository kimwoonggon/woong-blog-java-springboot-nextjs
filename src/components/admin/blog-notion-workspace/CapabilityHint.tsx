import { X } from 'lucide-react'

interface CapabilityHintProps {
    onDismiss: () => void
}

export function CapabilityHint({ onDismiss }: CapabilityHintProps) {
    return (
        <div
            data-testid="tiptap-capability-hint"
            className="flex items-start gap-2 rounded-2xl border border-dashed border-sky-300 bg-sky-50/70 px-4 py-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/20 dark:text-sky-100"
        >
            <span className="flex-1">
                Reuse the existing Tiptap stack here: Type <span className="font-medium">/</span> for commands, insert <span className="font-medium">code blocks</span> for snippets, drag/drop or paste images directly into the canvas, and keep HTML / 3D blocks available through the existing toolbar controls.
            </span>
            <button
                type="button"
                aria-label="Close hint"
                className="rounded p-0.5 transition hover:bg-sky-100/80 dark:hover:bg-sky-900/50"
                onClick={onDismiss}
            >
                <X size={14} />
            </button>
        </div>
    )
}
