"use client";

import React from "react";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { LayoutCustomizer } from "./LayoutCustomizer";

export const WorkspaceTabs = () => {
    const { activeWorkspaceId, workspaces, setActiveWorkspace, deleteWorkspace } = useLayoutStore();
    const [showCustomizer, setShowCustomizer] = React.useState(false);

    const orderedWorkspaces = Object.values(workspaces);
    const protectedIds = ['standard', 'scalping', 'analysis', 'options', 'groww-classic', 'cyber-scalp'];

    return (
        <div className="flex items-end gap-0 h-full overflow-x-auto no-scrollbar">
            {orderedWorkspaces.map((ws) => {
                const isActive = activeWorkspaceId === ws.id;
                const isProtected = protectedIds.includes(ws.id);

                return (
                    <div
                        key={ws.id}
                        className={cn(
                            "group relative flex items-center h-full px-4 gap-2 cursor-pointer select-none border-b-[2px] transition-all",
                            isActive
                                ? "border-primary text-white bg-primary/5"
                                : "border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
                        )}
                        onClick={() => setActiveWorkspace(ws.id)}
                    >
                        <span className={cn(
                            "text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap transition-colors",
                            isActive ? "text-white" : "text-zinc-500"
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
                                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 text-zinc-600 hover:text-down transition-all"
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
                className="flex items-center justify-center h-full px-3 text-zinc-700 hover:text-zinc-400 hover:bg-white/5 transition-all shrink-0 border-b-2 border-transparent"
                title="Add Workspace"
            >
                <Plus className="w-4 h-4" />
            </button>

            <LayoutCustomizer isOpen={showCustomizer} onClose={() => setShowCustomizer(false)} />
        </div>
    );
};
