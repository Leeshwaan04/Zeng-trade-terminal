"use client";

import React, { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface GridResizerProps {
    type: "col" | "row";
    index: number; // The index of the gap to resize
    onResize: (delta: number) => void;
    onResizeEnd: () => void;
    onResizeStart: () => void;
}

export const GridResizer = ({ type, index, onResize, onResizeEnd, onResizeStart }: GridResizerProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const startPos = useRef<number>(0);
    const lastDelta = useRef<number>(0);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const currentPos = type === "col" ? e.clientX : e.clientY;
            let delta = currentPos - startPos.current;

            // Allow parent to handle the delta accumulation or absolute change
            // We pass the delta since the start of the drag
            onResize(delta);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
            document.body.style.pointerEvents = ""; // Restore pointer events
            onResizeEnd();
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, onResize, onResizeEnd, type]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent interfering with grid items

        onResizeStart(); // Notify parent
        setIsDragging(true);
        startPos.current = type === "col" ? e.clientX : e.clientY;
        lastDelta.current = 0;

        document.body.style.cursor = type === "col" ? "col-resize" : "row-resize";
        document.body.style.userSelect = "none";
        document.body.style.pointerEvents = "none"; // formatting fix: disable pointer events on other elements to prevent hover effects during drag
    };

    return (
        <div
            className={cn(
                "absolute z-50 transition-all duration-300",
                type === "col"
                    ? "w-4 h-full cursor-col-resize -ml-[8px] flex justify-center"
                    : "h-4 w-full cursor-row-resize -mt-[8px] flex flex-col justify-center", // Wider hit area
                isDragging ? "pointer-events-none" : "" // optimization
            )}
            onMouseDown={handleMouseDown}
        >
            {/* Value Indicator Line - Only visible on hover/drag */}
            <div className={cn(
                "bg-primary/50 transition-all duration-200 rounded-full",
                type === "col" ? "w-[2px] h-full" : "h-[2px] w-full",
                isDragging || "group-hover:opacity-100 opacity-0", // Show on hover of parent wrapper (which we need to add class 'group' to)
                isDragging ? "bg-primary shadow-[0_0_10px_rgba(0,229,255,0.8)] opacity-100" : "opacity-0 hover:opacity-100"
            )} />
        </div>
    );
};
