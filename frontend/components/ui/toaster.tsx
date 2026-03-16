"use client"

import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
// import {
//   Toast,
//   ToastClose,
//   ToastDescription,
//   ToastProvider,
//   ToastTitle,
//   ToastViewport,
// } from "@/components/ui/toast"

export function Toaster() {
    const { toasts } = useToast()

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
            {toasts.map(function ({ id, title, description, action, variant, open, ...props }) {
                if (!open) return null;

                return (
                    <div
                        key={id}
                        className={cn(
                            "pointer-events-auto min-w-[320px] max-w-[400px] rounded p-4 border shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-right-full zoom-in-95",
                            variant === 'success' ? "bg-zinc-950/90 border-up/40 text-zinc-100 shadow-[0_0_30px_-10px_rgba(0,229,255,0.3)]" :
                                variant === 'destructive' ? "bg-zinc-950/90 border-down/40 text-zinc-100 shadow-[0_0_30px_-10px_rgba(255,0,229,0.3)]" :
                                    "bg-zinc-950/90 border-white/10 text-zinc-100 shadow-[0_0_30px_-10px_rgba(255,255,255,0.1)]"
                        )}
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex-1 grid gap-1">
                                {title && (
                                    <div className={cn("text-[13px] font-black tracking-wide uppercase",
                                        variant === 'success' ? "text-up drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]" :
                                            variant === 'destructive' ? "text-down drop-shadow-[0_0_5px_rgba(255,0,229,0.5)]" :
                                                "text-zinc-200"
                                    )}>
                                        {title}
                                    </div>
                                )}
                                {description && (
                                    <div className="text-[11px] font-mono tracking-tight text-zinc-400 leading-relaxed">
                                        {description}
                                    </div>
                                )}
                            </div>
                            {action}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
