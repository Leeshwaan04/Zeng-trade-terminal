import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Canonical ZenG Trade brand mark. Use this everywhere instead of hand-rolling
 * the icon + wordmark so the logo never drifts between surfaces again.
 *
 * Mark: lightning bolt in a green→cyan (var(--up)→var(--primary)) rounded
 * square. Wordmark: "ZenG" (foreground) + "TRADE" (primary accent).
 */
type LogoSize = "xs" | "sm" | "md" | "lg";

const SIZES: Record<LogoSize, { box: string; icon: string; text: string; sub: string }> = {
    xs: { box: "w-7 h-7 rounded-lg", icon: "w-3.5 h-3.5", text: "text-xs", sub: "text-[7px]" },
    sm: { box: "w-8 h-8 rounded-xl", icon: "w-4 h-4", text: "text-sm", sub: "text-[8px]" },
    md: { box: "w-10 h-10 rounded-xl", icon: "w-5 h-5", text: "text-lg", sub: "text-[9px]" },
    lg: { box: "w-16 h-16 rounded-2xl", icon: "w-8 h-8", text: "text-4xl", sub: "text-[10px]" },
};

export function Logo({
    size = "sm",
    withText = true,
    subtitle = false,
    className,
}: {
    size?: LogoSize;
    withText?: boolean;
    subtitle?: boolean;
    className?: string;
}) {
    const s = SIZES[size];
    return (
        <div className={cn("flex items-center gap-3", className)}>
            <div
                className={cn(
                    s.box,
                    "shrink-0 flex items-center justify-center bg-gradient-to-br from-[var(--up)] to-[var(--primary)]",
                    "shadow-[0_0_15px_color-mix(in_srgb,var(--primary)_30%,transparent)]"
                )}
            >
                <Zap className={cn(s.icon, "text-black")} />
            </div>
            {withText && (
                <div className="flex flex-col leading-none gap-0.5">
                    <span className={cn(s.text, "font-black tracking-tight")}>
                        <span className="text-foreground">ZenG</span>
                        <span className="text-[var(--primary)]"> TRADE</span>
                    </span>
                    {subtitle && (
                        <span className={cn(s.sub, "font-mono uppercase tracking-[0.4em] text-zinc-500")}>
                            Institutional Grade Execution
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
