"use client";

import React, { useMemo } from "react";
import { useMarketTicker } from "@/hooks/useMarketTicker";
import { useOrderStore } from "@/hooks/useOrderStore";
import { useRuleExecutor } from "@/hooks/useRuleExecutor";
import { useStrategyStore } from "@/hooks/useStrategyStore";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { MARKET_INSTRUMENTS, getInstrumentToken } from "@/lib/market-config";

export const MarketDataManager = () => {
    // 1. Watchlist Tokens (All configured market instruments)
    const watchlistTokens = useMemo(() => MARKET_INSTRUMENTS.map(i => i.token), []);

    // 2. Positions Tokens (Open positions need real-time P&L)
    const positions = useOrderStore(state => state.positions);
    const positionTokens = useMemo(() =>
        positions.map(p => getInstrumentToken(p.symbol)).filter(Boolean) as number[],
        [positions]);

    // 3. Strategy Tokens (Legs in the builder need real-time prices)
    const strategyLegs = useStrategyStore(state => state.legs);
    const strategyTokens = useMemo(() =>
        strategyLegs.map(l => l.instrument.instrument_token).filter(Boolean),
        [strategyLegs]);

    // 4. Active Active Symbol (For Chart and Depth)
    // We get the active widget's symbol from the layout store if possible, 
    // or just default to NIFTY/BANKNIFTY if we can't easily determine it without complex logic.
    // For now, let's ensure the defaults are always subscribed via watchlistTokens.
    // If we have dynamic charts, their components usually subscribe themselves? 
    // Actually, TradingChart uses useKiteTicker internally? 
    // Let's check TradingChart later. For now, this covers the "Global" state.

    // Combine & Deduplicate
    const allTokens = useMemo(() => {
        const tokens = new Set([
            ...watchlistTokens,
            ...positionTokens,
            ...strategyTokens
        ]);
        return Array.from(tokens);
    }, [watchlistTokens, positionTokens, strategyTokens]);

    // Global Subscription
    // this hook manages the socket connection and merging ticks into the store.
    useMarketTicker({
        instrumentTokens: allTokens,
        mode: "full", // We want full depth/quote where possible
        enabled: true
    });

    // Render nothing, this is a logic-only component
    return null;
};
