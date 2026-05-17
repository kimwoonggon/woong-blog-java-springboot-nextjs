import { AdminErrorPanel } from '@/components/admin/AdminErrorPanel'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { fetchAdminMembers, type AdminMemberItem } from '@/lib/api/admin-members'

export const dynamic = 'force-dynamic'

function formatDate(value?: string | null) {
    if (!value) {
        return '—'
    }

    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString()
}

function roleTone(role: string) {
    return role === 'admin'
        ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300'
        : 'bg-muted text-muted-foreground'
}

function displayText(value: unknown, fallback: string) {
    return typeof value === 'string' && value.trim() ? value : fallback
}

function formatSessionCount(value: unknown) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : '—'
}

export default async function AdminMembersPage() {
    let members: AdminMemberItem[] = []
    let loadFailed = false

    try {
        members = await fetchAdminMembers()
    } catch {
        loadFailed = true
    }

    return (
        <div className="space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">Members</h1>
                <p className="text-sm text-muted-foreground">
                    Read-only membership overview. This screen is intentionally privacy-safe and excludes raw session or network identifiers.
                </p>
            </div>

            {loadFailed ? (
                <AdminErrorPanel
                    title="Members are unavailable"
                    message="Member profiles could not be loaded from the backend. Please retry after checking the API and database connection."
                />
            ) : (
                <div className="rounded-md border border-border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Member</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Provider</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead>Last Login</TableHead>
                                <TableHead className="text-right">Active Sessions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.length > 0 ? (
                                members.map((member, index) => {
                                    const displayName = displayText(member.displayName, 'Unknown member')
                                    const email = displayText(member.email, 'No email provided')
                                    const role = displayText(member.role, 'member')
                                    const provider = displayText(member.provider, 'unknown')

                                    return (
                                    <TableRow key={displayText(member.id, `member-${index}`)} data-testid="member-row">
                                        <TableCell>
                                            <div className="space-y-1">
                                                <p className="font-medium text-foreground">{displayName}</p>
                                                <p className="text-sm text-muted-foreground">{email}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={roleTone(role)}>
                                                {role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="capitalize">{provider}</TableCell>
                                        <TableCell>{formatDate(member.createdAt)}</TableCell>
                                        <TableCell>{formatDate(member.lastLoginAt)}</TableCell>
                                        <TableCell className="text-right">{formatSessionCount(member.activeSessionCount)}</TableCell>
                                    </TableRow>
                                    )
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No members found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    )
}
