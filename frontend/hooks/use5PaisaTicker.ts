"use client";

import { useRef, useState, useEffect } from "react";
import { useAuthStore } from "./useAuthStore";
import { useMarketStore } from "./useMarketStore";
import { useWorkerTicker } from "./useWorkerTicker";

interface Use5PaisaTickerOptions {
    instrumentTokens: string[];
    enabled?: boolean;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export function use5PaisaTicker({ instrumentTokens, enabled }: Use5PaisaTickerOptions) {
    const { activeBroker } = useAuthStore();

    const { status: workerStatus } = useWorkerTicker({
        url: "wss://feed.5paisa.com/ASPX/Socket/MarketFeed.ashx",
        type: 'ws',
        enabled: enabled && activeBroker === "5PAISA"
    });

    return { status: workerStatus };
}
