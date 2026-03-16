"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
    const { setTheme, theme, systemTheme } = useTheme();

    const isDark = theme === "dark" || (theme === "system" && systemTheme === "dark");

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={cn(
                "relative inline-flex items-center justify-center p-1.5 overflow-hidden transition-all duration-300 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10 text-zinc-500 hover:text-white group",
                className
            )}
            title="Toggle Theme"
        >
            <div className="relative flex items-center justify-center w-4 h-4">
                <Sun
                    className={cn(
                        "absolute w-full h-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
                        isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    )}
                />
                <Moon
                    className={cn(
                        "absolute w-full h-full transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
                        isDark ? "opacity-100 rotate-0 scale-100 text-primary drop-shadow-[0_0_8px_var(--primary)]" : "opacity-0 -rotate-90 scale-50"
                    )}
                />
            </div>

            {/* Subtle glow effect behind icons */}
            <div className={cn(
                "absolute inset-0 blur-md rounded-full transition-opacity duration-500 opacity-0 group-hover:opacity-30",
                isDark ? "bg-primary" : "bg-amber-500"
            )} />
        </button>
    );
}
