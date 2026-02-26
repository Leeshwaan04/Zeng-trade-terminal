"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Maximize2, X, MoreHorizontal } from "lucide-react";

interface WidgetHeaderProps {
    title: string;
    symbol?: string;
    action?: React.ReactNode;
    className?: string;
    onExpand?: () => void;
    onClose?: () => void;
}

export const WidgetHeader = ({
    title,
    symbol,
    action,
    className,
    onExpand,
    onClose
}: WidgetHeaderProps) => {
    return (
        <div className={cn(
            "flex items-center justify-between px-3 h-9 shrink-0 border-b border-white/5 bg-zinc-900/80 backdrop-blur-sm select-none",
            className
        )}>
            {/* Left: Title & Symbol */}
            <div className="flex items-center gap-2 overflow-hidden">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--neon-cyan)] shadow-[0_0_8px_rgba(6,182,212,0.3)]">
                    {title}
                </span>
                {symbol && (
                    <>
                        <div className="h-3 w-[1px] bg-white/10" />
                        <span className="text-[10px] font-bold text-zinc-400 truncate">
                            {symbol}
                        </span>
                    </>
                )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1">
                {action}

                {/* Standard Window Controls */}
                <div className="flex items-center gap-0.5 pl-2 border-l border-white/5 ml-2">
                    {onExpand && (
                        <button
                            onClick={onExpand}
                            className="p-1.5 hover:bg-white/5 rounded-sm text-zinc-500 hover:text-white transition-colors"
                        >
                            <Maximize2 className="w-3 h-3" />
                        </button>
                    )}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-red-500/10 rounded-sm text-zinc-500 hover:text-red-500 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
