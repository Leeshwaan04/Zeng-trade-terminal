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
    const { placeOrder } = useOrderStore();
    const ltp = ticker?.last_price || ticker?.fused_price || 0;

    // Generate a mock DOM based on the LTP if real Depth isn't available
    const domData = useMemo(() => {
        if (!ltp) return [];
        const levels = [];
        const tickSize = 0.05; // 5 paise tick for NSE
        const totalLevels = 40; // 20 up, 20 down

        for (let i = -totalLevels / 2; i <= totalLevels / 2; i++) {
            const price = Math.round((ltp + i * tickSize) * 100) / 100;
            const distance = Math.abs(i);

            // Randomize sizes based on distance to simulate market depth
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
        return levels.reverse(); // Highest price at top
    }, [ltp]);

    const maxSideSize = useMemo(() => {
        return Math.max(...domData.map(d => Math.max(d.bidSize, d.askSize)));
    }, [domData]);

    const handleCellClick = (price: number, side: 'BUY' | 'SELL') => {
        if (!price) return;

        // Quick order placement at the clicked price level
        placeOrder({
            symbol,
            transactionType: side,
            orderType: 'LIMIT',
            productType: 'MIS',
            qty: 50, // Default quick qty
            price: price,
        });
    };

    return (
        <div className="flex flex-col h-full w-full bg-background border border-border font-mono text-xs select-none">
            {/* Header */}
            <div className="flex bg-surface-1 border-b border-border p-2 items-center justify-between shadow-md z-10">
                <div className="font-bold text-foreground tracking-widest">{symbol} DOM</div>
                <div className="text-primary font-bold">{ltp.toFixed(2)}</div>
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
                                    onClick={() => handleCellClick(level.price, 'BUY')}
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
                                    onClick={() => handleCellClick(level.price, 'SELL')}
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
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>
        </div>
    );
};
