import { useState, useEffect, useMemo } from 'react';
import { useMarketStore } from '@/hooks/useMarketStore';

export interface OptionChainRow {
    strike: number;
    ce: { ltp: number; oi: number; volume: number; change: number };
    pe: { ltp: number; oi: number; volume: number; change: number };
}

export function useMockOptionChain(symbol: string) {
    const { tickers } = useMarketStore();
    const spotPrice = useMemo(() => tickers[symbol]?.last_price || 25471.10, [tickers, symbol]);

    const [chainData, setChainData] = useState<OptionChainRow[]>([]);

    useEffect(() => {
        // Generate initial chain based on current spot
        const generateMockChain = (spot: number): OptionChainRow[] => {
            const startStrike = Math.floor(spot / 50) * 50 - 500;
            return Array.from({ length: 21 }).map((_, i) => {
                const strike = startStrike + (i * 50);
                const dist = Math.abs(strike - spot);
                const isATM = dist < 25;

                // Simulate OI/Vol decaying away from ATM
                const oiBase = 5000000 * Math.exp(-dist / 500);
                const volBase = 10000000 * Math.exp(-dist / 300);

                return {
                    strike,
                    ce: {
                        ltp: Math.max(0.05, (spot - strike) + (Math.random() * 50)),
                        oi: Math.floor(oiBase * (0.8 + Math.random() * 0.4)),
                        volume: Math.floor(volBase * (0.8 + Math.random() * 0.4)),
                        change: (Math.random() * 20) - 10
                    },
                    pe: {
                        ltp: Math.max(0.05, (strike - spot) + (Math.random() * 50)),
                        oi: Math.floor(oiBase * (0.8 + Math.random() * 0.4)),
                        volume: Math.floor(volBase * (0.8 + Math.random() * 0.4)),
                        change: (Math.random() * 20) - 10
                    }
                };
            });
        };

        setChainData(generateMockChain(spotPrice));
    }, [spotPrice]);

    // Simulate tick updates to the chain data every second
    useEffect(() => {
        const interval = setInterval(() => {
            setChainData(prev => prev.map(row => {
                // Determine small random changes
                const ceTick = (Math.random() - 0.5) * 2; // -1 to 1
                const peTick = (Math.random() - 0.5) * 2;

                return {
                    ...row,
                    ce: {
                        ...row.ce,
                        ltp: Math.max(0.05, row.ce.ltp + ceTick),
                        change: row.ce.change + (ceTick / 10),
                        volume: row.ce.volume + Math.floor(Math.random() * 500),
                    },
                    pe: {
                        ...row.pe,
                        ltp: Math.max(0.05, row.pe.ltp + peTick),
                        change: row.pe.change + (peTick / 10),
                        volume: row.pe.volume + Math.floor(Math.random() * 500),
                    }
                };
            }));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return { spotPrice, chainData };
}
