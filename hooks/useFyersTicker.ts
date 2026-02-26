"use client";

import { useRef, useState, useEffect } from "react";
import { useAuthStore } from "./useAuthStore";
import { useMarketStore } from "./useMarketStore";
import { useWorkerTicker } from "./useWorkerTicker";
import { getFyersInstrument } from "@/lib/fyers-config";

interface UseFyersTickerOptions {
    instrumentTokens: string[];
    enabled?: boolean;
}

export function useFyersTicker({ instrumentTokens, enabled }: UseFyersTickerOptions) {
    const { activeBroker } = useAuthStore();

    const { status: workerStatus } = useWorkerTicker({
        url: "wss://socket.fyers.in/parallel/v3/data",
        type: 'ws',
        enabled: enabled && activeBroker === "FYERS"
    });

    return { status: workerStatus };
}
