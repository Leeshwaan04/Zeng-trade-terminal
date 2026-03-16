"use client";

import React, { useMemo } from "react";
import { ChartLayer } from "./ChartEngine";

export type IndicatorType = "SMA" | "EMA" | "RSI" | "BB";

export interface IndicatorConfig {
    id: string;
    type: IndicatorType;
    period: number;
    color: string;
    lineWidth?: number;
}

// ─── Math Utils ──────────────────────────────────────────────
const calculateSMA = (data: any[], period: number, source: string = "close") => {
    const results = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            results.push(null);
            continue;
        }
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j][source];
        }
        results.push(sum / period);
    }
    return results;
};

const calculateEMA = (data: any[], period: number, source: string = "close") => {
    const results = [];
    const k = 2 / (period + 1);
    let ema = data[0][source]; 
    results.push(ema);

    for (let i = 1; i < data.length; i++) {
        const price = data[i][source];
        ema = price * k + ema * (1 - k);
        results.push(ema);
    }
    return results;
};

const calculateRSI = (data: any[], period: number = 14, source: string = "close") => {
    const results = [];
    if (data.length < period) return new Array(data.length).fill(null);

    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i++) {
        const delta = data[i][source] - data[i - 1][source];
        if (delta >= 0) gains += delta;
        else losses -= delta;
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = 0; i < data.length; i++) {
        if (i < period) {
            results.push(null);
            continue;
        }

        if (i > period) {
            const delta = data[i][source] - data[i - 1][source];
            const currentGain = delta >= 0 ? delta : 0;
            const currentLoss = delta < 0 ? -delta : 0;
            avgGain = (avgGain * (period - 1) + currentGain) / period;
            avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
        }

        if (avgLoss === 0) results.push(100);
        else {
            const rs = avgGain / avgLoss;
            results.push(100 - (100 / (1 + rs)));
        }
    }
    return results;
};

const calculateBB = (data: any[], period: number = 20, stdDev: number = 2, source: string = "close") => {
    const sma = calculateSMA(data, period, source);
    const results = [];

    for (let i = 0; i < data.length; i++) {
        if (sma[i] === null) {
            results.push(null);
            continue;
        }

        let sumSqDiff = 0;
        for (let j = 0; j < period; j++) {
            const diff = data[i - j][source] - (sma[i] as number);
            sumSqDiff += diff * diff;
        }
        const dev = Math.sqrt(sumSqDiff / period) * stdDev;
        results.push({
            middle: sma[i],
            upper: (sma[i] as number) + dev,
            lower: (sma[i] as number) - dev
        });
    }
    return results;
};

// ─── Layer Component ─────────────────────────────────────────

export const IndicatorLayer = ({ indicators }: { indicators: IndicatorConfig[] }) => {

    const draw = (ctx: CanvasRenderingContext2D, { data, scales }: any) => {
        if (!scales || data.length === 0) return;
        const { x, y } = scales;

        indicators.forEach(ind => {
            // Calculate
            if (ind.type === "SMA") {
                const values = calculateSMA(data, ind.period);
                ctx.beginPath();
                ctx.strokeStyle = ind.color;
                ctx.lineWidth = ind.lineWidth || 2;
                let started = false;
                for (let i = 0; i < data.length; i++) {
                    const val = values[i];
                    if (val === null) continue;
                    const px = x(i); const py = y(val);
                    if (!started) { ctx.moveTo(px, py); started = true; } 
                    else ctx.lineTo(px, py);
                }
                ctx.stroke();
            }

            if (ind.type === "EMA") {
                const values = calculateEMA(data, ind.period);
                ctx.beginPath();
                ctx.strokeStyle = ind.color;
                ctx.lineWidth = ind.lineWidth || 2;
                let started = false;
                for (let i = 0; i < data.length; i++) {
                    const val = values[i];
                    if (val === null) continue;
                    const px = x(i); const py = y(val);
                    if (!started) { ctx.moveTo(px, py); started = true; } 
                    else ctx.lineTo(px, py);
                }
                ctx.stroke();
            }

            if (ind.type === "BB") {
                const values = calculateBB(data, ind.period);
                // Draw Background
                ctx.beginPath();
                ctx.fillStyle = ind.color + "1A"; // 10% opacity
                let started = false;
                for (let i = 0; i < data.length; i++) {
                    const val = values[i] as any;
                    if (!val) continue;
                    if (!started) { ctx.moveTo(x(i), y(val.upper)); started = true; }
                    else ctx.lineTo(x(i), y(val.upper));
                }
                for (let i = data.length - 1; i >= 0; i--) {
                    const val = values[i] as any;
                    if (!val) continue;
                    ctx.lineTo(x(i), y(val.lower));
                }
                ctx.closePath();
                ctx.fill();

                // Draw Lines
                ["upper", "lower", "middle"].forEach(key => {
                    ctx.beginPath();
                    ctx.strokeStyle = ind.color;
                    ctx.lineWidth = key === "middle" ? 1 : 1.5;
                    ctx.setLineDash(key === "middle" ? [5, 5] : []);
                    let started = false;
                    for (let i = 0; i < data.length; i++) {
                        const val = values[i] as any;
                        if (!val) continue;
                        const px = x(i); const py = y(val[key]);
                        if (!started) { ctx.moveTo(px, py); started = true; }
                        else ctx.lineTo(px, py);
                    }
                    ctx.stroke();
                });
                ctx.setLineDash([]);
            }

            if (ind.type === "RSI") {
                const values = calculateRSI(data, ind.period);
                const rsiH = 60; // Fixed mini-panel height
                const rsiYBase = height - 100; // Position above bottom margin
                
                // RSI Panel Bg
                ctx.fillStyle = "rgba(0,0,0,0.3)";
                ctx.fillRect(0, rsiYBase, width, rsiH);
                ctx.strokeStyle = "rgba(255,255,255,0.1)";
                ctx.strokeRect(0, rsiYBase, width, rsiH);

                // Guides (30/70)
                ctx.setLineDash([2, 4]);
                ctx.strokeStyle = "rgba(255,255,255,0.2)";
                [30, 70].forEach(level => {
                    const py = rsiYBase + rsiH * (1 - level / 100);
                    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(width, py); ctx.stroke();
                });
                ctx.setLineDash([]);

                // RSI Plot
                ctx.beginPath();
                ctx.strokeStyle = ind.color;
                ctx.lineWidth = 1.5;
                let started = false;
                for (let i = 0; i < data.length; i++) {
                    const val = values[i];
                    if (val === null) continue;
                    const px = x(i);
                    const py = rsiYBase + rsiH * (1 - val / 100);
                    if (!started) { ctx.moveTo(px, py); started = true; }
                    else ctx.lineTo(px, py);
                }
                ctx.stroke();

                // Label
                ctx.fillStyle = ind.color;
                ctx.font = "bold 8px monospace";
                const lastVal = values[values.length - 1];
                if (lastVal) ctx.fillText(`RSI(${ind.period}): ${lastVal.toFixed(2)}`, 10, rsiYBase + 12);
            }
        });
    };

    return <ChartLayer zIndex={20} draw={draw} />;
};
