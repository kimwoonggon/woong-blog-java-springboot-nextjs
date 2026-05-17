
import Image from 'next/image'
// unused cn removed

export type Block = {
    id: string
    type: string
    text?: string
    src?: string
    alt?: string
    caption?: string
    children?: Block[]
    marks?: string[] // bold, italic, etc.
}

export function BlockRenderer({ blocks }: { blocks: Block[] }) {
    if (!blocks || !Array.isArray(blocks)) return null

    return (
        <div className="space-y-6 text-gray-800 dark:text-gray-200">
            {blocks.map((block) => (
                <BlockItem key={block.id} block={block} />
            ))}
        </div>
    )
}

function BlockItem({ block }: { block: Block }) {
    switch (block.type) {
        case 'h1':
            return <h1 className="text-3xl font-bold mt-8 mb-4">{block.text}</h1>
        case 'h2':
            return <h2 className="text-2xl font-bold mt-6 mb-3">{block.text}</h2>
        case 'h3':
            return <h3 className="text-xl font-bold mt-4 mb-2">{block.text}</h3>
        case 'p':
            return <p className="leading-relaxed text-lg">{renderText(block)}</p>
        case 'ul':
            return (
                <ul className="list-disc pl-6 space-y-2">
                    {block.children?.map((child) => (
                        <li key={child.id}>{renderText(child)}</li>
                    ))}
                </ul>
            )
        case 'ol':
            return (
                <ol className="list-decimal pl-6 space-y-2">
                    {block.children?.map((child) => (
                        <li key={child.id}>{renderText(child)}</li>
                    ))}
                </ol>
            )
        case 'image':
            if (!block.src) return null
            return (
                <figure className="my-8">
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                        <Image
                            src={block.src}
                            alt={block.alt || 'Image'}
                            fill
                            className="object-cover"
                        />
                    </div>
                    {block.caption && (
                        <figcaption className="mt-2 text-center text-sm text-gray-500">
                            {block.caption}
                        </figcaption>
                    )}
                </figure>
            )
        case 'divider':
            return <hr className="my-8 border-gray-200 dark:border-gray-800" />
        case 'code':
            return (
                <pre className="content-code-block my-6">
                    <code>{block.text}</code>
                </pre>
            )
        default:
            return null
    }
}

function renderText(block: Block) {
    // Simple text render for now. Can be expanded to handle inline marks.
    return block.text
}
