"use client";

import { useAuthStore } from "@/hooks/useAuthStore";
import { useKiteTicker } from "@/hooks/useKiteTicker";
import { useUpstoxTicker } from "@/hooks/useUpstoxTicker";
import { useDhanTicker } from "@/hooks/useDhanTicker";
import { useFyersTicker } from "./useFyersTicker";
import { useAngelTicker } from "./useAngelTicker";
import { use5PaisaTicker } from "./use5PaisaTicker";

interface UseMarketTickerOptions {
    instrumentTokens: (string | number)[]; // Accepts both Kite (number) & Upstox (string) tokens
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
    const kiteTokens = activeBroker === 'KITE' ? instrumentTokens.filter((t): t is number => typeof t === 'number') : [];
    const upstoxTokens = activeBroker === 'UPSTOX' ? instrumentTokens.filter((t): t is string => typeof t === 'string') : [];
    const dhanTokens = activeBroker === 'DHAN' ? instrumentTokens.filter((t): t is string => typeof t === 'string') : [];
    const angelTokens = activeBroker === 'ANGEL' ? instrumentTokens.filter((t): t is string => typeof t === 'string') : [];
    const fyersTokens = activeBroker === 'FYERS' ? instrumentTokens.filter((t): t is string => typeof t === 'string') : [];
    const p5Tokens = activeBroker === '5PAISA' ? instrumentTokens.filter((t): t is number => typeof t === 'number') : [];
    const growwTokens = activeBroker === 'GROWW' ? instrumentTokens.filter((t): t is number => typeof t === 'number') : [];

    // ─── Initialize Hooks ───
    const kite = useKiteTicker({
        instrumentTokens: kiteTokens,
        mode,
        enabled: enabled && activeBroker === "KITE",
    });

    const upstox = useUpstoxTicker({
        instrumentTokens: upstoxTokens,
        mode: mode,
        enabled: enabled && activeBroker === "UPSTOX",
    });

    const dhan = useDhanTicker({
        instrumentTokens: dhanTokens,
        enabled: enabled && activeBroker === "DHAN",
    });

    const angel = useAngelTicker({
        instrumentTokens: angelTokens,
        enabled: enabled && activeBroker === "ANGEL",
    });

    const fyers = useFyersTicker({
        instrumentTokens: fyersTokens,
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
    if (activeBroker === "UPSTOX") return { status: upstox.status, disconnect: () => { } };
    if (activeBroker === "DHAN") return { status: dhan.status, disconnect: () => { } };
    if (activeBroker === "ANGEL") return { status: angel.status, disconnect: () => { } };
    if (activeBroker === "FYERS") return { status: fyers.status, disconnect: () => { } };
    if (activeBroker === "5PAISA") return { status: p5.status, disconnect: () => { } };
    if (activeBroker === "GROWW") return { status: groww.status, disconnect: groww.disconnect };

    return {
        status: kite.status,
        disconnect: kite.disconnect
    };
}
