/**
 * useNeuralUI: Cyber Trade Neural Aesthetic Engine
 * Dynamically adjusts UI parameters based on Market Volatility.
 */
import { useEffect } from 'react';
import { useMarketStore } from '@/hooks/useMarketStore';

export function useNeuralUI() {
    const marketSentiment = useMarketStore((s) => s.marketSentiment);
    const tickers = useMarketStore((s) => s.tickers);

    useEffect(() => {
        // Calculate "Market Intensity"
        // Base Intensity: India VIX normalized (assuming 15 is neutral)
        const vixIntensity = Math.min((marketSentiment.indiaVix || 15) / 30, 1) * 10;

        // Dynamic Intensity: Average change percent of top tickers
        const tickerValues = Object.values(tickers);
        const avgAbsChange = tickerValues.length > 0
            ? tickerValues.reduce((acc, t) => acc + Math.abs(t.change_percent || 0), 0) / tickerValues.length
            : 0;

        const intensity = Math.min((vixIntensity + avgAbsChange * 5) / 10, 1.5);

        // Update Global CSS variables
        const root = document.documentElement;

        // 1. Neural Blur: Higher volatility = intense focus (higher blur)
        const blurValue = 8 + (intensity * 12); // Range 8px to 26px
        root.style.setProperty('--glass-blur', `${blurValue}px`);

        // 2. Neon Pulsation: Higher intensity = stronger glow
        const glowOpacity = 0.05 + (intensity * 0.15);
        root.style.setProperty('--neon-glow-opacity', glowOpacity.toString());

        // 3. Chromatic Shift (Subtle)
        const shift = intensity * 2;
        root.style.setProperty('--chromatic-shift', `${shift}px`);

    }, [marketSentiment, tickers]);
}
