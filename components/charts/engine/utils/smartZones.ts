import { ChartData } from "./ChartEngine";

export interface Zone {
    type: "SUPPORT" | "RESISTANCE" | "FVG_BULL" | "FVG_BEAR";
    priceStart: number;
    priceEnd: number; // For FVG, this is the range (top/bottom). For S/R, slightly buffered.
    indexStart: number;
    indexEnd: number; // Usually extends to current
    strength?: number; // Hit count for S/R
}

// --- Pivot Point Detection (Support/Resistance) ---
export const detectSmartZones = (data: ChartData[], lookback: number = 20): Zone[] => {
    const zones: Zone[] = [];
    const len = data.length;

    // Simple Pivot High/Low
    for (let i = lookback; i < len - lookback; i++) {
        const current = data[i];

        // Check for Pivot High (Res)
        let isHigh = true;
        for (let j = 1; j <= lookback; j++) {
            if (data[i - j].high > current.high || data[i + j].high > current.high) {
                isHigh = false;
                break;
            }
        }

        // Check for Pivot Low (Sup)
        let isLow = true;
        for (let j = 1; j <= lookback; j++) {
            if (data[i - j].low < current.low || data[i + j].low < current.low) {
                isLow = false;
                break;
            }
        }

        if (isHigh) {
            zones.push({
                type: "RESISTANCE",
                priceStart: current.high,
                priceEnd: current.high,
                indexStart: i,
                indexEnd: len - 1,
                strength: 1
            });
        }
        if (isLow) {
            zones.push({
                type: "SUPPORT",
                priceStart: current.low,
                priceEnd: current.low,
                indexStart: i,
                indexEnd: len - 1,
                strength: 1
            });
        }
    }

    // Merge close zones (Simplified for now)
    return zones;
};

// --- Fair Value Gap (FVG) Detection ---
export const detectFVGs = (data: ChartData[]): Zone[] => {
    const zones: Zone[] = [];
    // Need at least 3 candles
    for (let i = 2; i < data.length - 1; i++) {
        const prev = data[i - 2];   // Candle 1
        // const curr = data[i - 1]; // Candle 2 (Big move)
        const next = data[i];       // Candle 3

        // Bullish FVG: Candle 1 High < Candle 3 Low
        // Correction: FVG is gap between Candle 1 High and Candle 3 Low, when Trend is Up.
        // Wait, standard definition:
        // Bullish FVG: Candle 1 High < Candle 3 Low. The gap is the space between them.

        if (prev.high < next.low) {
            zones.push({
                type: "FVG_BULL",
                priceStart: next.low, // Top of gap
                priceEnd: prev.high,  // Bottom of gap
                indexStart: i - 1,    // Starts at the big candle (Candle 2)
                indexEnd: data.length, // Extends to infinity/current
            });
        }

        // Bearish FVG: Candle 1 Low > Candle 3 High
        if (prev.low > next.high) {
            zones.push({
                type: "FVG_BEAR",
                priceStart: prev.low,  // Top of gap
                priceEnd: next.high,   // Bottom of gap
                indexStart: i - 1,
                indexEnd: data.length,
            });
        }
    }
    return zones;
};
