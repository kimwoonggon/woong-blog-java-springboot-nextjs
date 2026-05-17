import { cn } from '@/lib/utils'

const capabilityChips = [
  'Slash commands',
  'Code blocks',
  'Drag / drop / paste images',
  'HTML block',
  '3D block',
]

interface AuthoringCapabilityHintsProps {
  className?: string
  compact?: boolean
}

export function AuthoringCapabilityHints({ className, compact = false }: AuthoringCapabilityHintsProps) {
  return (
    <div className={cn('rounded-2xl border border-sky-300 bg-sky-50/70 px-4 py-3 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/20 dark:text-sky-100', className)}>
      <p className="font-medium">
        This editor uses the existing Tiptap toolset. Type <span className="font-mono">/</span> to open commands, use code blocks for snippets, and add images with the toolbar or drag/drop/paste.
      </p>
      {!compact ? (
        <p className="mt-2 text-xs text-sky-900/80 dark:text-sky-100/80">
          Advanced HTML and 3D blocks stay available here, but the work editor remains intentionally simpler until that workflow earns a dedicated upgrade.
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
        {capabilityChips.map((chip) => (
          <span key={chip} className="rounded-full border border-sky-400/50 bg-white/70 px-2.5 py-1 dark:border-sky-700 dark:bg-sky-950/60">
            {chip}
          </span>
        ))}
      </div>
    </div>
  )
}
