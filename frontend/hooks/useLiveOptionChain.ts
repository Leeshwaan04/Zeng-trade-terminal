import { useState, useEffect, useMemo, useRef } from 'react';
import { useMarketStore } from '@/hooks/useMarketStore';

export interface OptionChainRow {
    strike: number;
    ce: { token: number; symbol: string; ltp: number; oi: number; volume: number; change: number };
    pe: { token: number; symbol: string; ltp: number; oi: number; volume: number; change: number };
}

const MOCK_SPOT: Record<string, number> = {
    "NIFTY": 25000, "NIFTY 50": 25000,
    "BANKNIFTY": 56500, "NIFTY BANK": 56500,
    "FINNIFTY": 26800, "MIDCPNIFTY": 13100,
};

function mockKiteName(symbol: string) {
    if (symbol === "NIFTY 50") return "NIFTY";
    if (symbol === "NIFTY BANK") return "BANKNIFTY";
    return symbol.replace(/\s+/g, "");
}

// Synthetic chain with plausible premiums for mock/demo mode.
function buildMockChain(spot: number, kiteName: string): OptionChainRow[] {
    const step = kiteName.includes("BANK") ? 100 : 50;
    const baseToken = kiteName.includes("BANK") ? 9000000 : kiteName.includes("FIN") ? 9100000 : 8000000;
    const atm = Math.round(spot / step) * step;
    const atmPremium = Math.max(20, spot * 0.15 * Math.sqrt(7 / 252) * 0.4);

    const rows: OptionChainRow[] = [];
    for (let i = -10; i <= 10; i++) {
        const strike = atm + i * step;
        const dist = Math.abs(strike - spot) / spot;
        const timeVal = atmPremium * Math.exp(-dist * 7);
        const ceLtp = +(Math.max(0, spot - strike) + timeVal).toFixed(1);
        const peLtp = +(Math.max(0, strike - spot) + timeVal).toFixed(1);
        // OI peaks a bit OTM, falls off with distance
        const oiBase = Math.round(2_000_00 * Math.exp(-dist * 5));
        const tokenBase = baseToken + (i + 10) * 2;
        rows.push({
            strike,
            ce: { token: tokenBase, symbol: `${kiteName}${strike}CE`, ltp: ceLtp, oi: oiBase + Math.round(Math.random() * 50000), volume: Math.round(Math.random() * 200000), change: +((Math.random() - 0.45) * 8).toFixed(1) },
            pe: { token: tokenBase + 1, symbol: `${kiteName}${strike}PE`, ltp: peLtp, oi: oiBase + Math.round(Math.random() * 50000), volume: Math.round(Math.random() * 200000), change: +((Math.random() - 0.55) * 8).toFixed(1) },
        });
    }
    return rows;
}

export function useLiveOptionChain(symbol: string) {
    const { tickers, subscribe } = useMarketStore();
    const isMock = typeof window !== "undefined" && window.location.search.includes("mock=true");

    const kiteName = mockKiteName(symbol);
    const liveSpot = tickers[symbol]?.last_price || 0;
    const spotPrice = useMemo(
        () => (liveSpot > 0 ? liveSpot : (isMock ? (MOCK_SPOT[symbol] || MOCK_SPOT[kiteName] || 25000) : 0)),
        [liveSpot, isMock, symbol, kiteName]
    );

    const [chainStructure, setChainStructure] = useState<OptionChainRow[]>([]);
    const [mockChain, setMockChain] = useState<OptionChainRow[]>([]);
    const [loading, setLoading] = useState(true);
    const mockSeededRef = useRef(false);

    // ── Mock mode: synthesize a chain and tick it like a live feed ──
    useEffect(() => {
        if (!isMock) return;
        const effectiveSpot = spotPrice > 0 ? spotPrice : (MOCK_SPOT[symbol] || MOCK_SPOT[kiteName] || 25000);

        if (!mockSeededRef.current || mockChain.length === 0) {
            mockSeededRef.current = true;
            setMockChain(buildMockChain(effectiveSpot, kiteName));
            setLoading(false);
        }

        // Tick premiums each second so the chain feels alive
        const interval = setInterval(() => {
            setMockChain(prev => prev.map(row => {
                const ceTick = (Math.random() - 0.5) * 2;
                const peTick = (Math.random() - 0.5) * 2;
                return {
                    ...row,
                    ce: { ...row.ce, ltp: Math.max(0.05, +(row.ce.ltp + ceTick).toFixed(1)), change: +(row.ce.change + ceTick / 10).toFixed(1), volume: row.ce.volume + Math.floor(Math.random() * 500) },
                    pe: { ...row.pe, ltp: Math.max(0.05, +(row.pe.ltp + peTick).toFixed(1)), change: +(row.pe.change + peTick / 10).toFixed(1), volume: row.pe.volume + Math.floor(Math.random() * 500) },
                };
            }));
        }, 1000);
        return () => clearInterval(interval);
    }, [isMock, symbol, kiteName, spotPrice, mockChain.length]);

    // ── Live mode: fetch real structure + subscribe to WS ──
    useEffect(() => {
        if (isMock) return;
        const fetchChain = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/kite/option-chain?symbol=${symbol}`);
                const json = await res.json();

                if (json.success && json.strikes) {
                    const rows: OptionChainRow[] = json.strikes.map((s: any) => ({
                        strike: s.strike,
                        ce: { token: s.ce?.instrument_token || 0, symbol: s.ce?.tradingsymbol || "", ltp: 0, oi: 0, volume: 0, change: 0 },
                        pe: { token: s.pe?.instrument_token || 0, symbol: s.pe?.tradingsymbol || "", ltp: 0, oi: 0, volume: 0, change: 0 },
                    }));
                    setChainStructure(rows);

                    const tokensToSubscribe = rows.flatMap(r => [r.ce.token, r.pe.token]).filter(t => t > 0);
                    if (tokensToSubscribe.length > 0) subscribe(tokensToSubscribe);
                }
            } catch (error) {
                console.error("Error fetching live option chain:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchChain();
    }, [isMock, symbol, subscribe]);

    // Live: merge static structure with global store ticks
    const liveChainData = useMemo(() => {
        return chainStructure.map(row => {
            const ceTick = tickers[row.ce.token] || tickers[row.ce.symbol];
            const peTick = tickers[row.pe.token] || tickers[row.pe.symbol];
            return {
                ...row,
                ce: { ...row.ce, ltp: ceTick?.last_price || 0, oi: ceTick?.oi || 0, volume: ceTick?.volume || 0, change: ceTick?.change_percent || 0 },
                pe: { ...row.pe, ltp: peTick?.last_price || 0, oi: peTick?.oi || 0, volume: peTick?.volume || 0, change: peTick?.change_percent || 0 },
            };
        });
    }, [chainStructure, tickers]);

    return { spotPrice, chainData: isMock ? mockChain : liveChainData, loading };
}
