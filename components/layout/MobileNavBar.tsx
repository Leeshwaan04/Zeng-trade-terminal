
"use client";

import React from "react";
import { LayoutDashboard, Search, Layers, Zap, Menu } from "lucide-react";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { cn } from "@/lib/utils";

export const MobileNavBar = () => {
    const { activeWorkspaceId, setActiveWorkspace, setCommandCenterOpen } = useLayoutStore();

    const navItems = [
        { id: "standard", icon: LayoutDashboard, label: "Terminal" },
        { id: "scalping", icon: Zap, label: "Scalp" },
        { id: "search", icon: Search, label: "Search", action: () => setCommandCenterOpen(true) },
        { id: "analysis", icon: Layers, label: "Scan" },
        { id: "menu", icon: Menu, label: "Menu", action: () => setCommandCenterOpen(true) } // Reuse CMDK for menu?
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-xl border-t border-border/10 flex items-center justify-around px-2 z-50 pb-safe">
            {navItems.map((item) => {
                const isActive = activeWorkspaceId === item.id;
                return (
                    <button
                        key={item.id}
                        onClick={() => {
                            if (item.action) item.action();
                            else if (item.id !== "menu") setActiveWorkspace(item.id);
                        }}
                        className={cn(
                            "flex flex-col items-center justify-center gap-1 w-full h-full text-muted-foreground hover:text-foreground transition-colors active:scale-95",
                            isActive && "text-primary hover:text-primary"
                        )}
                    >
                        <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
                        <span className="text-[9px] font-medium tracking-wide uppercase">{item.label}</span>
                        {isActive && (
                            <div className="absolute top-0 w-8 h-[2px] bg-primary shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
                        )}
                    </button>
                );
            })}
        </div>
    );
};
