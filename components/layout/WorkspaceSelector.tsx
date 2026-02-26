"use client";

import React from "react";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { Layout, Zap, BarChart2, Edit2, Trash2, Check, X, Sparkles, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkspaceConfig } from "@/types/layout";
import { LayoutCustomizer } from "./LayoutCustomizer";

export const WorkspaceSelector = () => {
    const { activeWorkspaceId, workspaces, setActiveWorkspace } = useLayoutStore();
    const [isOpen, setIsOpen] = React.useState(false);
    const [showCustomizer, setShowCustomizer] = React.useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    const activeWS = workspaces[activeWorkspaceId] ||
        workspaces[activeWorkspaceId.toLowerCase()] ||
        workspaces[activeWorkspaceId.toUpperCase()] ||
        Object.values(workspaces)[0];

    // Close dropdown on outside click
    React.useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        // Delay listener to avoid the opening click triggering close
        const timer = setTimeout(() => document.addEventListener("mousedown", handleClickOutside), 0);
        return () => {
            clearTimeout(timer);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    // Close on Escape
    React.useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        document.addEventListener("keydown", handleEsc);
        return () => document.removeEventListener("keydown", handleEsc);
    }, [isOpen]);

    const handleSelect = (wsId: string) => {
        setActiveWorkspace(wsId);
        setIsOpen(false);
    };

    return (
        <>
            <div className="relative" ref={dropdownRef}>
                <button
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 transition-all duration-200 rounded-md text-[10px] border",
                        isOpen
                            ? "bg-zinc-800 text-primary border-primary/30 neo-glow"
                            : "bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-primary border-white/5 hover:border-primary/30"
                    )}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <Layout className="w-3.5 h-3.5" />
                    <span className="font-bold uppercase tracking-widest">{activeWS?.name || "Workspace"}</span>
                    <ChevronDown className={cn(
                        "w-3 h-3 transition-transform duration-300 ease-out",
                        isOpen ? "rotate-180" : "rotate-0"
                    )} />
                </button>

                {/* Dropdown Menu — always mounted, animated via opacity/transform */}
                <div
                    className={cn(
                        "absolute top-full left-0 mt-2 w-60 bg-zinc-950/95 backdrop-blur-2xl border border-white/10 rounded-lg shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8),0_0_30px_-10px_rgba(0,229,255,0.08)] z-50 overflow-hidden",
                        "transition-all duration-200 ease-out origin-top-left",
                        isOpen
                            ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                    )}
                >
                    <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {(["Standard", "Pro", "Analysis"] as const).map(category => {
                            const layouts = Object.values(workspaces).filter(ws => ws.category === category);
                            if (layouts.length === 0) return null;

                            const CategoryIcon = category === "Standard" ? Layout : category === "Pro" ? Zap : BarChart2;

                            return (
                                <div key={category} className="mb-3 last:mb-0">
                                    <div className="px-3 py-1.5 text-[8px] font-black text-zinc-600 uppercase tracking-[0.3em] border-b border-white/5 mb-1.5 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <CategoryIcon className="w-2.5 h-2.5 opacity-50" />
                                            {category}
                                        </div>
                                        <span className="text-[7px] opacity-40 font-mono tracking-tighter">{layouts.length}</span>
                                    </div>
                                    {layouts.map((ws) => (
                                        <WorkspaceItem
                                            key={ws.id}
                                            ws={ws}
                                            isActive={activeWorkspaceId.toLowerCase() === ws.id.toLowerCase()}
                                            onSelect={() => handleSelect(ws.id)}
                                        />
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                    <div className="p-2 border-t border-white/5 bg-black/30">
                        <button
                            onClick={() => { setShowCustomizer(true); setIsOpen(false); }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 text-[9px] font-black uppercase text-zinc-500 hover:text-primary transition-all duration-200 tracking-widest hover:bg-primary/5 rounded-lg border border-transparent hover:border-primary/20"
                        >
                            <Sparkles className="w-3 h-3" />
                            Build Custom Layout
                        </button>
                    </div>
                </div>
            </div>

            {/* Layout Customizer Modal */}
            <LayoutCustomizer isOpen={showCustomizer} onClose={() => setShowCustomizer(false)} />
        </>
    );
};

// Sub-component for individual workspace items with actions
const WorkspaceItem = ({ ws, isActive, onSelect }: { ws: WorkspaceConfig, isActive: boolean, onSelect: () => void }) => {
    const { deleteWorkspace, renameWorkspace } = useLayoutStore();
    const [isEditing, setIsEditing] = React.useState(false);
    const [newName, setNewName] = React.useState(ws.name);

    // Presets cannot be edited/deleted
    const isPreset = ['standard', 'scalping', 'analysis', 'options', 'cyber-scalp'].includes(ws.id);

    const handleSave = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (newName.trim() && newName !== ws.name) {
            renameWorkspace(ws.id, newName.trim());
        }
        setIsEditing(false);
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(`Delete workspace "${ws.name}"?`)) {
            deleteWorkspace(ws.id);
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-1 px-3 py-1.5 animate-in fade-in slide-in-from-left-2 duration-200">
                <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="flex-1 bg-black border border-primary/30 rounded px-1.5 py-0.5 text-[10px] text-white outline-none"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave(e as any);
                        if (e.key === 'Escape') setIsEditing(false);
                    }}
                />
                <button onClick={handleSave} className="p-1 hover:text-up text-zinc-500"><Check className="w-3 h-3" /></button>
                <button onClick={() => setIsEditing(false)} className="p-1 hover:text-down text-zinc-500"><X className="w-3 h-3" /></button>
            </div>
        );
    }

    return (
        <div
            onClick={onSelect}
            className={cn(
                "w-full text-left px-3 py-2 text-[10px] font-bold uppercase tracking-tight rounded-[1px] transition-all flex items-center justify-between group/ws relative cursor-pointer select-none",
                isActive
                    ? "bg-primary/10 text-primary shadow-[inset_0_0_10px_-5px_var(--primary)]"
                    : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
            )}
            role="button"
            tabIndex={0}
        >
            <span className="truncate pr-8">{ws.name}</span>
            {isActive && !isEditing && (
                <div className="absolute right-3 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_var(--primary)]" />
            )}

            {!isPreset && (
                <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover/ws:opacity-100 transition-opacity bg-zinc-900/80 backdrop-blur-sm pl-2 rounded-l-sm">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                        className="p-1 hover:text-primary transition-colors"
                    >
                        <Edit2 className="w-2.5 h-2.5" />
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-1 hover:text-down transition-colors"
                    >
                        <Trash2 className="w-2.5 h-2.5" />
                    </button>
                </div>
            )}
        </div>
    );
};
