"use client";

import { useEffect, useRef, useState } from "react";
import { useMarketStore } from "./useMarketStore";
import { useAuthStore } from "./useAuthStore";
import { UniversalTick } from "@/types/broker";
import { useWorkerTicker } from "./useWorkerTicker";
import { getUpstoxToken, MARKET_INSTRUMENTS } from "@/lib/market-config";
import { decodeUpstoxFeed, initProtobuf } from "@/lib/upstox-parser";

interface UseUpstoxTickerOptions {
    instrumentTokens: string[]; // Symbols like "NIFTY 50"
    mode?: "full" | "quote" | "ltp";
    enabled?: boolean;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export function useUpstoxTicker({
    instrumentTokens,
    mode = "full",
    enabled = true,
}: UseUpstoxTickerOptions) {
    const { accessToken, activeBroker, isLoggedIn } = useAuthStore();

    const { status: workerStatus } = useWorkerTicker({
        url: `wss://api.upstox.com/v2/feed/market-data-feed?access_token=${accessToken}`,
        type: 'ws',
        enabled: enabled && isLoggedIn && activeBroker === "UPSTOX" && !!accessToken
    });

    return { status: workerStatus };
}
