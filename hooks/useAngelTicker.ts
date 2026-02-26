"use client";

import { useRef, useState, useEffect } from "react";
import { useAuthStore } from "./useAuthStore";
import { useMarketStore } from "./useMarketStore";
import { useWorkerTicker } from "./useWorkerTicker";

interface UseAngelTickerOptions {
    instrumentTokens: string[];
    enabled?: boolean;
}

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export function useAngelTicker({ instrumentTokens, enabled }: UseAngelTickerOptions) {
    const { activeBroker } = useAuthStore();

    const { status: workerStatus } = useWorkerTicker({
        url: "wss://smartapisocket.angelone.in/smart-stream",
        type: 'ws',
        enabled: enabled && activeBroker === "ANGEL"
    });

    return { status: workerStatus };
}
