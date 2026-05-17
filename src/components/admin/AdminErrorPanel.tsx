interface AdminErrorPanelProps {
  title: string
  message: string
}

export function AdminErrorPanel({ title, message }: AdminErrorPanelProps) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6">{message}</p>
    </div>
  )
}
