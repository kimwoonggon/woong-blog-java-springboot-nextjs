import { BlockRenderer } from '@/components/content/BlockRenderer'
import { PublicAdminClientGate } from '@/components/admin/PublicAdminClientGate'
import { InlinePageEditorSection } from '@/components/admin/InlinePageEditorSection'
import { InteractiveRenderer } from '@/components/content/InteractiveRenderer'
import { LocalQaBrokenPageBoundary } from '@/components/content/LocalQaQueryBoundary'
import { isBlockPageContent, isHtmlPageContent, parsePageContentJson } from '@/lib/content/page-content'
import { fetchPublicPageBySlug } from '@/lib/api/pages'
import { createPublicMetadata } from '@/lib/seo'

export const revalidate = 60
export const metadata = createPublicMetadata({
    title: 'Introduction',
    description: 'Introduction, background, and current focus areas like AI, computer vision for Woonggon Kim.',
    path: '/introduction',
})

export default async function IntroductionPage() {
    const page = await fetchPublicPageBySlug('introduction')
    const title = page?.title || 'Introduction'
    const parsedContent = parsePageContentJson(page?.contentJson)

    return (
        <LocalQaBrokenPageBoundary>
            <div data-testid="static-public-shell" className="container mx-auto max-w-3xl px-4 py-7 md:px-6 md:py-10">
                <header className="mb-6 min-w-0">
                    <h1 className="max-w-full break-words text-3xl font-heading font-bold text-foreground [overflow-wrap:anywhere] md:text-4xl">{title}</h1>
                </header>

                <div className="prose prose-lg max-w-none dark:prose-invert">
                    {isHtmlPageContent(parsedContent) ? (
                        <InteractiveRenderer html={parsedContent.html} />
                    ) : isBlockPageContent(parsedContent) ? (
                        <BlockRenderer blocks={parsedContent.blocks} />
                    ) : (
                        <div className="rounded-[2rem] border border-border/70 bg-background px-5 py-5 shadow-sm md:px-6">
                            <p className="text-sm leading-relaxed text-foreground/80">
                                Hello! I&apos;m Woonggon Kim, IT Technician.
                            </p>
                        </div>
                    )}
                </div>

                {page && (
                    <PublicAdminClientGate>
                        <InlinePageEditorSection
                            triggerLabel="소개글 수정"
                            title="Introduction Inline Editor"
                            description="현재 페이지를 벗어나지 않고 소개글을 바로 수정합니다."
                            page={{
                                id: page.id,
                                title: page.title,
                                slug: page.slug,
                                content: parsedContent ?? { html: '' },
                            }}
                        />
                    </PublicAdminClientGate>
                )}
            </div>
        </LocalQaBrokenPageBoundary>
    )
}
