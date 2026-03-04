"use client";

import React, { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ISeriesApi, CandlestickData } from "lightweight-charts";
import { KiteDatafeed, ChartCandle } from "@/lib/charting/Datafeed";
import { useMarketStore } from "@/hooks/useMarketStore";
import { getInstrumentToken } from "@/lib/market-config";

interface KiteLiteChartProps {
    symbol: string;
    interval: string;
}

export const KiteLiteChart = ({ symbol, interval }: KiteLiteChartProps) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const datafeedRef = useRef<KiteDatafeed | null>(null);

    // Get live data from market store
    const lastTick = useMarketStore((s) => s.tickers[symbol]);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Initialize Chart
        chartRef.current = createChart(chartContainerRef.current, {
            layout: {
                background: { color: "#000000" },
                textColor: "#d1d5db",
            },
            grid: {
                vertLines: { color: "#1a1a1a" },
                horzLines: { color: "#1a1a1a" },
            },
            crosshair: {
                mode: 0, // CrosshairMode.Normal
                vertLine: { color: "#00E5FF", width: 1, style: 2 },
                horzLine: { color: "#00E5FF", width: 1, style: 2 },
            },
            timeScale: {
                borderColor: "#333",
                timeVisible: true,
            },
        });

        // Add Candlestick Series
        seriesRef.current = (chartRef.current as any).addCandlestickSeries({
            upColor: "#4ade80",
            downColor: "#f87171",
            borderVisible: false,
            wickUpColor: "#4ade80",
            wickDownColor: "#f87171",
        });

        // Set Initial History
        const datafeed = new KiteDatafeed(symbol, interval);
        datafeedRef.current = datafeed;

        const loadData = async () => {
            const now = Date.now();
            const from = now - 30 * 24 * 60 * 60 * 1000; // 30 days
            const bars = await datafeed.getHistory(from, now);
            if (seriesRef.current && bars.length > 0) {
                // Filter invalid and deduplicate
                const uniqueBars = Array.from(new Map(bars.filter(b => !isNaN(b.time) && !isNaN(b.close)).map(b => [b.time, b])).values())
                    .sort((a, b) => a.time - b.time) as CandlestickData[];

                if (uniqueBars.length > 0) {
                    try {
                        seriesRef.current.setData(uniqueBars);
                        chartRef.current?.timeScale().fitContent();

                        // Set the initial currentBarRef to the last historical bar to prevent time crashes
                        currentBarRef.current = uniqueBars[uniqueBars.length - 1];
                    } catch (e) {
                        console.error("[KiteLiteChart] lightweight-charts setData crash:", e);
                    }
                }
            }
        };

        loadData();

        // Responsive
        const handleResize = () => {
            chartRef.current?.applyOptions({
                width: chartContainerRef.current?.clientWidth,
                height: chartContainerRef.current?.clientHeight,
            });
        };
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            chartRef.current?.remove();
        };
    }, [symbol, interval]);

    // Update real-time from store with Candle Aggregation
    const currentBarRef = useRef<CandlestickData | null>(null);

    useEffect(() => {
        if (lastTick && seriesRef.current) {
            const now = Date.now();
            const intervalSeconds = interval.includes("minute") ? parseInt(interval) * 60 : 86400;
            let barTime = (Math.floor(now / (intervalSeconds * 1000)) * intervalSeconds) as any;
            const price = lastTick.last_price;

            if (!price) return;

            // Ensure we never update a bar in the past (Lightweight charts throws an error)
            if (currentBarRef.current && barTime < currentBarRef.current.time) {
                barTime = currentBarRef.current.time; // snap to current bar to just update its close price
            }

            if (!currentBarRef.current || currentBarRef.current.time !== barTime) {
                // New Bar
                currentBarRef.current = {
                    time: barTime,
                    open: price,
                    high: price,
                    low: price,
                    close: price,
                };
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
                console.error("[KiteLiteChart] Live Update Error:", error);
            }
        }
    }, [lastTick, interval]);

    return <div ref={chartContainerRef} className="w-full h-full" />;
};
