import { useEffect, useState, useRef } from 'react';
import { useLayoutStore } from '@/hooks/useLayoutStore';
import { useMarketStore } from '@/hooks/useMarketStore';
import { getATMStrike, calculateCorrelation } from '@/utils/math';

// Mock history fetcher for now - replace with real API
const fetchHistory = async (symbol: string): Promise<number[]> => {
    // Return random closing prices for correlation demo
    return Array.from({ length: 50 }, () => Math.random() * 100 + 24000);
};

export const useCyberScalp = () => {
    const { activeWorkspaceId, workspaces, setWorkspaceSymbol } = useLayoutStore();
    const { tickers } = useMarketStore();
    const [stats, setStats] = useState<{ correlation: number | null }>({ correlation: null });

    useEffect(() => {
        if (activeWorkspaceId !== 'cyber-scalp') return;

        const workspace = workspaces['cyber-scalp'];
        if (!workspace) return;

        // 1. Find Spot Widget (cs-spot)
        const spotArea = workspace.areas.find(a => a.id === 'spot-chart');
        const spotWidget = spotArea?.widgets.find(w => w.id === 'cs-spot');
        const spotSymbol = spotWidget?.symbol || 'NIFTY 50';

        // 2. Find ATM Widget
        const atmArea = workspace.areas.find(a => a.id === 'atm-chart');
        const atmWidget = atmArea?.widgets.find(w => w.id === 'cs-atm');

        if (!spotWidget || !atmWidget) return;

        // 3. Get Spot Price
        const spotTick = tickers[spotSymbol];
        if (!spotTick) return;

        // 4. Calculate ATM Logic
        const step = spotSymbol.includes('BANK') ? 100 : 50;
        const strike = getATMStrike(spotTick.last_price, step);
        const ceSymbol = `${spotSymbol.split(' ')[0]}24SEP${strike}CE`; // HARDCODED EXPIRY FOR PROTOTYPE

        // 5. Update ATM Widget if changed
        if (atmWidget.symbol !== ceSymbol) {
            console.log(`[CyberScalp] Dynamic ATM Update: ${ceSymbol}`);
            setWorkspaceSymbol(ceSymbol);
        }

        // 6. Calculate Correlation (Debounced)
        const calcCorr = async () => {
            const h1 = await fetchHistory(spotSymbol);
            const h2 = await fetchHistory(ceSymbol);
            const corr = calculateCorrelation(h1, h2);
            setStats({ correlation: corr });
        };

        // Run correlation calc every 5 seconds or on symbol change
        const interval = setInterval(calcCorr, 5000);
        calcCorr();

        return () => clearInterval(interval);

    }, [activeWorkspaceId, tickers, workspaces, setWorkspaceSymbol]);

    return stats;
};
