/**
 * Strategy Indicator Math for Backtesting
 */

export function calculateSMA(data: number[], period: number): (number | null)[] {
    const sma: (number | null)[] = [];
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum += data[i];
        if (i >= period) {
            sum -= data[i - period];
        }
        if (i >= period - 1) {
            sma.push(sum / period);
        } else {
            sma.push(null);
        }
    }
    return sma;
}

export function calculateEMA(data: number[], period: number): (number | null)[] {
    const ema: (number | null)[] = [];
    const k = 2 / (period + 1);
    let prevEma: number | null = null;

    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            ema.push(null);
            continue;
        }

        if (prevEma === null) {
            // First EMA is SMA
            let sum = 0;
            for (let j = 0; j < period; j++) sum += data[j];
            prevEma = sum / period;
            ema.push(prevEma);
        } else {
            const currentEma: number = (data[i] - (prevEma as number)) * k + (prevEma as number);
            ema.push(currentEma);
            prevEma = currentEma;
        }
    }
    return ema;
}

export function calculateRSI(data: number[], period: number): (number | null)[] {
    const rsi: (number | null)[] = [];
    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < data.length; i++) {
        const diff = data[i] - data[i - 1];
        gains.push(Math.max(0, diff));
        losses.push(Math.max(0, -diff));
    }

    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = 0; i < data.length; i++) {
        if (i <= period) {
            rsi.push(null);
            continue;
        }

        const currentGain = gains[i - 1];
        const currentLoss = losses[i - 1];

        avgGain = (avgGain * (period - 1) + currentGain) / period;
        avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

        if (avgLoss === 0) {
            rsi.push(100);
        } else {
            const rs = avgGain / avgLoss;
            rsi.push(100 - (100 / (1 + rs)));
        }
    }

    return rsi;
}
