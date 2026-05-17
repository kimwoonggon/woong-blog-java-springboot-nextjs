"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FileText, Upload, Trash2, Download, Loader2 } from 'lucide-react'
import { fetchWithCsrf } from '@/lib/api/auth'
import { toast } from 'sonner'
import { getBrowserApiBaseUrl } from '@/lib/api/browser'
import { getErrorMessage } from '@/lib/error-message'
import { sanitizeAdminUploadError } from '@/lib/admin-save-error'
import { revalidatePublicPathsAfterMutation } from '@/lib/public-revalidation-client'
import { getResumePublicRevalidationPaths } from '@/lib/public-revalidation-paths'
import { isAcceptedPdfFile } from '@/lib/file-validation'

interface Asset {
    id: string
    bucket: string
    path: string
}

interface ResumeEditorProps {
    resumeAsset: Asset | null
}

export function ResumeEditor({ resumeAsset }: ResumeEditorProps) {
    const router = useRouter()
    const [isUploading, setIsUploading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    const [asset, setAsset] = useState<Asset | null>(resumeAsset)

    const resumeUrl = asset ? `/media/${asset.path}` : null

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size <= 0) {
            toast.error('Please upload a non-empty PDF file.')
            e.target.value = ''
            return
        }

        if (!isAcceptedPdfFile(file)) {
            toast.error('Please upload a PDF file.')
            e.target.value = ''
            return
        }

        setIsUploading(true)
        const toastId = toast.loading('Uploading resume...')

        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('bucket', 'public-resume')

            const res = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/uploads`, {
                method: 'POST',
                body: formData,
            })

            const uploadData = await res.json()
            if (!res.ok) throw new Error(uploadData.error || 'Upload failed')

            const settingsRes = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/admin/site-settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resumeAssetId: uploadData.id
                }),
            })

            if (!settingsRes.ok) throw new Error('Failed to link resume to settings')

            setAsset({ id: uploadData.id, bucket: 'public-resume', path: uploadData.path })
            await revalidatePublicPathsAfterMutation(getResumePublicRevalidationPaths())
            toast.success('Resume uploaded and linked!', { id: toastId })
            router.refresh()
        } catch (error: unknown) {
            toast.error(
                sanitizeAdminUploadError(
                    getErrorMessage(error, 'Failed to upload'),
                    'Resume could not be uploaded. Please retry after storage is healthy.'
                ),
                { id: toastId }
            )
        } finally {
            setIsUploading(false)
            e.target.value = ''
        }
    }

    async function handleDelete() {
        if (!asset || !confirm('Are you sure you want to remove your resume?')) return

        setIsDeleting(true)
        const toastId = toast.loading('Removing resume...')

        try {
            const settingsRes = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/admin/site-settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resumeAssetId: null }),
            })

            if (!settingsRes.ok) throw new Error('Failed to update site settings')

            const assetRes = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/uploads?id=${asset.id}`, {
                method: 'DELETE',
            })

            if (!assetRes.ok) {
                await assetRes.json().catch(() => null)
            }

            setAsset(null)
            await revalidatePublicPathsAfterMutation(getResumePublicRevalidationPaths())
            toast.success('Resume removed successfully!', { id: toastId })
            router.refresh()
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to remove'), { id: toastId })
        } finally {
            setIsDeleting(false)
        }
    }

    return (
        <div className="space-y-6 rounded-lg border bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
            <div>
                <h2 className="text-xl font-bold">Resume Management</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Upload your latest resume (PDF) to be displayed on the public Resume page and navigation.
                </p>
            </div>

            <div className="flex flex-col gap-6 md:flex-row md:items-center">
                {asset ? (
                    <div className="flex flex-1 items-center gap-4 rounded-lg border p-4 bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
                        <div className="rounded-md bg-red-100 p-2 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            <FileText size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{asset.path}</p>
                            <p className="text-xs text-gray-500">Resume PDF Uploaded</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button size="icon" variant="outline" asChild>
                                <a
                                    aria-label="Download resume"
                                    href={resumeUrl || '#'}
                                    download
                                >
                                    <Download size={16} />
                                </a>
                            </Button>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label="Delete resume"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-800">
                        <FileText className="h-12 w-12 text-gray-300 mb-4" />
                        <p className="text-sm text-gray-500 mb-4 text-center">
                            No resume uploaded yet. <br />
                            Upload a PDF file to get started.
                        </p>
                        <Label
                            htmlFor="resume-upload"
                            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                        >
                            {isUploading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Upload className="mr-2" size={16} />}
                            Upload PDF
                            <input
                                id="resume-upload"
                                type="file"
                                className="hidden"
                                accept=".pdf"
                                onChange={handleUpload}
                                disabled={isUploading}
                            />
                        </Label>
                    </div>
                )}
            </div>
        </div>
    )
}
