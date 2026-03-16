"use client";

import { useEffect, useRef, useState } from "react";
import { useMarketStore } from "./useMarketStore";
import { useAuthStore } from "./useAuthStore";
import { UniversalTick } from "@/types/broker";
import { useWorkerTicker } from "./useWorkerTicker";
import { getDhanInstrument } from "@/lib/dhan-config";

interface UseDhanTickerOptions {
    instrumentTokens: string[];
    enabled?: boolean;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export function useDhanTicker({
    instrumentTokens,
    enabled = true,
}: UseDhanTickerOptions) {
    const updateTicker = useMarketStore((s) => s.updateTicker);
    const setConnectionStatus = useMarketStore((s) => s.setConnectionStatus);
    const { isLoggedIn, activeBroker } = useAuthStore();
    const socketRef = useRef<WebSocket | null>(null);
    const [status, setStatus] = useState<ConnectionStatus>("disconnected");

    const tokensParam = instrumentTokens.join(",");
    const wsUrl = `wss://api-feed.dhan.co`; // Placeholder - assuming token handled by worker or proxy if needed

    const { status: workerStatus } = useWorkerTicker({
        url: wsUrl,
        type: 'ws',
        enabled: enabled && isLoggedIn && activeBroker === "DHAN"
    });

    return { status: workerStatus };
}
