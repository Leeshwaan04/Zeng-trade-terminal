"use client";

import React, { useState } from "react";
import { Eye, EyeOff, Lock, Unlock, Trash2, Layers, ChevronDown, ChevronRight, Minus, Square, TrendingUp, Type, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDrawingStore } from "@/hooks/useDrawingStore";

const DRAWING_TYPE_ICONS: Record<string, React.ReactNode> = {
    trendline:  <TrendingUp className="w-3 h-3" />,
    hline:      <Minus className="w-3 h-3" />,
    rect:       <Square className="w-3 h-3" />,
    text:       <Type className="w-3 h-3" />,
    circle:     <Circle className="w-3 h-3" />,
};

const DRAWING_TYPE_LABEL: Record<string, string> = {
    trendline: "Trendline",
    hline:     "Horizontal Line",
    rect:      "Rectangle",
    text:      "Text",
    circle:    "Circle",
};

interface DrawingLayerPanelProps {
    symbol?: string;
    className?: string;
}

export const DrawingLayerPanel = ({ symbol, className }: DrawingLayerPanelProps) => {
    const {
        drawings,
        indicators,
        removeDrawing,
        toggleDrawingVisibility,
        toggleDrawingLock,
        renameDrawing,
        clearDrawings,
        toggleIndicator,
        removeIndicator,
    } = useDrawingStore();

    const [drawingsOpen, setDrawingsOpen] = useState(true);
    const [indicatorsOpen, setIndicatorsOpen] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");

    const visibleDrawings = symbol
        ? drawings.filter(d => d.symbol === symbol)
        : drawings;

    const startRename = (id: string, current: string) => {
        setEditingId(id);
        setEditValue(current || "");
    };

    const commitRename = (id: string) => {
        if (editValue.trim()) renameDrawing(id, editValue.trim());
        setEditingId(null);
    };

    return (
        <div className={cn("flex flex-col bg-surface-1 border border-border rounded-lg overflow-hidden text-[10px]", className)}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface-2">
                <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    <span className="font-black uppercase tracking-widest text-[9px] text-foreground">Layers</span>
                </div>
                {visibleDrawings.length > 0 && (
                    <button
                        type="button"
                        onClick={() => clearDrawings(symbol)}
                        className="text-[8px] font-black text-down/50 hover:text-down uppercase tracking-widest transition-colors"
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* Indicators Section */}
            <div>
                <button
                    type="button"
                    onClick={() => setIndicatorsOpen(!indicatorsOpen)}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 bg-surface-2/50 hover:bg-surface-2 border-b border-border/40 transition-colors"
                >
                    {indicatorsOpen ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                        Indicators ({indicators.length})
                    </span>
                </button>

                {indicatorsOpen && (
                    <div className="divide-y divide-border/30">
                        {indicators.length === 0 && (
                            <p className="px-3 py-2 text-[8px] text-muted-foreground font-bold">No indicators added</p>
                        )}
                        {indicators.map((ind) => (
                            <div
                                key={ind.id}
                                className={cn(
                                    "group flex items-center gap-2 px-3 py-1.5 hover:bg-foreground/[0.02] transition-colors",
                                    !ind.visible && "opacity-40"
                                )}
                            >
                                {/* Color dot */}
                                <div
                                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/10"
                                    style={{ backgroundColor: ind.color }}
                                />
                                <span className="flex-1 font-black text-foreground truncate">
                                    {ind.type} {ind.period}
                                </span>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        type="button"
                                        onClick={() => toggleIndicator(ind.id)}
                                        className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                                        title={ind.visible ? "Hide" : "Show"}
                                    >
                                        {ind.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeIndicator(ind.id)}
                                        className="p-0.5 rounded text-muted-foreground hover:text-down transition-colors"
                                        title="Remove"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Drawings Section */}
            <div>
                <button
                    type="button"
                    onClick={() => setDrawingsOpen(!drawingsOpen)}
                    className="w-full flex items-center gap-1.5 px-3 py-1.5 bg-surface-2/50 hover:bg-surface-2 border-b border-border/40 transition-colors"
                >
                    {drawingsOpen ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                        Drawings ({visibleDrawings.length})
                    </span>
                </button>

                {drawingsOpen && (
                    <div className="divide-y divide-border/30">
                        {visibleDrawings.length === 0 && (
                            <p className="px-3 py-2 text-[8px] text-muted-foreground font-bold">No drawings on chart</p>
                        )}
                        {[...visibleDrawings].reverse().map((drawing) => (
                            <div
                                key={drawing.id}
                                className={cn(
                                    "group flex items-center gap-2 px-3 py-1.5 hover:bg-foreground/[0.02] transition-colors",
                                    drawing.hidden && "opacity-40",
                                    drawing.locked && "bg-amber-500/5"
                                )}
                            >
                                {/* Type icon + color */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <div
                                        className="w-1.5 h-4 rounded-full shrink-0"
                                        style={{ backgroundColor: drawing.color }}
                                    />
                                    <span className="text-muted-foreground">
                                        {DRAWING_TYPE_ICONS[drawing.type] ?? <Minus className="w-3 h-3" />}
                                    </span>
                                </div>

                                {/* Label / rename */}
                                <div className="flex-1 min-w-0">
                                    {editingId === drawing.id ? (
                                        <input
                                            autoFocus
                                            type="text"
                                            value={editValue}
                                            onChange={e => setEditValue(e.target.value)}
                                            onBlur={() => commitRename(drawing.id)}
                                            onKeyDown={e => { if (e.key === "Enter") commitRename(drawing.id); if (e.key === "Escape") setEditingId(null); }}
                                            aria-label="Rename drawing"
                                            className="w-full bg-surface-3 border border-primary/40 rounded px-1 py-0.5 text-[9px] font-bold text-foreground outline-none"
                                        />
                                    ) : (
                                        <button
                                            type="button"
                                            onDoubleClick={() => startRename(drawing.id, drawing.label || "")}
                                            className="w-full text-left text-[9px] font-bold text-foreground truncate hover:text-primary transition-colors"
                                            title="Double-click to rename"
                                        >
                                            {drawing.label || DRAWING_TYPE_LABEL[drawing.type] || drawing.type}
                                            <span className="text-muted-foreground ml-1 text-[7px]">
                                                @{drawing.p1.price.toFixed(0)}
                                            </span>
                                        </button>
                                    )}
                                </div>

                                {/* Lock indicator always visible */}
                                {drawing.locked && (
                                    <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                )}

                                {/* Action buttons on hover */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => toggleDrawingVisibility(drawing.id)}
                                        className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                                        title={drawing.hidden ? "Show" : "Hide"}
                                    >
                                        {drawing.hidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleDrawingLock(drawing.id)}
                                        className={cn(
                                            "p-0.5 rounded transition-colors",
                                            drawing.locked ? "text-amber-400 hover:text-amber-300" : "text-muted-foreground hover:text-amber-400"
                                        )}
                                        title={drawing.locked ? "Unlock" : "Lock"}
                                    >
                                        {drawing.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeDrawing(drawing.id)}
                                        className="p-0.5 rounded text-muted-foreground hover:text-down transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
