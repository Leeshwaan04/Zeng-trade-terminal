"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface SortableWidgetProps {
    id: string;
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
}

export const SortableWidget = ({ id, children, style, className }: SortableWidgetProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const combinedStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : "auto",
        ...style,
    };

    return (
        <div
            ref={setNodeRef}
            style={combinedStyle}
            className={className}
        >
            {/* Drag Handle Overlay - only visible on hover */}
            <div
                className="absolute top-2 left-1/2 -translate-x-1/2 z-50 opacity-0 hover:opacity-100 cursor-grab active:cursor-grabbing p-1 bg-zinc-900/80 rounded-full border border-white/10 backdrop-blur-md transition-opacity"
                {...attributes}
                {...listeners}
            >
                <GripVertical className="w-3 h-3 text-zinc-500" />
            </div>

            {children}

            {/* Dragging Placeholder Overlay */}
            {isDragging && (
                <div className="absolute inset-0 bg-primary/10 border-2 border-primary/50 rounded-xl z-50 pointer-events-none animate-pulse" />
            )}
        </div>
    );
};
