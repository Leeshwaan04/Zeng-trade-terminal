"use client";

import React, { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, IChartApi, ISeriesApi, CandlestickData } from "lightweight-charts";
import { KiteDatafeed, getIntervalSeconds, lookbackFrom } from "@/lib/charting/Datafeed";
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
    const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

    // Get live data from market store
    const lastTick = useMarketStore((s) => s.tickers[symbol]);

    // ── Chart Initialization ─────────────────────────────────
    useEffect(() => {
        const container = chartContainerRef.current;
        if (!container) return;

        // Detect current theme colors from CSS variables
        const style = getComputedStyle(document.documentElement);
        const isLight = document.documentElement.classList.contains("light");
        const isDark = !isLight;
        const bg = isDark ? "#0a0f1a" : "#ffffff";
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
            setLoadState("loading");
            try {
                const now = Date.now();
                const from = lookbackFrom(interval); // interval-aware: 10d for 1m, 365d for 1D, 3yr for 1W
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
                        setLoadState("ready");
                    } else {
                        setLoadState("error");
                    }
                } else {
                    setLoadState("error");
                }
            } catch (e) {
                console.error("[KiteLiteChart] Historical data load error:", e);
                setLoadState("error");
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

        const intervalSeconds = getIntervalSeconds(interval);

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

    return (
        <div className="relative w-full h-full">
            <div ref={chartContainerRef} className="w-full h-full" />
            {loadState === "loading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0a0f1a]/70 pointer-events-none">
                    <span className="text-xs text-slate-400 animate-pulse">Loading {symbol}…</span>
                </div>
            )}
            {loadState === "error" && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0a0f1a]/70 pointer-events-none">
                    <span className="text-xs text-red-400">No data for {symbol} — check connection or login</span>
                </div>
            )}
        </div>
    );
};
