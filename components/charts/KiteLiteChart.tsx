"use client";

import React, { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, IChartApi, ISeriesApi, CandlestickData } from "lightweight-charts";
import { KiteDatafeed } from "@/lib/charting/Datafeed";
import { useMarketStore } from "@/hooks/useMarketStore";

interface KiteLiteChartProps {
    symbol: string;
    interval: string;
}

export const KiteLiteChart = ({ symbol, interval }: KiteLiteChartProps) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const currentBarRef = useRef<CandlestickData | null>(null);

    // Get live data from market store
    const lastTick = useMarketStore((s) => s.tickers[symbol]);

    // ── Chart Initialization ─────────────────────────────────
    useEffect(() => {
        const container = chartContainerRef.current;
        if (!container) return;

        // Detect current theme colors from CSS variables
        const style = getComputedStyle(document.documentElement);
        const isDark = document.documentElement.classList.contains("dark");
        const bg = isDark ? "#0a0f1a" : "#f8fafc";
        const textColor = isDark ? "#94a3b8" : "#475569";
        const gridColor = isDark ? "#1e293b" : "#e2e8f0";

        const chart = createChart(container, {
            layout: {
                background: { color: bg },
                textColor,
                fontFamily: "'JetBrains Mono', 'Inter', monospace",
            },
            grid: {
                vertLines: { color: gridColor },
                horzLines: { color: gridColor },
            },
            crosshair: {
                mode: 0, // CrosshairMode.Normal
                vertLine: { color: "#6366f1", width: 1, style: 2 },
                horzLine: { color: "#6366f1", width: 1, style: 2 },
            },
            timeScale: {
                borderColor: gridColor,
                timeVisible: true,
                secondsVisible: false,
            },
            rightPriceScale: {
                borderColor: gridColor,
            },
            width: container.clientWidth,
            height: container.clientHeight,
        });

        chartRef.current = chart;

        // ── v5 API: addSeries(CandlestickSeries, opts) ────────
        const series = chart.addSeries(CandlestickSeries, {
            upColor: "#22c55e",
            downColor: "#ef4444",
            borderVisible: false,
            wickUpColor: "#22c55e",
            wickDownColor: "#ef4444",
        });

        seriesRef.current = series;

        // ── Load Historical Data ──────────────────────────────
        const datafeed = new KiteDatafeed(symbol, interval);
        const loadData = async () => {
            try {
                const now = Date.now();
                const from = now - 30 * 24 * 60 * 60 * 1000; // 30 days
                const bars = await datafeed.getHistory(from, now);

                if (bars.length > 0) {
                    const uniqueBars = Array.from(
                        new Map(
                            bars
                                .filter((b) => !isNaN(b.time as number) && !isNaN(b.close))
                                .map((b) => [b.time, b])
                        ).values()
                    ).sort((a, b) => (a.time as number) - (b.time as number)) as CandlestickData[];

                    if (uniqueBars.length > 0) {
                        series.setData(uniqueBars);
                        chart.timeScale().fitContent();
                        currentBarRef.current = uniqueBars[uniqueBars.length - 1];
                    }
                }
            } catch (e) {
                console.error("[KiteLiteChart] Historical data load error:", e);
            }
        };

        loadData();

        // ── Responsive Resize ─────────────────────────────────
        const ro = new ResizeObserver(() => {
            if (!container) return;
            chart.applyOptions({
                width: container.clientWidth,
                height: container.clientHeight,
            });
        });
        ro.observe(container);

        return () => {
            ro.disconnect();
            chart.remove();
            chartRef.current = null;
            seriesRef.current = null;
            currentBarRef.current = null;
        };
    }, [symbol, interval]);

    // ── Real-Time Tick Updates ─────────────────────────────────
    useEffect(() => {
        if (!lastTick || !seriesRef.current) return;

        const price = lastTick.last_price;
        if (!price) return;

        const intervalSeconds = interval.includes("minute")
            ? parseInt(interval) * 60
            : 86400;

        let barTime = (Math.floor(Date.now() / (intervalSeconds * 1000)) * intervalSeconds) as any;

        // Never go backwards in time (lightweight-charts throws)
        if (currentBarRef.current && barTime < (currentBarRef.current.time as number)) {
            barTime = currentBarRef.current.time;
        }

        if (!currentBarRef.current || currentBarRef.current.time !== barTime) {
            // New bar
            currentBarRef.current = { time: barTime, open: price, high: price, low: price, close: price };
        } else {
            // Update existing bar
            currentBarRef.current = {
                ...currentBarRef.current,
                high: Math.max(currentBarRef.current.high, price),
                low: Math.min(currentBarRef.current.low, price),
                close: price,
            };
        }

        try {
            seriesRef.current.update(currentBarRef.current);
        } catch (error) {
            console.error("[KiteLiteChart] Live tick update error:", error);
        }
    }, [lastTick, interval]);

    return <div ref={chartContainerRef} className="w-full h-full" />;
};
