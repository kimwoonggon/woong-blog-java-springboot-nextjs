'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTransition } from 'react'

interface DeleteButtonProps {
    id: string
    action: (id: string) => Promise<{ error?: string } | void>
}

export function DeleteButton({ id, action }: DeleteButtonProps) {
    const [isPending, startTransition] = useTransition()

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
            startTransition(async () => {
                const result = await action(id)
                if (result && typeof result === 'object' && 'error' in result && result.error) {
                    alert(`Error deleting: ${result.error}`)
                }
            })
        }
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            title="Delete"
            onClick={handleDelete}
            disabled={isPending}
        >
            <Trash2 className={`h-4 w-4 ${isPending ? 'opacity-50' : ''}`} />
        </Button>
    )
}
