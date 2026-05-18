export interface BlogWorkspaceListItem {
    id: string
    title: string
    slug: string
    published: boolean
    publishedAt?: string | null
    updatedAt?: string
    tags?: string[]
}

export interface BlogWorkspaceRecord extends BlogWorkspaceListItem {
    excerpt: string
    content: { html: string }
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'
