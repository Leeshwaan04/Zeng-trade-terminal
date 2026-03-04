"use client";

import React from "react";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { LayoutCustomizer } from "./LayoutCustomizer";
import { motion, AnimatePresence } from "framer-motion";

export const WorkspaceTabs = ({ onAddClick }: { onAddClick?: () => void }) => {
    const { activeWorkspaceId, workspaces, setActiveWorkspace, deleteWorkspace } = useLayoutStore();
    const orderedWorkspaces = Object.values(workspaces);
    const protectedIds = ['standard'];

    return (
        <div className="flex items-center gap-1.5 h-full px-3 overflow-x-auto no-scrollbar py-2">
            {orderedWorkspaces.map((ws: any) => {
                const isActive = activeWorkspaceId === ws.id;
                const isProtected = protectedIds.includes(ws.id);

                return (
                    <div
                        key={ws.id}
                        className={cn(
                            "group relative flex items-center h-8 px-4 gap-2 cursor-pointer select-none rounded-full transition-all duration-300",
                            isActive
                                ? "text-primary dark:text-white"
                                : "text-muted-foreground hover:text-foreground hover:bg-surface-4"
                        )}
                        onClick={() => setActiveWorkspace(ws.id)}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="active-pill"
                                className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-full shadow-[var(--shadow-institutional)]"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}

                        <span className={cn(
                            "relative z-10 text-[10px] font-black uppercase tracking-[0.08em] transition-colors whitespace-nowrap",
                            isActive ? "text-primary drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]" : ""
                        )}>
                            {ws.name}
                        </span>

                        {!isProtected && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Delete workspace "${ws.name}"?`)) {
                                        deleteWorkspace(ws.id);
                                    }
                                }}
                                className="relative z-10 opacity-0 group-hover:opacity-60 hover:!opacity-100 text-muted-foreground hover:text-down transition-all ml-1"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                );
            })}

            <button
                onClick={onAddClick}
                className="flex items-center justify-center p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-4 transition-all shrink-0 ml-1 border border-border/40  active:scale-90"
                title="Add Workspace"
            >
                <Plus className="w-4 h-4" />
            </button>
        </div>
    );
};
