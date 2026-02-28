"use client";

import React from "react";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { LayoutCustomizer } from "./LayoutCustomizer";
import { motion, AnimatePresence } from "framer-motion";

export const WorkspaceTabs = () => {
    const { activeWorkspaceId, workspaces, setActiveWorkspace, deleteWorkspace } = useLayoutStore();
    const [showCustomizer, setShowCustomizer] = React.useState(false);
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
                                ? "text-white"
                                : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
                        )}
                        onClick={() => setActiveWorkspace(ws.id)}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="active-pill"
                                className="absolute inset-0 bg-white/10 border border-white/10 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_8px_16px_rgba(0,0,0,0.4)]"
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
                                className="relative z-10 opacity-0 group-hover:opacity-60 hover:!opacity-100 text-zinc-500 hover:text-down transition-all ml-1"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                );
            })}

            {/* Add Button */}
            <button
                onClick={() => setShowCustomizer(true)}
                className="flex items-center justify-center p-2 rounded-full text-zinc-500 hover:text-white hover:bg-white/10 transition-all shrink-0 ml-1 border border-white/5 active:scale-90"
                title="Add Workspace"
            >
                <Plus className="w-4 h-4" />
            </button>

            <LayoutCustomizer isOpen={showCustomizer} onClose={() => setShowCustomizer(false)} />
        </div>
    );
};
