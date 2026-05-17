"use client"

import Image from 'next/image'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Upload } from 'lucide-react'
import { fetchWithCsrf } from '@/lib/api/auth'
import { getBrowserApiBaseUrl } from '@/lib/api/browser'
import { revalidatePublicPathsAfterMutation } from '@/lib/public-revalidation-client'
import { getPagePublicRevalidationPaths } from '@/lib/public-revalidation-paths'
import { isAcceptedImageFile } from '@/lib/file-validation'
import { sanitizeAdminUploadError } from '@/lib/admin-save-error'

interface HomeContent {
    headline?: string
    introText?: string
    profileImageUrl?: string
}

interface HomePageEditorProps {
    pageId: string
    pageTitle: string
    initialContent: HomeContent
}

const DEFAULT_HEADLINE = 'Hi, I am John, Creative Technologist'
const DEFAULT_INTRO_TEXT = 'Amet minim mollit non deserunt ullamco est sit aliqua dolor do amet sint.'
const IMAGE_UPLOAD_FALLBACK = 'Image could not be uploaded. Please retry after storage is healthy.'

export function HomePageEditor({ pageId, pageTitle, initialContent }: HomePageEditorProps) {
    const router = useRouter()
    const [headline, setHeadline] = useState(initialContent.headline || DEFAULT_HEADLINE)
    const [introText, setIntroText] = useState(initialContent.introText || DEFAULT_INTRO_TEXT)
    const [profileImageUrl, setProfileImageUrl] = useState(initialContent.profileImageUrl || '')
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const didMount = useRef(false)

    useEffect(() => {
        if (!didMount.current) {
            didMount.current = true
            return
        }

        setHeadline(initialContent.headline || DEFAULT_HEADLINE)
        setIntroText(initialContent.introText || DEFAULT_INTRO_TEXT)
        setProfileImageUrl(initialContent.profileImageUrl || '')
    }, [initialContent.headline, initialContent.introText, initialContent.profileImageUrl])

    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        if (!isAcceptedImageFile(file)) {
            alert('Please upload an image file.')
            e.target.value = ''
            return
        }

        setIsUploading(true)

        const formData = new FormData()
        formData.append('file', file)
        formData.append('bucket', 'public-assets')

        try {
            const response = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/uploads`, {
                method: 'POST',
                body: formData,
            })

            if (response.ok) {
                const data = await response.json()
                setProfileImageUrl(data.publicUrl || data.url || '')
            } else {
                const errorData = await response.json().catch(() => null) as { error?: unknown } | null
                const message = typeof errorData?.error === 'string' ? errorData.error : 'Unknown error'
                alert(`Failed to upload image: ${sanitizeAdminUploadError(message, IMAGE_UPLOAD_FALLBACK)}`)
            }
        } catch (error) {
            if (error instanceof Error) {
                alert(`Failed to upload image: ${sanitizeAdminUploadError(error.message, IMAGE_UPLOAD_FALLBACK)}`)
            } else {
                alert('Failed to upload image')
            }
        } finally {
            setIsUploading(false)
            e.target.value = ''
        }
    }

    async function handleSave() {
        setIsSaving(true)

        const content = {
            headline,
            introText,
            profileImageUrl,
        }

        try {
            const response = await fetchWithCsrf(`${getBrowserApiBaseUrl()}/admin/pages`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: pageId, title: pageTitle, contentJson: JSON.stringify(content) }),
            })

            if (response.ok) {
                await revalidatePublicPathsAfterMutation(getPagePublicRevalidationPaths('home'))
                router.refresh()
                alert('Home page saved successfully!')
            } else {
                alert('Failed to save')
            }
        } catch {
            alert('Failed to save')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-6 rounded-lg border border-border bg-card p-6 text-card-foreground">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Home Page - Hero Section</h2>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            {/* Profile Image */}
            <div className="space-y-2">
                <Label>Profile Image</Label>
                <div className="flex items-center gap-6">
                    <div className="relative h-32 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                        {profileImageUrl ? (
                            <Image
                                src={profileImageUrl}
                                alt="Profile"
                                fill
                                className="object-cover"
                                unoptimized
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-gray-400">
                                No Image
                            </div>
                        )}
                    </div>
                    <div>
                        <label className="cursor-pointer">
                            <div className="flex items-center gap-2 rounded-md border px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-900">
                                <Upload size={16} />
                                {isUploading ? 'Uploading...' : 'Upload Image'}
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                                disabled={isUploading}
                            />
                        </label>
                        {profileImageUrl && (
                            <button
                                type="button"
                                className="mt-2 text-sm text-red-500 hover:underline"
                                onClick={() => setProfileImageUrl('')}
                            >
                                Remove Image
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Headline */}
            <div className="space-y-2">
                <Label htmlFor="headline">Headline</Label>
                <Input
                    id="headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Hi, I am John, Creative Technologist"
                />
                <p className="text-sm text-gray-500">This is the main title shown in the Hero section</p>
            </div>

            {/* Intro Text */}
            <div className="space-y-2">
                <Label htmlFor="introText">Intro Text</Label>
                <Textarea
                    id="introText"
                    value={introText}
                    onChange={(e) => setIntroText(e.target.value)}
                    rows={4}
                    placeholder="Your introduction text..."
                />
                <p className="text-sm text-gray-500">This appears below the headline in the Hero section</p>
            </div>
        </div>
    )
}
