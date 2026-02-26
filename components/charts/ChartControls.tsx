"use client";

import React from "react";
import {
    CandlestickChart,
    LineChart,
    Pencil,
    Square,
    Minus,
    MessageCircle,
    Magnet,
    MoreHorizontal,
    PictureInPicture,
    MonitorPlay,
    LayoutTemplate
} from "lucide-react";
import { useMarketStore } from "@/hooks/useMarketStore";
import { useOrderStore } from "@/hooks/useOrderStore";
import { useToast } from "@/hooks/use-toast";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ChartControlsProps {
    symbol: string;
    widgetId: string;
    period: string;
    onPeriodChange: (period: string) => void;
    interval: string;
    onIntervalChange: (interval: string) => void;
    onTradeClick: () => void;
    chartType: "candle" | "line";
    onChartTypeChange: (type: "candle" | "line") => void;
    showIndicators?: boolean;
    onToggleIndicators?: () => void;
    onSnapshot?: () => void;
    hideIndicators?: boolean;
    hideSnapshot?: boolean;
}

export const ChartControls = ({
    symbol,
    widgetId,
    period,
    onPeriodChange,
    interval,
    onIntervalChange,
    onTradeClick,
    chartType,
    onChartTypeChange,
    showIndicators,
    onToggleIndicators,
    onSnapshot,
    hideIndicators = false,
    hideSnapshot = false
}: ChartControlsProps) => {
    const intervals = ["1m", "5m", "15m", "30m", "1H", "4H", "1D", "1W"];
    const tickerData = useMarketStore(state => state.tickers[symbol]);
    const placeOrder = useOrderStore(state => state.placeOrder);
    const {
        pipWidgetId,
        togglePiP,
        theaterModeWidgetId,
        toggleTheaterMode,
        updateMultiChartConfig,
        workspaces,
        activeWorkspaceId
    } = useLayoutStore();
    const { toast } = useToast();

    // Get current multi-chart config for this widget
    const activeWorkspace = workspaces[activeWorkspaceId];
    let currentViewMode = "1x1";
    if (activeWorkspace) {
        for (const area of activeWorkspace.areas) {
            const widget = area.widgets.find(w => w.id === widgetId);
            if (widget && widget.multiChartConfig) {
                currentViewMode = widget.multiChartConfig.viewMode;
                break;
            }
        }
    }

    const handleQuickTrade = (side: "BUY" | "SELL") => {
        const price = tickerData?.last_price ?? 22400;
        placeOrder({
            symbol,
            transactionType: side,
            orderType: 'MARKET',
            productType: 'MIS',
            qty: 50,
            price,
        });
        toast({
            title: `${side} Order Executed`,
            description: `${side} 50 × ${symbol} @ ₹${price.toFixed(2)}`,
        });
    };

    return (
        <div className="flex items-center justify-between bg-[var(--chart-bg)] border-b border-white/5 px-3 h-10 select-none w-full z-20">

            {/* Left: Symbol Info + Buy/Sell */}
            <div className="flex items-center gap-2 pr-3 border-r border-white/5 h-full">
                {/* Symbol Badge */}
                <div className="flex items-center gap-1.5 cursor-pointer hover:bg-white/5 px-2 py-1 rounded transition-colors group">
                    <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center">
                        <span className="text-[8px] font-bold text-amber-400">■</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white leading-none tracking-tight">{symbol}</span>
                        {tickerData && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs font-mono text-white">
                                    ₹{tickerData.last_price.toFixed(2)}
                                </span>
                                <span className={cn(
                                    "text-[10px] font-mono font-bold",
                                    tickerData.change_percent >= 0 ? "text-up" : "text-down"
                                )}>
                                    {tickerData.change_percent >= 0 ? "▲" : "▼"} {tickerData.change_percent >= 0 ? "+" : ""}{tickerData.net_change.toFixed(2)} ({tickerData.change_percent.toFixed(2)}%)
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Buy / Sell Buttons — Wired to OrderStore */}
                <div className="flex items-center gap-0.5 ml-2">
                    <button
                        onClick={() => handleQuickTrade("BUY")}
                        className="px-3 py-1 bg-up/10 hover:bg-up/25 border border-up/20 hover:border-up/50 text-up text-[10px] font-bold rounded-l transition-all active:scale-95 hover:shadow-[0_0_12px_-3px_var(--up)]"
                    >
                        Buy
                    </button>
                    <button
                        onClick={() => handleQuickTrade("SELL")}
                        className="px-3 py-1 bg-down/10 hover:bg-down/25 border border-down/20 hover:border-down/50 text-down text-[10px] font-bold rounded-r transition-all active:scale-95 hover:shadow-[0_0_12px_-3px_var(--down)]"
                    >
                        Sell
                    </button>
                </div>
            </div>

            {/* Center: Drawing Tools */}
            <div className="flex items-center gap-0.5 pl-3 border-l border-white/5 h-full">
                <ToolButton icon={Pencil} label="Draw" />
                <ToolButton icon={Square} label="Rectangle" />
                <ToolButton icon={Minus} label="Horizontal Line" />
                <ToolButton icon={MessageCircle} label="Annotation" />
                <ToolButton icon={Magnet} label="Magnet" />
            </div>

            {/* Center-Right: Timeframes */}
            <div className="flex items-center gap-0.5 px-3 border-l border-r border-white/5 h-full overflow-x-auto no-scrollbar">
                {intervals.map((int) => (
                    <button
                        key={int}
                        onClick={() => onIntervalChange(int)}
                        className={cn(
                            "px-2 h-6 flex items-center justify-center text-[10px] font-bold rounded transition-all",
                            interval === int
                                ? "bg-white/10 text-white"
                                : "text-[#555] hover:text-[#aaa] hover:bg-white/5"
                        )}
                    >
                        {int}
                    </button>
                ))}
            </div>

            <button className="p-1.5 hover:bg-white/5 rounded text-[#555] hover:text-white transition-colors">
                <MoreHorizontal className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-0.5 border-l border-white/5 pl-2 h-full">
                {/* Multiview Layout Selector */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className={cn(
                                "p-1.5 rounded transition-colors flex items-center gap-1",
                                currentViewMode !== "1x1" ? "bg-white/10 text-primary" : "text-[#555] hover:text-white hover:bg-white/5"
                            )}
                            title="Grid Layout"
                        >
                            <LayoutTemplate className="w-3.5 h-3.5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36 bg-[#0c1016] border-white/5">
                        <DropdownMenuItem onClick={() => updateMultiChartConfig(widgetId, { viewMode: "1x1" })} className="text-xs">
                            Single (1x1)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateMultiChartConfig(widgetId, { viewMode: "1x2" })} className="text-xs">
                            Vertical (1x2)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateMultiChartConfig(widgetId, { viewMode: "2x1" })} className="text-xs">
                            Horizontal (2x1)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateMultiChartConfig(widgetId, { viewMode: "2x2" })} className="text-xs">
                            Quad (2x2)
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <button
                    onClick={() => togglePiP(widgetId)}
                    className={cn(
                        "p-1.5 rounded transition-colors",
                        pipWidgetId === widgetId ? "bg-white/10 text-primary" : "text-[#555] hover:text-white hover:bg-white/5"
                    )}
                    title="Picture-in-Picture"
                >
                    <PictureInPicture className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={() => toggleTheaterMode(widgetId)}
                    className={cn(
                        "p-1.5 rounded transition-colors",
                        theaterModeWidgetId === widgetId ? "bg-white/10 text-primary" : "text-[#555] hover:text-white hover:bg-white/5"
                    )}
                    title="Theater Mode"
                >
                    <MonitorPlay className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};

const ToolButton = ({ icon: Icon, label }: { icon: any; label: string }) => (
    <button
        className="p-1.5 hover:bg-white/5 rounded text-[#555] hover:text-white transition-colors"
        title={label}
    >
        <Icon className="w-3.5 h-3.5" />
    </button>
);
