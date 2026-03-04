"use client";

/**
 * useKiteTicker — connects to the SSE streaming endpoint
 * and dispatches live ticks to the market store via the background worker.
 *
 * Works in both authenticated (real Kite data) and mock mode (demo data).
 */
import { useMemo, useState, useEffect } from "react";
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

// Reverse map: token → symbol for fast tick resolution
const TOKEN_TO_SYMBOL: Record<number, string> = {};
MARKET_INSTRUMENTS.forEach(inst => {
    if (inst.token > 0) TOKEN_TO_SYMBOL[inst.token] = inst.symbol;
});

export function useKiteTicker({
    instrumentTokens,
    mode = "quote",
    broker = "KITE",
    enabled = true,
}: UseKiteTickerOptions) {
    const subscribedTokens = useMarketStore((s) => s.subscribedTokens);
    const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
    const [status, setStatus] = useState<ConnectionStatus>("disconnected");

    // Merge prop tokens + dynamically subscribed tokens (from Watchlist etc.)
    const allTokens = useMemo(() => {
        const merged = new Set([
            ...instrumentTokens.filter(t => t > 0),
            ...Array.from(subscribedTokens).filter(t => t > 0),
        ]);
        return Array.from(merged);
    }, [instrumentTokens, subscribedTokens]);

    const tokensParam = allTokens.join(",");

    // Check for mock mode in URL
    const isMock = typeof window !== "undefined" &&
        (new URLSearchParams(window.location.search).get("mock") === "true" ||
            new URLSearchParams(window.location.search).get("testAuth") === "1");

    // Build absolute URL for the SSE stream
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const sseUrl = tokensParam
        ? `${origin}/api/ws/stream?tokens=${tokensParam}&mode=${mode}&broker=${broker}${isMock ? "&mock=true" : ""}`
        : "";

    // Start worker when: logged in OR in mock mode, AND we have tokens to subscribe
    const shouldConnect = enabled && allTokens.length > 0 && (isLoggedIn || isMock);

    const { status: workerStatus } = useWorkerTicker({
        url: sseUrl,
        type: "sse",
        enabled: shouldConnect,
    });

    useEffect(() => {
        setStatus(workerStatus);
    }, [workerStatus]);

    return { status, allTokens };
}
