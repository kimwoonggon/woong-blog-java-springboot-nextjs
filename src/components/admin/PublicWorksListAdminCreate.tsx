"use client"

import dynamic from 'next/dynamic'
import { PublicAdminClientGate } from '@/components/admin/PublicAdminClientGate'

const PublicWorksInlineCreateShell = dynamic(
  () => import('@/components/admin/PublicWorksInlineCreateShell').then((module) => module.PublicWorksInlineCreateShell),
  {
    ssr: false,
    loading: () => null,
  },
)

export function PublicWorksListAdminCreate() {
  return (
    <PublicAdminClientGate>
      <PublicWorksInlineCreateShell />
    </PublicAdminClientGate>
  )
}
