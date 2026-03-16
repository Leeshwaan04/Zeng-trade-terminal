"use client";

import React, { useState, useEffect } from "react";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { X, ExternalLink } from "lucide-react";
import { TradingChart } from "@/components/charts/TradingChart";
import { HyperChartWidget } from "@/components/charts/HyperChartWidget";
import { cn } from "@/lib/utils";

// A floating Picture-in-Picture window for charts
export const PiPWindow = () => {
    const { pipWidgetId, togglePiP, workspaces, activeWorkspaceId } = useLayoutStore();
    const [position, setPosition] = useState({
        x: typeof window !== 'undefined' ? window.innerWidth - 420 : 0,
        y: typeof window !== 'undefined' ? window.innerHeight - 320 : 0
    });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const activeWorkspace = workspaces[activeWorkspaceId];
    if (!pipWidgetId || !activeWorkspace) return null;

    // Find the widget config
    let activeWidget = null;
    for (const area of activeWorkspace.areas) {
        const widget = area.widgets.find(w => w.id === pipWidgetId);
        if (widget) {
            activeWidget = widget;
            break;
        }
    }

    if (!activeWidget) return null;

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return;

        // Calculate new position
        let newX = e.clientX - dragOffset.x;
        let newY = e.clientY - dragOffset.y;

        // Keep within window bounds
        const maxX = window.innerWidth - 400; // window width
        const maxY = window.innerHeight - 300; // window height

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(44, Math.min(newY, maxY)); // Account for header

        setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    return (
        <div
            className="fixed z-[100] w-[400px] h-[300px] flex flex-col rounded-lg overflow-hidden shadow-2xl border border-white/20 bg-[#0a0a0a]/95 backdrop-blur-xl ring-1 ring-black/50"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                transition: isDragging ? 'none' : 'box-shadow 0.2s ease',
                boxShadow: isDragging ? '0 30px 60px rgba(0,0,0,0.6)' : '0 10px 30px rgba(0,0,0,0.5)'
            }}
        >
            {/* Draggable Header */}
            <div
                className="h-8 border-b border-white/10 bg-white/5 flex items-center justify-between px-3 cursor-move select-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <div className="flex items-center gap-2 pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">
                        {activeWidget.title} [PiP]
                    </span>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        togglePiP(pipWidgetId);
                    }}
                    className="p-1 rounded-sm hover:bg-white/10 text-zinc-400 hover:text-white transition-colors
                               pointer-events-auto"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative isolate">
                {activeWidget.type === "CHART" ? (
                    <TradingChart
                        symbol={activeWidget.symbol || "NIFTY 50"}
                        widgetId={`${activeWidget.id}-pip`}
                    />
                ) : activeWidget.type === "HYPER_CHART" ? (
                    <HyperChartWidget symbol={activeWidget.symbol || "NIFTY 50"} />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500">
                        <ExternalLink className="w-8 h-8 opacity-50 mb-2" />
                        <span className="text-xs uppercase font-bold tracking-widest">Format Unsupported</span>
                    </div>
                )}
            </div>
        </div>
    );
};
