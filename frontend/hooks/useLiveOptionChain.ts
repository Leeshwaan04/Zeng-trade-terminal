import { useState, useEffect, useMemo } from 'react';
import { useMarketStore } from '@/hooks/useMarketStore';

export interface OptionChainRow {
    strike: number;
    ce: { token: number; symbol: string; ltp: number; oi: number; volume: number; change: number };
    pe: { token: number; symbol: string; ltp: number; oi: number; volume: number; change: number };
}

export function useLiveOptionChain(symbol: string) {
    const { tickers, subscribe } = useMarketStore();
    const spotPrice = useMemo(() => tickers[symbol]?.last_price || 0, [tickers, symbol]);

    const [chainStructure, setChainStructure] = useState<OptionChainRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchChain = async () => {
            try {
                setLoading(true);
                const res = await fetch(`/api/kite/option-chain?symbol=${symbol}`);
                const json = await res.json();

                if (json.success && json.strikes) {
                    const rows: OptionChainRow[] = json.strikes.map((s: any) => ({
                        strike: s.strike,
                        ce: {
                            token: s.ce?.instrument_token || 0,
                            symbol: s.ce?.tradingsymbol || "",
                            ltp: 0, oi: 0, volume: 0, change: 0
                        },
                        pe: {
                            token: s.pe?.instrument_token || 0,
                            symbol: s.pe?.tradingsymbol || "",
                            ltp: 0, oi: 0, volume: 0, change: 0
                        },
                    }));

                    setChainStructure(rows);

                    // Subscribe to the WebSocket for all CE and PE tokens
                    const tokensToSubscribe = rows.flatMap(r => [r.ce.token, r.pe.token]).filter(t => t > 0);
                    if (tokensToSubscribe.length > 0) {
                        subscribe(tokensToSubscribe);
                    }
                }
            } catch (error) {
                console.error("Error fetching live option chain:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchChain();
    }, [symbol, subscribe]);

    // Compute the final chain data by merging the static structure with LIVE global store ticks
    const chainData = useMemo(() => {
        return chainStructure.map(row => {
            const ceTick = tickers[row.ce.token] || tickers[row.ce.symbol];
            const peTick = tickers[row.pe.token] || tickers[row.pe.symbol];

            return {
                ...row,
                ce: {
                    ...row.ce,
                    ltp: ceTick?.last_price || 0,
                    oi: ceTick?.oi || 0,
                    volume: ceTick?.volume || 0,
                    change: ceTick?.change_percent || 0,
                },
                pe: {
                    ...row.pe,
                    ltp: peTick?.last_price || 0,
                    oi: peTick?.oi || 0,
                    volume: peTick?.volume || 0,
                    change: peTick?.change_percent || 0,
                }
            };
        });
    }, [chainStructure, tickers]);

    return { spotPrice, chainData, loading };
}
