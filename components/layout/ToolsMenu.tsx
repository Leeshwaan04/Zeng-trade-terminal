"use client";

import React from "react";
import {
    LineChart, BarChart2, Shield, Settings2,
    Cpu, BookOpen, Share2, Download, ExternalLink,
    ChevronRight, Info, History
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolItemProps {
    label: string;
    sub: string;
    icon: React.ElementType;
    badge?: string;
    onClick: () => void;
}

const ToolItem = ({ label, sub, icon: Icon, badge, onClick }: ToolItemProps) => (
    <button
        onClick={onClick}
        className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all group text-left"
    >
        <div className="p-2.5 rounded-lg bg-zinc-900 border border-white/5 group-hover:border-primary/40 group-hover:text-primary transition-all">
            <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
                <span className="text-[11px] font-black text-white uppercase tracking-wider">{label}</span>
                {badge && (
                    <span className="text-[7px] font-black px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary uppercase">
                        {badge}
                    </span>
                )}
            </div>
            <div className="text-[9px] text-zinc-500 font-medium">{sub}</div>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-800 group-hover:text-zinc-600 transition-all mr-1" />
    </button>
);

export const ToolsMenu = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;

    return (
        <div
            className="absolute top-full right-0 mt-3 w-80 bg-[#0a0f18] border border-white/10 rounded-2xl shadow-3xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[110]"
            onMouseLeave={onClose}
        >
            <div className="px-4 py-3 border-b border-white/5 bg-white/2 flex items-center justify-between">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Trading Utility Suite</span>
                <Info className="w-3.5 h-3.5 text-zinc-700" />
            </div>

            <div className="p-2 space-y-1">
                <ToolItem
                    label="P&L Dashboard"
                    sub="Detailed segment-wise performance analysis"
                    icon={LineChart}
                    badge="PRO"
                    onClick={() => { }}
                />
                <ToolItem
                    label="Strategy Builder"
                    sub="Simulate and deploy multi-leg options"
                    icon={Shield}
                    onClick={() => { }}
                />
                <ToolItem
                    label="Open Interest"
                    sub="Track real-time OI and Max Pain levels"
                    icon={BarChart2}
                    onClick={() => { }}
                />
                <ToolItem
                    label="Automate / API"
                    sub="Generate API keys and webhook settings"
                    icon={Cpu}
                    badge="BETA"
                    onClick={() => { }}
                />
                <ToolItem
                    label="Backtesting"
                    sub="Test logic against 10 years of data"
                    icon={History}
                    onClick={() => { }}
                />
            </div>

            <div className="p-2 mt-1 border-t border-white/5 bg-black/40">
                <div className="grid grid-cols-2 gap-1.5 px-2 py-2">
                    <button className="flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-bold text-zinc-400 hover:text-white transition-all">
                        <Download className="w-3 h-3" /> Export Labs
                    </button>
                    <button className="flex items-center justify-center gap-2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-[9px] font-bold text-zinc-400 hover:text-white transition-all">
                        <Share2 className="w-3 h-3" /> Community
                    </button>
                </div>
            </div>

            <div className="px-4 py-2 bg-primary/5 text-center">
                <span className="text-[8px] font-black text-primary uppercase tracking-[0.2em] flex items-center justify-center gap-1.5 pointer-events-none">
                    <ExternalLink className="w-2.5 h-2.5" /> Launch Cyber Terminal v3.2
                </span>
            </div>
        </div>
    );
};
