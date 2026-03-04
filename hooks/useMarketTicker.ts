"use client";

import { useAuthStore } from "@/hooks/useAuthStore";
import { useKiteTicker } from "@/hooks/useKiteTicker";
import { useDhanTicker } from "@/hooks/useDhanTicker";
import { useFyersTicker } from "./useFyersTicker";
import { useAngelTicker } from "./useAngelTicker";
import { use5PaisaTicker } from "./use5PaisaTicker";

interface UseMarketTickerOptions {
    instrumentTokens: (number)[]; // Only Kite/Groww tokens (numbers)
    mode?: "ltp" | "quote" | "full";
    enabled?: boolean;
}

export function useMarketTicker({
    instrumentTokens,
    mode = "quote",
    enabled = true,
}: UseMarketTickerOptions) {
    const { activeBroker } = useAuthStore();

    // ─── Filter Tokens ───
    const kiteTokens = activeBroker === 'KITE' ? instrumentTokens : [];
    const dhanTokens = activeBroker === 'DHAN' ? instrumentTokens.map(String) : [];
    const angelTokens = activeBroker === 'ANGEL' ? instrumentTokens.map(String) : [];
    const fyersTokens = activeBroker === 'FYERS' ? instrumentTokens.map(String) : [];
    const p5Tokens = activeBroker === '5PAISA' ? instrumentTokens : [];
    const growwTokens = activeBroker === 'GROWW' ? instrumentTokens : [];

    // ─── Initialize Hooks ───
    const kite = useKiteTicker({
        instrumentTokens: kiteTokens,
        mode,
        enabled: enabled && activeBroker === "KITE",
    });

    const dhan = useDhanTicker({
        instrumentTokens: dhanTokens as any,
        enabled: enabled && activeBroker === "DHAN",
    });

    const angel = useAngelTicker({
        instrumentTokens: angelTokens as any,
        enabled: enabled && activeBroker === "ANGEL",
    });

    const fyers = useFyersTicker({
        instrumentTokens: fyersTokens as any,
        enabled: enabled && activeBroker === "FYERS",
    });

    const p5 = use5PaisaTicker({
        instrumentTokens: p5Tokens.map(String),
        enabled: enabled && activeBroker === "5PAISA",
    });

    const groww = useKiteTicker({
        instrumentTokens: growwTokens,
        mode,
        broker: "GROWW",
        enabled: enabled && activeBroker === "GROWW",
    });

    // ─── Return Active Ticker State ───
    if (activeBroker === "DHAN") return { status: dhan.status, disconnect: () => { } };
    if (activeBroker === "ANGEL") return { status: angel.status, disconnect: () => { } };
    if (activeBroker === "FYERS") return { status: fyers.status, disconnect: () => { } };
    if (activeBroker === "5PAISA") return { status: p5.status, disconnect: () => { } };
    if (activeBroker === "GROWW") return { status: groww.status, disconnect: () => { } };

    return {
        status: kite.status,
        disconnect: () => { }
    };
}
