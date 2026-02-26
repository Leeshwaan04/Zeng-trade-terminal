import React from "react";
import { Maximize2, X, ExternalLink } from "lucide-react";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { PopoutWindow } from "@/components/ui/PopoutWindow";
import { WidgetConfig } from "@/types/layout";
import { cn } from "@/lib/utils";

interface WidgetContainerProps {
    widgets: WidgetConfig[];
    activeWidgetId: string;
    onWidgetSelect: (id: string) => void;
    isActive: boolean;
    onActivate: () => void;
    children: React.ReactNode;
    allowOverflow?: boolean;
}

export const WidgetContainer = ({
    widgets,
    activeWidgetId,
    onWidgetSelect,
    isActive,
    onActivate,
    children,
    allowOverflow = false,
}: WidgetContainerProps) => {
    const { poppedOutWidgets, setPoppedOut, maximizedWidgetId, toggleMaximize } = useLayoutStore();
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const isPoppedOut = isMounted ? (poppedOutWidgets[activeWidgetId] || false) : false;
    const activeWidget = widgets.find(w => w.id === activeWidgetId) || widgets[0];

    const handlePopout = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPoppedOut(activeWidgetId, !isPoppedOut);
    };

    const renderContent = () => {
        if (isPoppedOut) {
            return (
                <PopoutWindow
                    title={`CyberTrade - ${activeWidget.title}`}
                    onClose={() => setPoppedOut(activeWidgetId, false)}
                >
                    <div className="h-full w-full bg-[#0f1318] flex flex-col">
                        <div className="h-7 border-b border-white/5 flex items-center px-3 bg-[#0c1016] justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{activeWidget.title}</span>
                            </div>
                            <div className="text-[8px] text-zinc-700 font-mono uppercase tracking-widest">External Window</div>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            {children}
                        </div>
                    </div>
                </PopoutWindow>
            );
        }
        return children;
    };

    return (
        <>
            {isPoppedOut && renderContent()}

            <div
                className={cn(
                    "flex flex-col h-full w-full transition-all duration-300 group relative isolate rounded-lg overflow-hidden",
                    "glass-panel border border-white/[0.08]",
                    isActive
                        ? "ring-2 ring-primary/40 z-20 shadow-[0_0_30px_rgba(59,130,246,0.2)] scale-[1.002]"
                        : "hover:border-white/20 z-0",
                    allowOverflow ? "overflow-visible" : "overflow-hidden"
                )}
                onClick={onActivate}
            >
                {/* Widget Header — Ultra-tight Glass Style */}
                <div className="h-8 min-h-[32px] flex items-end justify-between px-1 select-none z-20 border-b border-white/[0.05] bg-white/[0.03]">
                    <div className="flex h-full items-end gap-0 overflow-x-auto no-scrollbar">
                        {widgets.map((w) => {
                            const isSelected = w.id === activeWidgetId;
                            return (
                                <button
                                    key={w.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onWidgetSelect(w.id);
                                    }}
                                    className={`h-full px-3 flex items-center gap-1.5 transition-all relative border-b-2 ${isSelected
                                        ? 'border-primary text-white'
                                        : 'border-transparent text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.03]'
                                        }`}
                                >
                                    <span className="text-[9px] font-black tracking-[0.12em] uppercase whitespace-nowrap">
                                        {w.title}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pr-1 pb-1">
                        <button
                            onClick={handlePopout}
                            className={`p-1 rounded hover:bg-white/10 transition-colors ${isPoppedOut ? 'text-primary' : 'text-zinc-700 hover:text-zinc-400'}`}
                            title={isPoppedOut ? "Restore to Grid" : "Pop Out Window"}
                        >
                            <ExternalLink className="w-3 h-3" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleMaximize(activeWidgetId);
                            }}
                            className={`p-1 rounded hover:bg-white/10 transition-colors ${maximizedWidgetId === activeWidgetId ? 'text-primary' : 'text-zinc-700 hover:text-zinc-400'}`}
                            title={maximizedWidgetId === activeWidgetId ? "Minimize" : "Maximize"}
                        >
                            {maximizedWidgetId === activeWidgetId ? <X className="w-3 h-3 rotate-45" /> : <Maximize2 className="w-3 h-3" />}
                        </button>
                        <button className="p-1 rounded hover:bg-white/10 text-zinc-700 hover:text-down transition-colors">
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* Widget Content */}
                <div className="flex-1 overflow-hidden relative z-10">
                    {isPoppedOut ? (
                        <div className="h-full w-full flex flex-col items-center justify-center gap-3">
                            <div className="p-6 rounded-xl bg-zinc-900/50 border border-white/5 animate-pulse">
                                <ExternalLink className="w-8 h-8 text-zinc-700" />
                            </div>
                            <div className="text-center">
                                <div className="text-[10px] font-medium text-zinc-600">Popped Out</div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPoppedOut(activeWidgetId, false);
                                    }}
                                    className="mt-2 text-[10px] text-primary hover:text-primary/80 transition-colors font-bold tracking-wide"
                                >
                                    Restore
                                </button>
                            </div>
                        </div>
                    ) : (
                        children
                    )}
                </div>
            </div>
        </>
    );
};
