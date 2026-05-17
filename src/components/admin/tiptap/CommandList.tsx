"use client"

import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useState,
} from 'react'
import {
    Heading1,
    Heading2,
    Heading3,
    Box,
    Type,
    List,
    ListOrdered,
    Quote,
    Code,
    ImageIcon,
    Workflow,
} from 'lucide-react'

export type CommandIconName = 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'quote' | 'code' | 'image' | '3d' | 'mermaid'

export interface CommandItem {
    title: string;
    icon: CommandIconName;
    description?: string;
    shortcuts?: string[];
    command?: unknown;
}

interface CommandListProps {
    items: CommandItem[];
    command: (item: CommandItem) => void;
}

export interface CommandListRef {
    onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

export const CommandList = forwardRef<CommandListRef, CommandListProps>((props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [prevItems, setPrevItems] = useState(props.items)
    const containerRef = React.useRef<HTMLDivElement>(null)

    // Reset selected index when items change
    if (props.items !== prevItems) {
        setPrevItems(props.items)
        setSelectedIndex(0)
    }

    const selectItem = (index: number) => {
        const item = props.items[index]
        if (item) {
            props.command(item)
        }
    }

    const upHandler = () => {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
    }

    const downHandler = () => {
        setSelectedIndex((selectedIndex + 1) % props.items.length)
    }

    const enterHandler = () => {
        selectItem(selectedIndex)
    }

    useEffect(() => {
        if (containerRef.current) {
            const container = containerRef.current
            const items = container.querySelectorAll<HTMLButtonElement>('button')
            const selectedItem = items[selectedIndex]

            if (selectedItem) {
                const containerTop = container.scrollTop
                const containerBottom = containerTop + container.offsetHeight
                const itemTop = selectedItem.offsetTop
                const itemBottom = itemTop + selectedItem.offsetHeight

                if (itemTop < containerTop) {
                    container.scrollTop = itemTop
                } else if (itemBottom > containerBottom) {
                    container.scrollTop = itemBottom - container.offsetHeight
                }
            }
        }
    }, [selectedIndex])

    useImperativeHandle(ref, () => ({
        onKeyDown: ({ event }: { event: KeyboardEvent }) => {
            if (event.key === 'ArrowUp') {
                upHandler()
                return true
            }

            if (event.key === 'ArrowDown') {
                downHandler()
                return true
            }

            if (event.key === 'Enter') {
                enterHandler()
                return true
            }

            return false
        },
    }))

    return (
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col w-64 animate-in fade-in zoom-in duration-100">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b dark:border-gray-800 uppercase tracking-wider">
                Commands
            </div>
            <div ref={containerRef} className="max-h-64 overflow-y-auto p-1">
                {props.items.length ? (
                    props.items.map((item: CommandItem, index: number) => (
                        <button
                            key={index}
                            onClick={() => selectItem(index)}
                            className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-md transition-colors ${index === selectedIndex
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                }`}
                        >

                            <div className={`${index === selectedIndex ? 'text-white' : 'text-gray-500'}`}>
                                {getIcon(item.icon)}
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="font-medium">{item.title}</span>
                                {item.description && (
                                    <span className={`text-[10px] ${index === selectedIndex ? 'text-blue-100' : 'text-gray-400'}`}>
                                        {item.description}
                                    </span>
                                )}
                            </div>
                        </button>
                    ))
                ) : (
                    <div className="px-3 py-2 text-sm text-gray-500">No results found</div>
                )}
            </div>
        </div>
    )
})

function getIcon(name: CommandIconName) {
    switch (name) {
        case 'h1': return <Heading1 size={16} />
        case 'h2': return <Heading2 size={16} />
        case 'h3': return <Heading3 size={16} />
        case 'p': return <Type size={16} />
        case 'ul': return <List size={16} />
        case 'ol': return <ListOrdered size={16} />
        case 'quote': return <Quote size={16} />
        case 'code': return <Code size={16} />
        case 'image': return <ImageIcon size={16} />
        case '3d': return <Box size={16} />
        case 'mermaid': return <Workflow size={16} />
        default: return <Type size={16} />
    }
}

CommandList.displayName = 'CommandList'
