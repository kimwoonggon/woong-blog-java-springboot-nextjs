import { fetchServerSession, type ServerSession } from '@/lib/api/server'

export function canShowPublicAdminAffordances(session: Pick<ServerSession, 'authenticated' | 'role'> | null | undefined) {
  return session?.authenticated === true && session.role === 'admin'
}

export async function getPublicAdminAffordanceState() {
  const session = await fetchServerSession()

  return {
    session,
    canShowAdminAffordances: canShowPublicAdminAffordances(session),
  }
}
