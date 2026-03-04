"use client";

import React from "react";
import { Info, Terminal, Activity, Zap, ShieldCheck } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

export function HeaderGuide() {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <div className="absolute inset-x-0 inset-y-0 group-hover:bg-primary/5 transition-colors cursor-help z-20">
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary-rgb),0.6)] animate-pulse-slow">
                        <Info className="w-2.5 h-2.5 text-black" />
                    </div>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-background/95 backdrop-blur-2xl border-border/20 shadow-2xl p-0 overflow-hidden rounded-xl">
                <div className="bg-primary/10 p-4 border-b border-primary/20">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5" />
                        Mission Control Hub
                    </h3>
                    <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                        A systematic interface for rapid-response trading.
                    </p>
                </div>

                <div className="p-4 space-y-4">
                    <div className="flex gap-3">
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <span className="text-[10px] font-black text-blue-400">α</span>
                        </div>
                        <div>
                            <h4 className="text-[11px] font-bold text-foreground">Zone Alpha: Identity</h4>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Brand identity, global search (⌘K), and multi-workspace routing.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Activity className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <h4 className="text-[11px] font-bold text-foreground">Zone Sigma: Intelligence</h4>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Real-time P&L pulse, market sentiment, and system vitals.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                            <Zap className="w-4 h-4 text-orange-400" />
                        </div>
                        <div>
                            <h4 className="text-[11px] font-bold text-foreground">Zone Omega: Execution</h4>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                                Tactical tools, widget management, and nuclear safety protocols.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-foreground/5 p-3 flex items-center justify-between">
                    <span className="text-[9px] font-black text-muted-foreground uppercase">ZenG Protocol v0.4.0</span>
                    <ShieldCheck className="w-3 h-3 text-primary/50" />
                </div>
            </PopoverContent>
        </Popover>
    );
}
