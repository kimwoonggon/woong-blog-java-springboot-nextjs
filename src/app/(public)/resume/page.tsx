import { InlineAdminEditorShell } from '@/components/admin/InlineAdminEditorShell'
import { PublicAdminClientGate } from '@/components/admin/PublicAdminClientGate'
import { ResumeEditor } from '@/components/admin/ResumeEditor'
import { LocalQaEmptyResumeBoundary } from '@/components/content/LocalQaQueryBoundary'
import { ResumePdfViewer } from '@/components/content/ResumePdfViewer'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { fetchResume } from '@/lib/api/site-settings'
import { createPublicMetadata } from '@/lib/seo'
import { unstable_rethrow } from 'next/navigation'

export const revalidate = 60
export const metadata = createPublicMetadata({
    title: 'Resume',
    description: 'Resume PDF and professional background for Woonggon Kim.',
    path: '/resume',
})

function ResumeUnavailableMessage() {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                Resume unavailable
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
                No resume has been published yet. Use the contact page if you need one directly.
            </p>
        </div>
    )
}

async function fetchPublicResumeOrNull() {
    try {
        return await fetchResume()
    } catch (error) {
        unstable_rethrow(error)
        console.error('Failed to load public resume.', error)
        return null
    }
}

export default async function ResumePage() {
    const resume = await fetchPublicResumeOrNull()
    const resumeUrl = resume?.publicUrl ?? null
    const resumeAsset = resume
        ? {
            id: resume.id,
            bucket: 'public-resume',
            path: resume.path,
        }
        : null

    return (
        <div
            data-testid="resume-shell"
            className="container mx-auto flex h-[calc(100vh-64px-72px)] flex-col px-4 py-7 md:px-6 md:py-10"
        >
            <header className="mb-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-3xl font-heading font-bold text-foreground md:text-4xl">Resume</h1>
                    </div>
                    <LocalQaEmptyResumeBoundary fallback={null}>
                        {resumeUrl && (
                            <div className="rounded-2xl border border-border/70 bg-muted/30 p-1">
                                <Button asChild>
                                    <a href={resumeUrl} download>
                                        <Download className="mr-2 h-4 w-4" /> Download PDF
                                    </a>
                                </Button>
                            </div>
                        )}
                    </LocalQaEmptyResumeBoundary>
                </div>
            </header>

            <div className="flex-1 w-full overflow-hidden rounded-[2rem] border border-border/70 bg-muted/30 shadow-sm">
                <LocalQaEmptyResumeBoundary fallback={<ResumeUnavailableMessage />}>
                    {resumeUrl ? (
                        <ResumePdfViewer url={resumeUrl} />
                    ) : (
                        <ResumeUnavailableMessage />
                    )}
                </LocalQaEmptyResumeBoundary>
            </div>
            <PublicAdminClientGate>
                <InlineAdminEditorShell
                    triggerLabel="이력서 PDF 업로드"
                    title="Resume Inline Upload"
                    description="Upload or replace the PDF directly on this page."
                >
                    <ResumeEditor resumeAsset={resumeAsset} />
                </InlineAdminEditorShell>
            </PublicAdminClientGate>
        </div>
    )
}
