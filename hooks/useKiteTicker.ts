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
    const accessToken = useAuthStore((s) => s.accessToken);
    const [status, setStatus] = useState<ConnectionStatus>("disconnected");

    // Merge prop tokens + dynamically subscribed tokens (from Watchlist etc.)
    const { ltpTokens, quoteTokens, fullTokens } = useMarketStore((s) => ({
        ltpTokens: s.subscribedLtpTokens || new Set<number>(),
        quoteTokens: s.subscribedQuoteTokens || new Set<number>(),
        fullTokens: s.subscribedFullTokens || new Set<number>(),
    }));

    const allTokens = useMemo(() => {
        const merged = new Set([
            ...instrumentTokens.filter(t => t > 0),
            ...Array.from(ltpTokens).filter(t => t > 0),
            ...Array.from(quoteTokens).filter(t => t > 0),
            ...Array.from(fullTokens).filter(t => t > 0),
        ]);
        return Array.from(merged);
    }, [instrumentTokens, ltpTokens, quoteTokens, fullTokens]);

    // Construct mode-aware token strings for deeper optimization
    const modeString = useMemo(() => {
        const parts = [];
        if (instrumentTokens.length > 0) parts.push(`${mode}:${instrumentTokens.join(",")}`);
        if (ltpTokens.size > 0) parts.push(`ltp:${Array.from(ltpTokens).join(",")}`);
        if (quoteTokens.size > 0) parts.push(`quote:${Array.from(quoteTokens).join(",")}`);
        if (fullTokens.size > 0) parts.push(`full:${Array.from(fullTokens).join(",")}`);
        return parts.join("|");
    }, [instrumentTokens, ltpTokens, quoteTokens, fullTokens, mode]);

    // ── Connection URL: EC2 WebSocket (preferred) or SSE ────────
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

    // Auto-enable mock for unauthenticated users
    const isMock = typeof window !== "undefined" &&
        (new URLSearchParams(window.location.search).get("mock") === "true" ||
            new URLSearchParams(window.location.search).get("testAuth") === "1" ||
            !isLoggedIn);

    // EC2 WebSocket relay URL — set NEXT_PUBLIC_EC2_WS_URL on EC2 host
    const ec2WsBase = process.env.NEXT_PUBLIC_EC2_WS_URL;
    // API key for the EC2 relay AUTH message (public — already exposed to browser via login redirect)
    const apiKey = process.env.NEXT_PUBLIC_KITE_API_KEY;

    // Use EC2 relay when: authenticated + relay configured + tokens exist + not mock
    const useEC2 = !!ec2WsBase && !!accessToken && !!apiKey && isLoggedIn && allTokens.length > 0 && !isMock;

    const connectionUrl = (() => {
        if (!allTokens.length) return "";
        if (useEC2) {
            // Auth is sent via AUTH message after WS handshake
            return `${ec2WsBase}?tokens=${allTokens.join(",")}&modes=${modeString}`;
        }
        return `${origin}/api/ws/stream?tokens=${allTokens.join(",")}&modes=${modeString}&broker=${broker}${isMock ? "&mock=true" : ""}`;
    })();

    const connectionType = useEC2 ? "ws" : "sse";

    // ALWAYS connect if tokens exist (either real or mock)
    const shouldConnect = enabled && allTokens.length > 0;

    const { status: workerStatus } = useWorkerTicker({
        url: connectionUrl,
        type: connectionType,
        enabled: shouldConnect,
        // Pass EC2 relay auth credentials — worker sends AUTH message after WS handshake
        auth: useEC2 ? {
            access_token: accessToken!,
            api_key: apiKey!,
            tokens: allTokens,
            mode,
        } : undefined,
    });

    useEffect(() => {
        setStatus(workerStatus);
    }, [workerStatus]);

    return { status, allTokens };
}
