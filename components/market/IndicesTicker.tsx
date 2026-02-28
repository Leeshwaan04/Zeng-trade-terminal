"use client";

import React, { useEffect } from "react";
import { useMarketStore } from "@/hooks/useMarketStore";
import { cn } from "@/lib/utils";

import { Settings2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useTickerStore } from "@/hooks/useTickerStore";

export const IndicesTicker = () => {
    const subscribe = useMarketStore(s => s.subscribe);
    const tickers = useMarketStore(s => s.tickers);
    const { items, speedMultiplier, toggleItem, setSpeed, resetToDefault } = useTickerStore();

    const activeItems = React.useMemo(() => items.filter(i => i.isActive), [items]);

    useEffect(() => {
        // Subscribe only to active tokens, filter out string commodities for now if WebSocket doesn't support them
        const tokensToSubscribe = activeItems
            .map(i => i.token)
            .filter(t => typeof t === 'number') as number[];

        if (tokensToSubscribe.length > 0) {
            subscribe(tokensToSubscribe);
        }
    }, [subscribe, activeItems]);

    const TickerItem = ({ index }: { index: typeof items[0] }) => {
        const ticker = tickers[index.symbol] || { last_price: 0, net_change: 0, change_percent: 0 };
        const isPositive = (ticker.net_change ?? 0) >= 0;
        const changePct = ticker.change_percent ?? (ticker.net_change / (ticker.last_price - ticker.net_change) * 100 || 0);

        return (
            <div className="flex items-center gap-3 px-4 shrink-0 border-r border-border/10 h-full cursor-pointer hover:bg-foreground/5 transition-colors group">
                <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.12em] group-hover:text-foreground transition-colors">
                    {index.symbol.replace("NIFTY ", "").replace("INDIA ", "")}
                </span>
                <span className={cn("text-[10px] font-black tracking-tight text-numeral", isPositive ? "text-up" : "text-down")}>
                    {ticker.last_price > 0 ? ticker.last_price.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : "—"}
                </span>
                <span className={cn("text-[8px] font-bold text-numeral", isPositive ? "text-up/60" : "text-down/60")}>
                    {isPositive ? "▲" : "▼"} {Math.abs(changePct).toFixed(2)}%
                </span>
            </div>
        );
    };

    return (
        <div data-testid="indices-ticker" className="w-full flex items-center overflow-hidden relative h-[22px] bg-background/60 backdrop-blur-md group/ticker border-b border-border/10">
            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />

            <div
                className="flex animate-marquee h-full items-center"
                style={{
                    animationDuration: `${40 / speedMultiplier}s`,
                    animationPlayState: 'running' // Allow pause on hover via css if needed, but groww scrolls smoothly
                }}
            >
                {[...activeItems, ...activeItems].map((index, i) => (
                    <TickerItem key={`${index.symbol}-${i}`} index={index} />
                ))}
            </div>

            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-background via-background/60 to-transparent z-10 pointer-events-none flex items-center justify-end pr-2" />

            {/* Settings Trigger */}
            <div className="absolute right-2 top-0 bottom-0 z-20 flex items-center">
                <Popover>
                    <PopoverTrigger asChild>
                        <button className="p-1.5 rounded-md bg-foreground/5 hover:bg-foreground/10 border border-border/10 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover/ticker:opacity-100 focus:opacity-100">
                            <Settings2 className="w-3.5 h-3.5" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 bg-surface-1 border-border/20 p-4" align="end" sideOffset={8}>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-foreground">Edit Columns</h4>
                            <button onClick={resetToDefault} className="text-[10px] text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors">
                                <span className="rotate-180">↻</span> Reset
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                            {items.map(item => (
                                <div key={item.symbol} className="flex items-center space-x-2">
                                    <Switch
                                        id={`ticker-${item.symbol}`}
                                        checked={item.isActive}
                                        onCheckedChange={() => toggleItem(item.symbol)}
                                        className="data-[state=checked]:bg-primary h-4 w-7 [&_span]:h-3 [&_span]:w-3"
                                    />
                                    <label
                                        htmlFor={`ticker-${item.symbol}`}
                                        className="text-[10px] font-bold text-zinc-300 cursor-pointer hover:text-white"
                                    >
                                        # {item.symbol.replace("NIFTY ", "").replace("INDIA ", "")}
                                    </label>
                                </div>
                            ))}
                        </div>

                        <div className="pt-4 border-t border-white/5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Ticker Speed</span>
                                <span className="text-[9px] font-mono font-bold text-primary">{speedMultiplier}x</span>
                            </div>
                            <Slider
                                defaultValue={[speedMultiplier]}
                                max={2}
                                min={0.2}
                                step={0.1}
                                onValueChange={(v) => setSpeed(v[0])}
                                className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary"
                            />
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
};
