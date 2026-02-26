"use client";

import React, { useMemo } from "react";
import { ChartLayer } from "./ChartEngine";

export type IndicatorType = "SMA" | "EMA";

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
    let ema = data[0][source]; // Start with first price (or SMA of first period)
    results.push(ema);

    for (let i = 1; i < data.length; i++) {
        const price = data[i][source];
        ema = price * k + ema * (1 - k);
        results.push(ema);
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
            let values: (number | null)[] = [];
            if (ind.type === "SMA") values = calculateSMA(data, ind.period);
            if (ind.type === "EMA") values = calculateEMA(data, ind.period);

            // Draw
            ctx.beginPath();
            ctx.strokeStyle = ind.color;
            ctx.lineWidth = ind.lineWidth || 2;
            ctx.lineJoin = "round";

            let started = false;
            for (let i = 0; i < data.length; i++) {
                const val = values[i];
                if (val === null) continue;

                const px = x(i);
                const py = y(val);

                if (!started) {
                    ctx.moveTo(px, py);
                    started = true;
                } else {
                    ctx.lineTo(px, py);
                }
            }
            ctx.stroke();
        });
    };

    return <ChartLayer zIndex={20} draw={draw} />;
};
