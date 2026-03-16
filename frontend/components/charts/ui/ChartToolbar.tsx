"use client";

import React from "react";
import { MousePointer2, TrendingUp, Square, Type, Eraser, Ruler, ScanLine, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDrawingStore } from "@/hooks/useDrawingStore";

interface ChartToolbarProps {
    symbol: string;
}

const ToolButton = ({ icon: Icon, active, onClick, tooltip }: any) => (
    <button
        onClick={onClick}
        className={cn(
            "w-10 h-10 flex items-center justify-center rounded-r-md transition-colors relative group",
            active ? "bg-primary/20 text-primary border-l-2 border-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        title={tooltip}
    >
        <Icon className="w-5 h-5" />
        {/* Tooltip (Cyber style) */}
        <div className="absolute left-full ml-2 px-2 py-1 bg-popover border border-border rounded text-[10px] text-foreground opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg">
            {tooltip}
        </div>
    </button>
);

export const ChartToolbar = ({ symbol }: ChartToolbarProps) => {
    const { activeTool, setActiveTool, clearDrawings } = useDrawingStore();

    return (
        <div className="flex flex-col w-12 bg-background border-r border-border h-full py-2 z-20">
            <ToolButton
                icon={MousePointer2}
                active={activeTool === "CURSOR"}
                onClick={() => setActiveTool("CURSOR")}
                tooltip="Crosshair (Alt+C)"
            />
            <div className="h-[1px] bg-border mx-2 my-1" />
            <ToolButton
                icon={TrendingUp}
                active={activeTool === "TRENDLINE"}
                onClick={() => setActiveTool("TRENDLINE")}
                tooltip="Trendline (Alt+T)"
            />
            <ToolButton
                icon={ScanLine}
                active={activeTool === "FIB"}
                onClick={() => setActiveTool("FIB")}
                tooltip="Fib Retracement (Alt+F)"
            />
            <ToolButton
                icon={Square}
                active={activeTool === "RECTANGLE"}
                onClick={() => setActiveTool("RECTANGLE")}
                tooltip="Rectangle (Alt+R)"
            />
            <ToolButton
                icon={Pencil}
                active={activeTool === "BRUSH"}
                onClick={() => setActiveTool("BRUSH")}
                tooltip="Brush"
            />
            <ToolButton
                icon={Type}
                active={activeTool === "TEXT"}
                onClick={() => setActiveTool("TEXT")}
                tooltip="Text"
            />
            <ToolButton
                icon={Ruler}
                active={activeTool === "MEASURE"}
                onClick={() => setActiveTool("MEASURE")}
                tooltip="Measure"
            />
            <div className="flex-1" />
            <ToolButton
                icon={Eraser}
                active={false}
                onClick={() => clearDrawings(symbol)}
                tooltip="Remove All Drawings"
            />
        </div>
    );
};
