export function useBatchJobPolling({
  isOpen,
  activeJobId,
  activeJobStatus,
  loadRecentJobs,
  loadJobDetail,
}: {
  isOpen: boolean
  activeJobId: string | null
  activeJobStatus?: string | null
  loadRecentJobs: (nextActiveJobId?: string | null) => Promise<void>
  loadJobDetail: (jobId: string) => Promise<void>
}) {
  void isOpen
  void activeJobId
  void activeJobStatus
  void loadRecentJobs
  void loadJobDetail
  // Polling intentionally disabled. Refresh should happen on explicit user action.
}
