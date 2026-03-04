"use client";

import * as React from "react";
import { Check, Palette } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Theme catalog — simple, premium names.
 * Values map to CSS class selectors in globals.css.
 */
const themes = [
    {
        name: "Night",
        value: "antigravity",
        accent: "#00e5ff",
        bg: "#030508",
        desc: "Dark · High Contrast",
        emoji: "🌌",
    },
    {
        name: "Matrix",
        value: "groww",
        accent: "#22c55e",
        bg: "#080a0c",
        desc: "Dark · Classic Green",
        emoji: "🟢",
    },
    {
        name: "Void",
        value: "midnight",
        accent: "#94a3b8",
        bg: "#000000",
        desc: "Dark · OLED Black",
        emoji: "⬛",
    },
    {
        name: "Day",
        value: "light",
        accent: "#0284c7",
        bg: "#f8fafc",
        desc: "Light · Professional",
        emoji: "☀️",
    },
];

export function ThemeSelector({ className }: { className?: string }) {
    const { theme, setTheme } = useTheme();

    const activeTheme = theme === "system" ? "antigravity" : theme || "antigravity";
    const activeConfig = themes.find(t => t.value === activeTheme) || themes[0];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className={cn(
                        "relative flex items-center gap-1.5 px-3 py-1.5 overflow-hidden transition-all duration-300 rounded-lg",
                        "hover:bg-surface-4 border border-transparent hover:border-border/40",
                        "text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground group",
                        className
                    )}
                    title="Switch Theme"
                >
                    {/* Live accent dot */}
                    <div
                        className="w-2.5 h-2.5 rounded-full border transition-all duration-500 group-hover:scale-110 shrink-0"
                        style={{
                            backgroundColor: activeConfig.bg,
                            boxShadow: `0 0 8px ${activeConfig.accent}50`,
                            borderColor: activeConfig.accent,
                        }}
                    />
                    <span className="hidden sm:inline-block">{activeConfig.name}</span>
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-52 bg-surface-1/95 backdrop-blur-xl border-border/20 shadow-xl"
            >
                <DropdownMenuLabel className="text-[10px] font-black tracking-widest uppercase text-muted-foreground flex items-center gap-2">
                    <Palette className="w-3 h-3" />
                    Interface Style
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/20" />

                {themes.map((t) => {
                    const isActive = activeTheme === t.value;
                    return (
                        <DropdownMenuItem
                            key={t.value}
                            onClick={() => setTheme(t.value)}
                            className={cn(
                                "flex items-center gap-3 py-2.5 px-3 cursor-pointer rounded-md transition-all mx-1 my-0.5",
                                isActive
                                    ? "bg-primary/10 text-primary focus:bg-primary/15"
                                    : "text-muted-foreground focus:text-foreground focus:bg-surface-4"
                            )}
                        >
                            {/* Theme color swatch */}
                            <div
                                className="w-4 h-4 rounded-full shrink-0 border"
                                style={{
                                    backgroundColor: t.bg,
                                    borderColor: t.accent,
                                    boxShadow: isActive ? `0 0 8px ${t.accent}60` : "none",
                                }}
                            />

                            <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-[11px] font-black uppercase tracking-wide leading-tight">
                                    {t.name}
                                </span>
                                <span className="text-[9px] opacity-50 font-mono leading-tight mt-0.5">
                                    {t.desc}
                                </span>
                            </div>

                            {isActive && <Check className="w-3 h-3 text-primary shrink-0" />}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
