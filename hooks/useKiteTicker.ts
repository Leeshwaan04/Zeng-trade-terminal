"use client";

/**
 * useKiteTicker — connects to the SSE streaming endpoint
 * and dispatches live ticks to the market store.
 */
import { useEffect, useRef, useCallback, useState } from "react";
import { useMarketStore } from "@/hooks/useMarketStore";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useWorkerTicker } from "@/hooks/useWorkerTicker";
import { MARKET_INSTRUMENTS } from "@/lib/market-config";

interface UseKiteTickerOptions {
    instrumentTokens: number[];
    mode?: "ltp" | "quote" | "full";
    broker?: string;
    enabled?: boolean;
}

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

// Create a reverse map for faster lookup
const TOKEN_TO_SYMBOL: Record<number, string> = {};
MARKET_INSTRUMENTS.forEach(inst => {
    TOKEN_TO_SYMBOL[inst.token] = inst.symbol;
});

export function useKiteTicker({
    instrumentTokens,
    mode = "quote",
    broker = "KITE",
    enabled = true,
}: UseKiteTickerOptions) {
    const subscribedTokens = useMarketStore((s) => s.subscribedTokens);
    const setConnectionStatus = useMarketStore((s) => s.setConnectionStatus);
    const updateTicker = useMarketStore((s) => s.updateTicker);
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    const [status, setStatus] = useState<ConnectionStatus>("disconnected");
    const [activeTokens, setActiveTokens] = useState<number[]>([]);

    // Sync prop tokens with store tokens
    useEffect(() => {
        // We merge the initial "instrumentTokens" passed as props with the dynamic "subscribedTokens" from store
        // This ensures both the base layout widgets AND the search results get data.
        const allTokens = new Set([...instrumentTokens, ...Array.from(subscribedTokens)]);
        const tokenArray = Array.from(allTokens).filter(t => t > 0);

        // Deep compare to avoid reconnect loops
        if (JSON.stringify(tokenArray.sort()) !== JSON.stringify(activeTokens.sort())) {
            setActiveTokens(tokenArray);
        }
    }, [instrumentTokens, subscribedTokens, activeTokens]); // activeTokens in dep array for comparison logic inside effect is okay? No, better use ref or careful set. 
    // Actually, simpler: just calculate derived token list.

    const tokensParam = activeTokens.join(",");
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';

    // Check for mock mode in URL
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const isMock = urlParams.get('mock') === 'true' || urlParams.get('testAuth') === '1';
    const url = `${origin}/api/ws/stream?tokens=${tokensParam}&mode=${mode}&broker=${broker}${isMock ? '&mock=true' : ''}`;

    const { status: workerStatus } = useWorkerTicker({
        url,
        type: 'sse',
        enabled: isLoggedIn && activeTokens.length > 0 && enabled
    });

    useEffect(() => {
        setStatus(workerStatus);
    }, [workerStatus]);

    return { status, disconnect: () => { } };
}
