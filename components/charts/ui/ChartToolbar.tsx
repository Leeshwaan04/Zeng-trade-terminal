"use client";

import React from "react";
import { MousePointer2, TrendingUp, Square, Type, Eraser, Ruler, ScanLine, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartToolbarProps {
    activeTool: string;
    onToolChange: (tool: string) => void;
}

const ToolButton = ({ icon: Icon, active, onClick, tooltip }: any) => (
    <button
        onClick={onClick}
        className={cn(
            "w-10 h-10 flex items-center justify-center rounded-r-md transition-colors relative group",
            active ? "bg-[#00E5FF]/20 text-[#00E5FF] border-l-2 border-[#00E5FF]" : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
        )}
        title={tooltip}
    >
        <Icon className="w-5 h-5" />
        {/* Tooltip (Cyber style) */}
        <div className="absolute left-full ml-2 px-2 py-1 bg-black border border-white/20 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
            {tooltip}
        </div>
    </button>
);

export const ChartToolbar = ({ activeTool, onToolChange }: ChartToolbarProps) => {
    return (
        <div className="flex flex-col w-12 bg-black border-r border-white/10 h-full py-2 z-20">
            <ToolButton
                icon={MousePointer2}
                active={activeTool === "CURSOR"}
                onClick={() => onToolChange("CURSOR")}
                tooltip="Crosshair (Alt+C)"
            />
            <div className="h-[1px] bg-white/10 mx-2 my-1" />
            <ToolButton
                icon={TrendingUp}
                active={activeTool === "TRENDLINE"}
                onClick={() => onToolChange("TRENDLINE")}
                tooltip="Trendline (Alt+T)"
            />
            <ToolButton
                icon={ScanLine}
                active={activeTool === "FIB"}
                onClick={() => onToolChange("FIB")}
                tooltip="Fib Retracement (Alt+F)"
            />
            <ToolButton
                icon={Square}
                active={activeTool === "RECTANGLE"}
                onClick={() => onToolChange("RECTANGLE")}
                tooltip="Rectangle (Alt+R)"
            />
            <ToolButton
                icon={Pencil}
                active={activeTool === "BRUSH"}
                onClick={() => onToolChange("BRUSH")}
                tooltip="Brush"
            />
            <ToolButton
                icon={Type}
                active={activeTool === "TEXT"}
                onClick={() => onToolChange("TEXT")}
                tooltip="Text"
            />
            <ToolButton
                icon={Ruler}
                active={activeTool === "MEASURE"}
                onClick={() => onToolChange("MEASURE")}
                tooltip="Measure"
            />
            <div className="flex-1" />
            <ToolButton
                icon={Eraser}
                active={false}
                onClick={() => console.log("Clear All")}
                tooltip="Remove All Drawings"
            />
        </div>
    );
};
