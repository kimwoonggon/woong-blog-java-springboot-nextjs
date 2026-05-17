'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Wand2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { TiptapEditor } from './TiptapEditor'
import { fetchWithCsrf } from '@/lib/api/auth'
import { fetchAdminAiRuntimeConfigBrowser, type AdminAiRuntimeConfig } from '@/lib/api/admin-ai'
import { getErrorMessage } from '@/lib/error-message'

interface AIFixDialogProps {
    content: string
    onApply: (fixedContent: string) => void
    apiEndpoint?: string
    title?: string
    extraBodyParams?: Record<string, unknown>
}

type ProviderOption = 'openai' | 'codex'
const blogFixSystemPromptKey = 'admin-ai-blog-fix-system-prompt'
const workEnrichSystemPromptKey = 'admin-ai-work-enrich-system-prompt'
const defaultCodexModels = ['gpt-5.5', 'gpt-5.4', 'gpt-5.3-codex', 'gpt-5.3-codex-spark']

function normalizeProvider(value?: string | null): ProviderOption {
    if (value === 'codex') {
        return 'codex'
    }

    return 'openai'
}

function normalizeProviderOptions(providers: string[]) {
    return Array.from(new Set(providers.map((provider) => normalizeProvider(provider))))
}

function resolvePromptStorageKey(apiEndpoint: string) {
    return apiEndpoint.includes('/work-enrich')
        ? workEnrichSystemPromptKey
        : blogFixSystemPromptKey
}

function resolveDefaultPrompt(config: AdminAiRuntimeConfig, apiEndpoint: string, enrichTitle?: string) {
    if (apiEndpoint.includes('/work-enrich')) {
        const title = enrichTitle && enrichTitle.trim() ? enrichTitle.trim() : 'Untitled Project'
        return (config.defaultWorkEnrichPrompt || config.defaultSystemPrompt || '').replaceAll('{title}', title)
    }

    return config.defaultBlogFixPrompt || config.defaultSystemPrompt || ''
}

function resolveAllowedCodexModels(config: AdminAiRuntimeConfig | null) {
    const models = config?.allowedCodexModels?.length ? config.allowedCodexModels : defaultCodexModels
    return Array.from(new Set(models.includes('gpt-5.5') ? models : ['gpt-5.5', ...models]))
}

function resolveSelectedCodexModel(savedModel: string | null, config: AdminAiRuntimeConfig) {
    const allowedModels = resolveAllowedCodexModels(config)
    const preferredModel = savedModel || config.codexModel || 'gpt-5.5'
    return allowedModels.includes(preferredModel) ? preferredModel : allowedModels[0]
}

