import type { RefObject } from 'react'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import type { BlogWorkspaceListItem } from './types'
import { displayText, formatTimestamp, normalizedTags, usableId } from './utils'

interface LibrarySheetProps {
    activeBlogId: string | null
    filteredBlogs: BlogWorkspaceListItem[]
    isOpen: boolean
    search: string
    scrollContainerRef: RefObject<HTMLDivElement | null>
    activeItemRef: RefObject<HTMLDivElement | null>
    onOpenChange: (open: boolean) => void
    onSearchChange: (value: string) => void
    onScrollPositionChange: (scrollTop: number) => void
    onSelectBlog: () => void
}

export function LibrarySheet({
    activeBlogId,
    activeItemRef,
    filteredBlogs,
    isOpen,
    onOpenChange,
    onScrollPositionChange,
    onSearchChange,
    onSelectBlog,
    scrollContainerRef,
    search,
}: LibrarySheetProps) {
    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetTrigger asChild>
                <Button data-testid="notion-library-trigger" variant="outline" size="sm" className="gap-2">
                    <FileText size={16} />
                    Library
                </Button>
            </SheetTrigger>
            <SheetContent
                side="left"
                className="w-80 p-0 sm:max-w-none"
                showCloseButton={false}
            >
                <div data-testid="notion-library-sheet" className="flex h-full flex-col overflow-hidden bg-background">
                    <SheetTitle className="sr-only">Blog library</SheetTitle>
                    <SheetDescription className="sr-only">Select a blog document to edit in Notion view.</SheetDescription>
                    <div className="border-b border-border/80 px-5 py-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Blog library</p>
                                <p className="text-xs text-muted-foreground">Select a document and stage posts for future batch actions.</p>
                            </div>
                        </div>
                    </div>
                    <div className="border-b border-border/80 bg-background/95 p-3 backdrop-blur-sm">
                        <Input
                            placeholder="Search posts..."
                            value={search}
                            onChange={(event) => onSearchChange(event.target.value)}
                            className="h-8 text-sm"
                        />
                    </div>
                    <div
                        ref={scrollContainerRef}
                        className="space-y-2 overflow-y-auto p-3"
                        onScroll={(event) => {
                            onScrollPositionChange(event.currentTarget.scrollTop)
                        }}
                    >
                        {filteredBlogs.map((blog) => {
                            const blogId = usableId(blog.id)
                            const blogTitle = displayText(blog.title, 'Untitled post')
                            const blogTags = normalizedTags(blog.tags)
                            const isActive = blogId !== null && blogId === activeBlogId

                            return (
                                <div
                                    key={blogId ?? `blog-${blogTitle}`}
                                    ref={isActive ? activeItemRef : undefined}
                                    className={`rounded-2xl border px-4 py-3 transition ${
                                        isActive
                                            ? 'border-primary/40 bg-primary/5 shadow-sm'
                                            : 'border-transparent hover:border-border hover:bg-muted/40'
                                    }`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <Link
                                                href={blogId ? `/admin/blog/notion?id=${encodeURIComponent(blogId)}` : '/admin/blog/notion'}
                                                data-testid="notion-blog-list-item"
                                                className="block min-w-0"
                                                onClick={onSelectBlog}
                                            >
                                                <p className="line-clamp-2 text-sm font-medium text-gray-900 underline-offset-4 hover:underline dark:text-gray-100">
                                                    {blogTitle}
                                                </p>
                                            </Link>
                                            <Badge variant="secondary" className={blog.published === true ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'}>
                                                {blog.published === true ? 'Published' : 'Draft'}
                                            </Badge>
                                        </div>
                                        <p className="mt-2 text-xs text-muted-foreground">
                                            Updated {formatTimestamp(blog.updatedAt ?? blog.publishedAt)}
                                        </p>
                                        {blogTags.length ? (
                                            <p className="mt-2 line-clamp-1 text-xs text-muted-foreground">
                                                {blogTags.join(' · ')}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
