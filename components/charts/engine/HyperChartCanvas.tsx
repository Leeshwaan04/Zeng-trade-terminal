"use client";

import React, { useEffect, useState } from "react";
import { ChartEngine } from "./ChartEngine";
import { HyperCandleLayer } from "./HyperCandleLayer";
import { IndicatorLayer, IndicatorConfig } from "./IndicatorLayer";
import { DrawingLayer } from "./DrawingLayer";
import { Drawing } from "@/types/drawing";
import { ChartLayer } from "./ChartEngine";
import { SmartZoneLayer } from "./SmartZoneLayer";

// Minimal Grid Layer
const HyperGridLayer = () => {
    const draw = (ctx: CanvasRenderingContext2D, { width, height, scales }: any) => {
        if (!scales) return;
        const { MARGIN } = scales;

        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;

        // Horizontals (Price)
        const steps = 8;
        const stepH = (height - MARGIN.top - MARGIN.bottom) / steps;
        for (let i = 0; i <= steps; i++) {
            const y = MARGIN.top + i * stepH;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
        }
    };
    return <ChartLayer zIndex={1} draw={draw} />;
};

const HyperCrosshairLayer = () => {
    const draw = (ctx: CanvasRenderingContext2D, { width, height, mouse, scales }: any) => {
        if (!mouse || !scales) return;
        const { x, y } = mouse;
        const { MARGIN } = scales;

        // Clamp
        if (x < 0 || x > width || y < 0 || y > height) return;

        ctx.strokeStyle = "rgba(0, 229, 255, 0.5)"; // Neon Cyan
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;

        // V
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
        // H
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();

        ctx.setLineDash([]);

        // Price Label
        const price = scales.priceFromY(y);
        const lbl = price.toFixed(2);
        ctx.fillStyle = "#00E5FF";
        ctx.fillRect(width - 60, y - 10, 60, 20);
        ctx.fillStyle = "#000";
        ctx.font = "bold 10px monospace";
        ctx.fillText(lbl, width - 55, y + 4);
    };
    return <ChartLayer zIndex={50} draw={draw} />;
};


export const HyperChartCanvas = ({ symbol }: { symbol: string }) => {
    // Determine data source (mock for now or from store)
    const [data, setData] = useState<any[]>([]);

    // Default Indicators
    const indicators: IndicatorConfig[] = [
        { id: "sma-20", type: "SMA", period: 20, color: "#FFA500", lineWidth: 2 }, // Orange
        { id: "ema-9", type: "EMA", period: 9, color: "#00E5FF", lineWidth: 2 },   // Cyan
    ];

    // Mock Drawings
    const mockDrawings: Drawing[] = [
        {
            id: "d1", type: "TRENDLINE",
            points: [{ index: 10, price: 21950 }, { index: 40, price: 22050 }],
            style: { color: "#FFFF00", lineWidth: 2, lineStyle: "dashed" }
        },
        {
            id: "d2", type: "RECTANGLE",
            points: [{ index: 60, price: 22100 }, { index: 80, price: 21900 }],
            style: { color: "#FF00FF", lineWidth: 1, fillColor: "rgba(255, 0, 255, 0.1)" }
        }
    ];

    useEffect(() => {
        // Fetch logic... reusing existing API or store?
        // Let's standard fetch for now to test engine
        const fetchHistory = async () => {
            // Mock Data Generator if API fails or for demo
            const now = Date.now();
            let price = 22000;
            const candles = [];
            for (let i = 0; i < 100; i++) {
                const open = price;
                const close = price + (Math.random() - 0.5) * 100;
                const high = Math.max(open, close) + Math.random() * 20;
                const low = Math.min(open, close) - Math.random() * 20;
                candles.push({ time: now + i * 60000, open, high, low, close, volume: Math.random() * 1000 });
                price = close;
            }
            setData(candles);
        };
        fetchHistory();
    }, [symbol]);

    return (
        <ChartEngine data={data}>
            <HyperGridLayer />
            <SmartZoneLayer showZones={true} showFVG={true} />
            <HyperCandleLayer />
            <IndicatorLayer indicators={indicators} />
            <DrawingLayer drawings={mockDrawings} />
            <HyperCrosshairLayer />
            {/* Future: SmartZonesLayer, OrderLayer */}
        </ChartEngine>
    );
};
