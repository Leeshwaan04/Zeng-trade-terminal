import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useMarketStore } from '@/hooks/useMarketStore';
import { useOrderStore } from '@/hooks/useOrderStore';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DepthOfMarketProps {
    symbol: string;
}

export const DepthOfMarket = ({ symbol }: DepthOfMarketProps) => {
    const ticker = useMarketStore(s => s.tickers[symbol]);
    const { placeOrder, positions } = useOrderStore();
    const ltp = ticker?.last_price || ticker?.fused_price || 0;

    const currentPosition = positions.find(p => p.symbol === symbol && p.quantity !== 0);

    // Use real depth if available, otherwise fallback to mock ladder
    const domData = useMemo(() => {
        if (!ltp) return [];

        // If real depth exists, use it
        if (ticker?.depth && (ticker.depth.buy?.length > 0 || ticker.depth.sell?.length > 0)) {
            const { buy = [], sell = [] } = ticker.depth;

            const levels = [];
            // Merge and sort real depth
            // We want a list of prices around LTP
            const tickSize = 0.05;
            const spread = 20; // Show 20 levels above and below LTP

            for (let i = -spread; i <= spread; i++) {
                const price = Math.round((ltp + i * tickSize) * 100) / 100;
                const buyLevel = buy.find(b => Math.abs(b.price - price) < 0.01);
                const sellLevel = sell.find(s => Math.abs(s.price - price) < 0.01);

                levels.push({
                    price,
                    bidSize: buyLevel?.quantity || 0,
                    askSize: sellLevel?.quantity || 0,
                    isLtp: i === 0,
                });
            }
            return levels.reverse();
        }

        // Mock Fallback (existing logic)
        const levels = [];
        const tickSize = 0.05;
        const totalLevels = 40;

        for (let i = -totalLevels / 2; i <= totalLevels / 2; i++) {
            const price = Math.round((ltp + i * tickSize) * 100) / 100;
            const distance = Math.abs(i);
            const baseSize = Math.max(10, Math.floor(1000 / (distance + 1)));
            const bidSize = i < 0 ? baseSize + Math.floor(Math.random() * baseSize) : 0;
            const askSize = i > 0 ? baseSize + Math.floor(Math.random() * baseSize) : 0;

            levels.push({
                price,
                bidSize,
                askSize,
                isLtp: i === 0,
            });
        }
        return levels.reverse();
    }, [ltp, ticker?.depth]);

    const maxSideSize = useMemo(() => {
        return Math.max(...domData.map(d => Math.max(d.bidSize, d.askSize)));
    }, [domData]);

    const handleQuickOrder = (side: 'BUY' | 'SELL', type: 'MARKET' | 'LIMIT', price?: number) => {
        placeOrder({
            symbol,
            transactionType: side,
            orderType: type,
            productType: 'MIS',
            qty: 50,
            price: price || ltp,
        });
    };

    const handleFlatten = () => {
        const { closePosition } = useOrderStore.getState();
        closePosition(symbol, ltp);
    };

    return (
        <div className="flex flex-col h-full w-full bg-background border border-border font-mono text-xs select-none">
            {/* Header */}
            <div className="flex bg-surface-1 border-b border-border p-2 items-center justify-between shadow-md z-10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <div className="font-bold text-foreground tracking-widest text-[10px] opacity-70 uppercase">{symbol}</div>
                        <div className="text-primary font-bold text-base">{ltp.toFixed(2)}</div>
                    </div>
                    {currentPosition && (
                        <div className={cn(
                            "flex flex-col px-2 py-0.5 rounded border leading-none",
                            currentPosition.pnl >= 0 ? "bg-up/10 border-up/20 text-up" : "bg-down/10 border-down/20 text-down"
                        )}>
                            <span className="text-[8px] font-black uppercase">Pos: {currentPosition.quantity}</span>
                            <span className="text-[11px] font-bold">₹{currentPosition.pnl.toFixed(2)}</span>
                        </div>
                    )}
                </div>
                <div className="flex gap-1">
                    <button
                        onClick={() => handleQuickOrder('BUY', 'MARKET')}
                        className="px-2 py-1 bg-up/20 text-up border border-up/30 rounded text-[9px] font-bold hover:bg-up/30 transition-all uppercase"
                    >
                        Buy Mkt
                    </button>
                    <button
                        onClick={() => handleQuickOrder('SELL', 'MARKET')}
                        className="px-2 py-1 bg-down/20 text-down border border-down/30 rounded text-[9px] font-bold hover:bg-down/30 transition-all uppercase"
                    >
                        Sell Mkt
                    </button>
                    <button
                        onClick={handleFlatten}
                        className="px-2 py-1 bg-zinc-500/20 text-zinc-400 border border-zinc-500/30 rounded text-[9px] font-bold hover:bg-zinc-500/30 transition-all uppercase"
                    >
                        Flatten
                    </button>
                </div>
            </div>

            {/* DOM Table Headers */}
            <div className="flex text-muted-foreground bg-muted/30 border-b border-border py-1">
                <div className="flex-1 text-center font-semibold text-up text-[10px]">BID SIZE</div>
                <div className="w-[80px] text-center font-bold text-foreground text-[10px]">PRICE</div>
                <div className="flex-1 text-center font-semibold text-down text-[10px]">ASK SIZE</div>
            </div>

            {/* Ladder Area */}
            <ScrollArea className="flex-1 overflow-y-auto custom-scrollbar relative">
                <div className="flex flex-col pb-2">
                    {domData.map((level, idx) => {
                        const bidWidth = level.bidSize ? `${(level.bidSize / maxSideSize) * 100}%` : '0%';
                        const askWidth = level.askSize ? `${(level.askSize / maxSideSize) * 100}%` : '0%';

                        return (
                            <div
                                key={level.price}
                                className={cn(
                                    "flex group cursor-pointer hover:bg-muted/50 transition-colors border-b border-border relative",
                                    level.isLtp ? "bg-primary/10 border-y border-primary/20" : ""
                                )}
                            >
                                {/* BID SIDE */}
                                <div
                                    className="flex-1 relative flex items-center justify-end pr-3 py-1"
                                    onClick={() => handleQuickOrder('BUY', 'LIMIT', level.price)}
                                >
                                    {/* Bid Bar Background */}
                                    {level.bidSize > 0 && (
                                        <div
                                            className="absolute right-0 top-0 bottom-0 bg-up/20 transition-all duration-200"
                                            style={{ width: bidWidth }}
                                            title="Click to place Buy Limit"
                                        />
                                    )}
                                    <span className="relative z-10 text-up font-semibold drop-shadow-md">
                                        {level.bidSize > 0 ? level.bidSize.toLocaleString() : ''}
                                    </span>
                                </div>

                                {/* PRICE COLUMN */}
                                <div className={cn(
                                    "w-[80px] text-center py-1 font-bold z-10 bg-background/40 backdrop-blur-sm",
                                    level.isLtp ? "text-primary text-sm" : "text-foreground/80",
                                    "border-x border-border shadow-inner"
                                )}>
                                    {level.price.toFixed(2)}
                                </div>

                                {/* ASK SIDE */}
                                <div
                                    className="flex-1 relative flex items-center justify-start pl-3 py-1"
                                    onClick={() => handleQuickOrder('SELL', 'LIMIT', level.price)}
                                >
                                    {/* Ask Bar Background */}
                                    {level.askSize > 0 && (
                                        <div
                                            className="absolute left-0 top-0 bottom-0 bg-down/20 transition-all duration-200"
                                            style={{ width: askWidth }}
                                            title="Click to place Sell Limit"
                                        />
                                    )}
                                    <span className="relative z-10 text-down font-semibold drop-shadow-md">
                                        {level.askSize > 0 ? level.askSize.toLocaleString() : ''}
                                    </span>
                                </div>

                                {/* Position Marker Overlay */}
                                {currentPosition && Math.abs(currentPosition.average_price - level.price) < 0.02 && (
                                    <div className={cn(
                                        "absolute inset-0 pointer-events-none border-y-2 z-20 flex items-center px-2",
                                        currentPosition.quantity > 0 ? "border-up/40 bg-up/5" : "border-down/40 bg-down/5"
                                    )}>
                                        <div className={cn(
                                            "px-1 py-0.5 text-[8px] font-black rounded",
                                            currentPosition.quantity > 0 ? "bg-up text-white" : "bg-down text-white"
                                        )}>
                                            AVG: {currentPosition.average_price.toFixed(2)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
};
