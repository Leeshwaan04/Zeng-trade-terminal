"use client";

import React, { useCallback } from "react";
import { ChartLayer, useChart } from "./ChartEngine";

export const HyperCandleLayer = () => {
    const draw = useCallback((ctx: CanvasRenderingContext2D, { data, scales }: any) => {
        if (!scales) return;

        const { x, y, candleWidth } = scales;

        // Batched Path Drawing for Performance? 
        // Gradient fill requires per-candle drawing usually, or clipping.
        // Let's do per-candle for visual fidelity first.

        data.forEach((d: any, i: number) => {
            const isUp = d.close >= d.open;
            const top = Math.max(d.open, d.close);
            const bot = Math.min(d.open, d.close);
            const high = d.high;
            const low = d.low;

            const px = x(i);
            const pyTop = y(top);
            const pyBot = y(bot);
            const pyHigh = y(high);
            const pyLow = y(low);
            const bodyH = Math.max(pyBot - pyTop, 1);

            // Colors
            // Up: #00ff9d (Neon Mint) -> #00cc7d
            // Down: #ff0055 (Neon Rose) -> #cc0044

            const colorTop = isUp ? "#00FFA3" : "#FF0055";
            const colorBot = isUp ? "#00CC83" : "#CC0044";

            // Optimization: Skip if offscreen (todo)

            // Wick
            ctx.strokeStyle = colorBot; // Slightly darker for wick
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(px, pyHigh);
            ctx.lineTo(px, pyLow);
            ctx.stroke();

            // Body Gradient
            const grad = ctx.createLinearGradient(0, pyTop, 0, pyBot);
            grad.addColorStop(0, colorTop);
            grad.addColorStop(1, colorBot);

            ctx.fillStyle = grad;

            // "Cyber-Block" look: 
            // Slight gloss? 
            ctx.fillRect(px - candleWidth / 2, pyTop, candleWidth, bodyH);

            // Neural Glow (High Volume?)
            // We need maxVol in context to scale. Assuming d.volume relative...
            // Simple logic: if previous candle engulfed?

            // Optional: Border for sharpness
            // ctx.strokeRect(px - candleWidth / 2, pyTop, candleWidth, bodyH);
        });
    }, []);

    return <ChartLayer zIndex={10} draw={draw} />;
};
