"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { Maximize2, X, MoreHorizontal, MonitorPlay, PictureInPicture } from "lucide-react";
import { WIDGET_COLORS, WidgetColorGroup } from "@/types/layout";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface WidgetHeaderProps {
    id: string; // Added id for color linking
    title: string;
    symbol?: string;
    colorGroup?: WidgetColorGroup; // Added colorGroup prop
    action?: React.ReactNode;
    className?: string;
    onMaximize?: () => void;
    onClose?: () => void;
    isChart?: boolean; // Prop to determine if layout controls should be shown
}

export const WidgetHeader = ({
    id,
    title,
    symbol,
    colorGroup, // Add to destructuring
    action,
    className,
    onMaximize,
    onClose,
    isChart
}: WidgetHeaderProps) => {
    const {
        setWidgetColorGroup,
        theaterModeWidgetId,
        toggleTheaterMode,
        pipWidgetId,
        togglePiP
    } = useLayoutStore();
    const currentColorHex = colorGroup ? WIDGET_COLORS.find(c => c.id === colorGroup)?.hex : undefined;

    return (
        <div className={cn(
            "flex items-center justify-between px-3 h-9 shrink-0 border-b border-white/5 bg-zinc-900/80 backdrop-blur-sm select-none",
            className
        )}>
            {/* Left: Title & Symbol */}
            <div className="flex items-center gap-2 overflow-hidden">
                {currentColorHex && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke={currentColorHex} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke={currentColorHex} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                )}
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

                {/* YouTube-Style Layout Controls (Only for Charts) */}
                {isChart && (
                    <div className="flex items-center gap-0.5 border-r border-white/5 pr-1 mr-1">
                        <button
                            onClick={() => togglePiP(id)}
                            className={cn(
                                "p-1.5 rounded-sm transition-colors",
                                pipWidgetId === id ? "bg-primary/20 text-primary" : "text-zinc-500 hover:bg-white/5 hover:text-white"
                            )}
                            title="Picture-in-Picture"
                        >
                            <PictureInPicture className="w-3 h-3" />
                        </button>
                        <button
                            onClick={() => toggleTheaterMode(id)}
                            className={cn(
                                "p-1.5 rounded-sm transition-colors",
                                theaterModeWidgetId === id ? "bg-primary/20 text-primary" : "text-zinc-500 hover:bg-white/5 hover:text-white"
                            )}
                            title="Theater Mode"
                        >
                            <MonitorPlay className="w-3 h-3" />
                        </button>
                    </div>
                )}

                {/* Color Linking Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button data-testid="color-link-trigger" className="p-1.5 hover:bg-white/5 rounded-sm text-zinc-500 hover:text-white transition-colors">
                            <MoreHorizontal className="w-3 h-3" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="text-xs font-medium text-zinc-400 cursor-default" onSelect={(e) => e.preventDefault()}>
                            Link Color
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {WIDGET_COLORS.map((color) => (
                            <DropdownMenuItem
                                key={color.id}
                                className={cn(
                                    "flex items-center gap-2 text-[11px] font-bold cursor-pointer group",
                                    colorGroup === color.id ? "bg-white/5 text-white" : "text-zinc-400 hover:text-white"
                                )}
                                onClick={() => setWidgetColorGroup(id, color.id)}
                            >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke={color.hex} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke={color.hex} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span style={{ color: colorGroup === color.id ? color.hex : 'currentColor' }}>{color.label}</span>
                                {colorGroup === color.id && <span className="ml-auto opacity-70">✓</span>}
                            </DropdownMenuItem>
                        ))}
                        {colorGroup && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-xs text-red-500"
                                    onClick={() => setWidgetColorGroup(id, undefined)}
                                >
                                    Unlink Color
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Standard Window Controls */}
                <div className="flex items-center gap-0.5 pl-2 border-l border-white/5 ml-2">
                    {onMaximize && (
                        <button
                            onClick={onMaximize}
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
