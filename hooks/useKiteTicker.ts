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

    // ── Connection URL: EC2 WebSocket (preferred) or Vercel SSE (fallback) ──
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

    // Auto-enable mock for unauthenticated users
    const isMock = typeof window !== "undefined" &&
        (new URLSearchParams(window.location.search).get("mock") === "true" ||
            new URLSearchParams(window.location.search).get("testAuth") === "1" ||
            !isLoggedIn);

    const accessToken = typeof window !== "undefined"
        ? document.cookie.split("; ").find(r => r.startsWith("kite_access_token="))?.split("=")[1]
        : undefined;

    // EC2 WebSocket URL (set NEXT_PUBLIC_EC2_WS_URL in Vercel env)
    const ec2WsBase = process.env.NEXT_PUBLIC_EC2_WS_URL;

    // Prefer EC2 WS when: authenticated + EC2 URL configured + tokens exist
    const useEC2 = !!ec2WsBase && isLoggedIn && allTokens.length > 0 && !isMock;

    const connectionUrl = (() => {
        if (!allTokens.length) return "";
        if (useEC2 && accessToken) {
            return `${ec2WsBase}?access_token=${accessToken}&tokens=${allTokens.join(",")}&mode=${mode}`;
        }
        return `${origin}/api/ws/stream?tokens=${allTokens.join(",")}&mode=${mode}&broker=${broker}${isMock ? "&mock=true" : ""}`;
    })();

    const connectionType = useEC2 ? "ws" : "sse";

    // ALWAYS connect if tokens exist (either real or mock)
    const shouldConnect = enabled && allTokens.length > 0;

    const { status: workerStatus } = useWorkerTicker({
        url: connectionUrl,
        type: connectionType,
        enabled: shouldConnect,
    });

    useEffect(() => {
        setStatus(workerStatus);
    }, [workerStatus]);

    return { status, allTokens };
}