export function AIFixDialog({
    content,
    onApply,
    apiEndpoint = '/api/admin/ai/blog-fix',
    title = 'AI Content Fixer',
    extraBodyParams = {},
}: AIFixDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [fixedContent, setFixedContent] = useState<string | null>(null)
    const [runtimeConfig, setRuntimeConfig] = useState<AdminAiRuntimeConfig | null>(null)
    const [selectedProvider, setSelectedProvider] = useState<ProviderOption>('openai')
    const [codexModel, setCodexModel] = useState('gpt-5.5')
    const [codexReasoningEffort, setCodexReasoningEffort] = useState('medium')
    const [customPrompt, setCustomPrompt] = useState('')
    const [savedPrompt, setSavedPrompt] = useState('')
    const promptStorageKey = resolvePromptStorageKey(apiEndpoint)
    const enrichTitle = typeof extraBodyParams.title === 'string' ? extraBodyParams.title : ''

    function handleOpenChange(nextOpen: boolean) {
        if (!nextOpen) {
            setOpen(false)
            setLoading(false)
            setFixedContent(null)
            return
        }

        setOpen(true)
    }

    useEffect(() => {
        if (!open) {
            return
        }

        let cancelled = false
        const savedProvider = typeof window !== 'undefined' ? window.localStorage.getItem('admin-ai-provider') : null
        const savedModel = typeof window !== 'undefined' ? window.localStorage.getItem('admin-ai-codex-model') : null
        const savedReasoning = typeof window !== 'undefined' ? window.localStorage.getItem('admin-ai-codex-reasoning') : null
        const savedPrompt = typeof window !== 'undefined' ? window.localStorage.getItem(promptStorageKey) : null

        void fetchAdminAiRuntimeConfigBrowser()
            .then((config) => {
                if (cancelled) {
                    return
                }

                setRuntimeConfig(config)

                const availableProviders = normalizeProviderOptions(config.availableProviders?.length ? config.availableProviders : [config.provider])
                const preferredProvider = normalizeProvider(savedProvider || config.provider)
                const resolvedProvider = availableProviders.includes(preferredProvider)
                    ? preferredProvider
                    : availableProviders[0]

                setSelectedProvider(resolvedProvider)
                setCodexModel(resolveSelectedCodexModel(savedModel, config))
                setCodexReasoningEffort(savedReasoning || config.codexReasoningEffort || 'medium')
                const prompt = savedPrompt || resolveDefaultPrompt(config, apiEndpoint, enrichTitle)
                setCustomPrompt(prompt)
                setSavedPrompt(prompt)
            })
            .catch((error: unknown) => {
                if (!cancelled) {
                    toast.error(getErrorMessage(error, 'Failed to load AI runtime config'))
                }
            })

        return () => {
            cancelled = true
        }
    }, [apiEndpoint, enrichTitle, open, promptStorageKey])

    async function handleFix() {
        if (customPrompt !== savedPrompt) {
            toast.error('Save the system prompt before generating an AI fix.')
            return
        }

        setLoading(true)
        setFixedContent(null)

        try {
            const response = await fetchWithCsrf(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    html: content,
                    provider: selectedProvider,
                    codexModel,
                    codexReasoningEffort,
                    customPrompt: savedPrompt.trim() || undefined,
                    ...extraBodyParams,
                }),
            })

            const contentType = response.headers.get('content-type') ?? ''
            const rawBody = await response.text()
            const data = contentType.includes('application/json')
                ? JSON.parse(rawBody) as { error?: string; fixedHtml?: string }
                : null

            if (!response.ok) {
                if (response.status === 504) {
                    throw new Error('AI fix timed out while waiting for the backend response. Please retry.')
                }

                throw new Error(data?.error || rawBody || 'Failed to fix content')
            }

            if (!data?.fixedHtml) {
                throw new Error('AI fix response did not include fixed HTML.')
            }

            setFixedContent(data.fixedHtml)
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to fix content'))
        } finally {
            setLoading(false)
        }
    }

    function handleApply() {
        if (!fixedContent) {
            return
        }

        onApply(fixedContent)
        setOpen(false)
        setFixedContent(null)
        toast.success('AI changes applied successfully')
    }

    function saveSystemPrompt() {
        persistSystemPrompt(customPrompt)
        setSavedPrompt(customPrompt)
        toast.success('System prompt saved')
    }

    function persistSystemPrompt(value: string) {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(promptStorageKey, value)
        }
    }

    function resetSystemPrompt() {
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(promptStorageKey)
        }

        const defaultPrompt = runtimeConfig ? resolveDefaultPrompt(runtimeConfig, apiEndpoint, enrichTitle) : ''
        setCustomPrompt(defaultPrompt)
        setSavedPrompt(defaultPrompt)
        toast.success('System prompt reset')
    }

    const availableProviders = normalizeProviderOptions(runtimeConfig?.availableProviders?.length ? runtimeConfig.availableProviders : runtimeConfig ? [runtimeConfig.provider] : ['openai'])
    const allowedCodexModels = resolveAllowedCodexModels(runtimeConfig)
    const hasUnsavedPrompt = customPrompt !== savedPrompt
    const actionLabel = 'Start AI Fix'

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" type="button">
                    <Wand2 size={16} />
                    {title}
                </Button>
            </DialogTrigger>

            <DialogContent
                className="max-h-[92vh] w-[min(96vw,1280px)] max-w-[min(96vw,1280px)] overflow-hidden p-0 sm:max-w-[min(96vw,1280px)]"
                showCloseButton={false}
            >
                <DialogHeader className="border-b px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <DialogTitle className="flex items-center gap-2">
                            <Wand2 className="h-5 w-5" />
                            {title}
                        </DialogTitle>
                        <div className="flex items-center gap-2">
                            {!fixedContent ? (
                                <Button size="sm" onClick={handleFix} disabled={loading} className="gap-2" data-testid="start-ai-fix-button">
                                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                                    {loading ? 'Processing...' : actionLabel}
                                </Button>
                            ) : null}
                            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            {fixedContent ? (
                                <Button size="sm" onClick={handleApply} className="gap-2">
                                    <Check size={16} />
                                    Apply Changes
                                </Button>
                            ) : null}
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border/80 bg-muted/20 px-4 py-3">
                        <div className="space-y-1">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                Provider
                            </p>
                            {availableProviders.length > 1 ? (
                                <select
                                    id="ai-provider"
                                    aria-label="AI provider"
                                    value={selectedProvider}
                                    onChange={(event) => {
                                        const nextProvider = normalizeProvider(event.target.value)
                                        setSelectedProvider(nextProvider)
                                        if (typeof window !== 'undefined') {
                                            window.localStorage.setItem('admin-ai-provider', nextProvider)
                                        }
                                    }}
                                    className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                                >
                                    {availableProviders.map((provider) => (
                                        <option key={provider} value={provider}>
                                            {provider.toUpperCase()}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-sm font-medium uppercase">{selectedProvider}</p>
                            )}
                        </div>

                        {selectedProvider === 'codex' ? (
                            <>
                                <div className="space-y-1">
                                    <Label htmlFor="codex-model" className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                        Model
                                    </Label>
                                    <select
                                        id="codex-model"
                                        value={codexModel}
                                        onChange={(event) => {
                                            setCodexModel(event.target.value)
                                            if (typeof window !== 'undefined') {
                                                window.localStorage.setItem('admin-ai-codex-model', event.target.value)
                                            }
                                        }}
                                        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                                    >
                                        {allowedCodexModels.map((model) => (
                                            <option key={model} value={model}>{model}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <Label htmlFor="codex-reasoning" className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                        Reasoning
                                    </Label>
                                    <select
                                        id="codex-reasoning"
                                        value={codexReasoningEffort}
                                        onChange={(event) => {
                                            setCodexReasoningEffort(event.target.value)
                                            if (typeof window !== 'undefined') {
                                                window.localStorage.setItem('admin-ai-codex-reasoning', event.target.value)
                                            }
                                        }}
                                        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                                    >
                                        {(runtimeConfig?.allowedCodexReasoningEfforts || []).map((effort) => (
                                            <option key={effort} value={effort}>{effort}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        ) : null}
                    </div>
                    <div className="mt-3 space-y-2 rounded-2xl border border-border/80 bg-muted/20 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <Label htmlFor="ai-system-prompt" className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                System prompt
                            </Label>
                            <div className="flex items-center gap-2">
                                {hasUnsavedPrompt ? (
                                    <span className="text-xs text-amber-600">Unsaved</span>
                                ) : null}
                                <Button type="button" variant="outline" size="sm" onClick={resetSystemPrompt}>
                                    Reset
                                </Button>
                                <Button type="button" variant="secondary" size="sm" onClick={saveSystemPrompt}>
                                    Save prompt
                                </Button>
                            </div>
                        </div>
                        <Textarea
                            id="ai-system-prompt"
                            aria-label="AI system prompt"
                            value={customPrompt}
                            onChange={(event) => setCustomPrompt(event.target.value)}
                            className="max-h-40 min-h-28 resize-y bg-background text-sm"
                        />
                    </div>
                </DialogHeader>

                <div className="grid min-h-[60vh] grid-cols-1 divide-y lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:divide-x lg:divide-y-0">
                    <section className="flex min-h-0 flex-col bg-muted/10">
                        <div className="border-b bg-background px-4 py-3 text-sm font-medium text-muted-foreground">
                            Original
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto p-4">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <div dangerouslySetInnerHTML={{ __html: content }} />
                            </div>
                        </div>
                    </section>

                    <section className="flex min-h-0 flex-col bg-background">
                        <div className="flex items-center justify-between border-b px-4 py-3 text-sm font-medium text-primary">
                            <span>AI Fixed Version</span>
                            {loading ? <span className="text-xs text-muted-foreground">Processing...</span> : null}
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto p-4">
                            {loading ? (
                                <div className="flex h-full min-h-[22rem] flex-col items-center justify-center gap-4 text-muted-foreground">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                    <p className="text-sm">Analyzing and fixing content...</p>
                                </div>
                            ) : fixedContent ? (
                                <TiptapEditor content={fixedContent} onChange={setFixedContent} editable={false} />
                            ) : (
                                <div className="flex h-full min-h-[22rem] flex-col items-center justify-center gap-4 text-center text-muted-foreground">
                                    <Wand2 className="h-12 w-12 opacity-30" />
                                    <div className="space-y-2">
                                        <p className="text-base font-medium text-foreground">Ready to fix formatting?</p>
                                        <p className="text-sm text-muted-foreground">
                                            Compare the original content on the left and apply the generated revision only when it looks right.
                                        </p>
                                    </div>
                                    <Button onClick={handleFix} disabled={loading} aria-label="Preview AI Fix">
                                        Preview AI Fix
                                    </Button>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </DialogContent>
        </Dialog>
    )
}
