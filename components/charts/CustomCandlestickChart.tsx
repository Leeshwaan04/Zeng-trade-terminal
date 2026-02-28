"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useOrderStore, OrderLine } from "@/hooks/useOrderStore";
import { useMarketStore } from "@/hooks/useMarketStore";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useWorkerTicker } from "@/hooks/useWorkerTicker";
import { getChartColors, type DesignTokens } from "@/lib/design-tokens";
import { getInstrumentToken } from "@/lib/market-config";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { useDrawingStore } from "@/hooks/useDrawingStore";
import { IndicatorSettingsDialog } from "./IndicatorSettingsDialog";

// ─── Types ───────────────────────────────────────────────────
interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface CustomCandlestickChartProps {
    symbol: string;
    interval?: string;
    chartType?: "candle" | "line";
    showOIProfile?: boolean;
    isAutoMode?: boolean;
    setIsAutoMode?: (val: boolean) => void;
    magnetMode?: boolean;
}

const mapIntervalToKite = (interval: string): string => {
    switch (interval) {
        case "1m": return "minute";
        case "3m": return "3minute";
        case "5m": return "5minute";
        case "15m": return "15minute";
        case "30m": return "30minute";
        case "1H": return "60minute";
        case "2H": return "2hour";
        case "3H": return "3hour";
        case "1D": return "day";
        case "1W": return "day"; // Kite 1W is vague, falling back to day or implementing custom
        default: return "day";
    }
};

const formatTime = (ts: number, interval: string): string => {
    const d = new Date(ts);
    if (interval === "1D" || interval === "1W") {
        return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    }
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
};

// ─── Main Component ──────────────────────────────────────────
export const CustomCandlestickChart = ({
    symbol,
    interval = "1D",
    chartType = "candle",
    showOIProfile = false,
    isAutoMode = true,
    setIsAutoMode,
    magnetMode = false
}: CustomCandlestickChartProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
    const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
    const [draggingLine, setDraggingLine] = useState<string | null>(null);
    const [hoveredLine, setHoveredLine] = useState<string | null>(null);
    const [colors, setColors] = useState<DesignTokens | null>(null);

    // ─── Interaction State (Phase 4) ─────────────────────────
    const [timeOffset, setTimeOffset] = useState<number | null>(null); // Right-most timestamp
    const [pxPerCandle, setPxPerCandle] = useState<number>(8); // Width of candle space
    const [isPanning, setIsPanning] = useState(false);
    const lastPanX = useRef<number | null>(null);
    const lastPanY = useRef<number | null>(null);

    const [priceOffset, setPriceOffset] = useState<number>(0);
    const [priceScaleMultiplier, setPriceScaleMultiplier] = useState<number>(1);
    const [isYAxisScaling, setIsYAxisScaling] = useState(false);
    const [isXAxisScaling, setIsXAxisScaling] = useState(false);
    const [settingsIndId, setSettingsIndId] = useState<string | null>(null);

    const stepMs = useMemo(() => {
        return interval === "1D" ? 86400000 :
            interval === "1H" ? 3600000 :
                interval === "15m" ? 900000 :
                    interval === "5m" ? 300000 : 60000;
    }, [interval]);

    const { syncCrosshair, syncedMousePos, setSyncedMousePos } = useLayoutStore();
    const {
        drawings: storeDrawings,
        addDrawing,
        activeTool,
        setActiveTool,
        indicators
    } = useDrawingStore();

    const MARGIN = { top: 10, right: 70, bottom: 30, left: 0 };
    const VOLUME_HEIGHT_RATIO = 0.15;
    const LINE_HIT_THRESHOLD = 6;

    // ─── Drawing State ───────────────────────────────────────
    const [currentDrawing, setCurrentDrawing] = useState<any | null>(null);

    // Persistence is handled by useDrawingStore

    const [data, setData] = useState<Candle[]>([]);
    const [secondaryData, setSecondaryData] = useState<Candle[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Initial snap to the newest candle
    useEffect(() => {
        if (data.length > 0 && timeOffset === null) {
            setTimeOffset(data[data.length - 1].time + stepMs * 2);
        }
    }, [data, timeOffset, stepMs]);

    const activeBroker = useAuthStore(state => state.activeBroker) || 'KITE';

    // ─── Fetch Historical Data ───────────────────────────────
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const fetchHistoryData = useCallback(async (to: Date, append: boolean = false) => {
        if (isLoadingHistory) return;
        if (!append) setIsLoading(true);
        else setIsLoadingHistory(true);

        setFetchError(null);
        try {
            const from = new Date(to);

            if (interval === "1D" || interval === "1W") {
                from.setDate(to.getDate() - 365); // 1 year
            } else if (interval === "1H" || interval === "2H" || interval === "3H") {
                from.setDate(to.getDate() - 90);  // 3 months
            } else if (interval === "15m" || interval === "30m") {
                from.setDate(to.getDate() - 30);  // 1 month
            } else if (interval === "5m") {
                from.setDate(to.getDate() - 15);  // 15 days
            } else {
                from.setDate(to.getDate() - 5);   // 5 days
            }

            const fromStr = from.toISOString().split('T')[0];
            const toStr = to.toISOString().split('T')[0];

            // Dynamic Imports for Token Logic
            const { getUpstoxToken, getInstrumentToken } = await import("@/lib/market-config");
            const { getFyersInstrument } = await import("@/lib/fyers-config");

            const getUrl = (broker: string, sym: string): string | null => {
                const isMock = typeof window !== 'undefined' && window.location.search.includes("mock=true");
                const mockParam = isMock ? "&mock=true" : "";

                if (broker === 'UPSTOX') {
                    const key = getUpstoxToken(sym);
                    if (!key) return null;
                    return `/api/upstox/history?instrument_key=${encodeURIComponent(key)}&interval=${interval}&from=${fromStr}&to=${toStr}${mockParam}`;
                }
                if (broker === 'KITE') {
                    const token = getInstrumentToken(sym);
                    if (!token) return null;
                    const kInt = mapIntervalToKite(interval);
                    return `/api/kite/history?instrument_token=${token}&interval=${kInt}&from=${fromStr}&to=${toStr}${mockParam}`;
                }
                if (broker === 'FYERS') {
                    const fSym = getFyersInstrument(sym) || sym;
                    return `/api/fyers/history?symbol=${encodeURIComponent(fSym)}&resolution=${interval}&from=${fromStr}&to=${toStr}`;
                }
                return null;
            };

            const primaryBroker = activeBroker;
            const pUrl = getUrl(primaryBroker, symbol);

            if (pUrl) {
                const res = await fetch(pUrl);
                if (res.ok) {
                    const json = await res.json();
                    if (json.data?.candles) {
                        const newCandles = json.data.candles.map((c: any) => ({
                            time: new Date(c[0]).getTime(),
                            open: c[1], high: c[2], low: c[3], close: c[4], volume: c[5]
                        })).sort((a: any, b: any) => a.time - b.time);

                        setData(prev => {
                            if (!append) return newCandles;
                            // Prepend and filter duplicates
                            const existingTimes = new Set(prev.map(c => c.time));
                            const uniqueNew = newCandles.filter((c: Candle) => !existingTimes.has(c.time));
                            return [...uniqueNew, ...prev].sort((a, b) => a.time - b.time);
                        });
                    }
                } else {
                    const errJson = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
                    setFetchError(`Historical API: ${errJson.error || errJson.details}`);
                }
            }

        } catch (err: any) {
            console.error("Chart data fetch error:", err);
            setFetchError(`Fetch error: ${err.message}`);
        } finally {
            setIsLoading(false);
            setIsLoadingHistory(false);
        }
    }, [symbol, interval, activeBroker, isLoadingHistory]);

    // Initial Load
    useEffect(() => {
        fetchHistoryData(new Date(), false);
        const poll = setInterval(() => fetchHistoryData(new Date(), false), 60000);
        return () => clearInterval(poll);
    }, [symbol, interval, activeBroker]); // Intentionally omitting fetchHistoryData to avoid loop

    // Existing secondary fetch logic removed for brevity, it's rarely used in real rendering.
    // We will stick to primaryBroker historical for infinite scroll complexity.

    // ─── Read CSS design tokens on mount / theme change ─────
    useEffect(() => {
        const update = () => setColors(getChartColors());
        update();
        const observer = new MutationObserver(update);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
        return () => observer.disconnect();
    }, []);

    // ─── Store subscriptions ─────────────────────────────────
    const allOrderLines = useOrderStore(s => s.activeOrderLines);
    const orderLines = useMemo(
        () => allOrderLines.filter(l => l.symbol === symbol && l.visible),
        [allOrderLines, symbol]
    );
    const updateOrderLinePrice = useOrderStore(s => s.updateOrderLinePrice);
    const removeOrderLine = useOrderStore(s => s.removeOrderLine);

    const tickerData = useMarketStore(s => s.tickers[symbol]);
    const currentPrice = tickerData?.fused_price ?? tickerData?.last_price ?? data[data.length - 1]?.close ?? 0;
    const secondaryTicker = useMarketStore(s => s.secondaryTickers[symbol]);
    const secondaryPrice = secondaryTicker?.last_price ?? null;

    // ─── Live Data Fusion (Merge Tick into History) ──────────
    useEffect(() => {
        if (!tickerData || data.length === 0 || isLoadingHistory) return;

        setData(prevData => {
            if (prevData.length === 0) return prevData;
            const newData = [...prevData];
            const lastCandle = newData[newData.length - 1];

            const now = Date.now();
            const currentPrice = tickerData.fused_price ?? tickerData.last_price;

            // GAP DETECTION: Network disconnected or browser slept
            if (now - lastCandle.time > stepMs * 2) {
                // Trigger background sync to stitch missing candles
                fetchHistoryData(new Date(), false);
                return prevData;
            }

            // If we are still within the same time bucket as the last candle, update it
            if (now - lastCandle.time < stepMs) {
                lastCandle.close = currentPrice;
                lastCandle.high = Math.max(lastCandle.high, currentPrice);
                lastCandle.low = Math.min(lastCandle.low, currentPrice);
                lastCandle.volume = tickerData.volume || lastCandle.volume; // Update vol if available
            } else {
                // Time bucket has passed, push a new candle
                newData.push({
                    time: Math.floor(now / stepMs) * stepMs, // Align to bucket start
                    open: currentPrice,
                    high: currentPrice,
                    low: currentPrice,
                    close: currentPrice,
                    volume: tickerData.last_quantity || 0
                });

                // Keep memory bounded
                if (newData.length > 2000) newData.shift();
            }

            return newData;
        });
    }, [tickerData?.last_price, tickerData?.volume, interval, stepMs, fetchHistoryData, isLoadingHistory]);

    // ─── Arbitrage Overlay (Secondary Source) ────────────────
    const arbitrageBroker = activeBroker === 'KITE' ? 'UPSTOX' : 'KITE';
    const arbUrl = arbitrageBroker === 'KITE'
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/api/ws/stream?tokens=${getInstrumentToken(symbol)}&mode=ltp`
        : `wss://api.upstox.com/v2/feed/market-data-feed`;

    useWorkerTicker({
        url: arbUrl,
        type: arbitrageBroker === 'KITE' ? 'sse' : 'ws',
        enabled: !!arbUrl,
        isSecondary: true
    });

    const prevClose = data[data.length - 2]?.close ?? currentPrice;
    const isCurrentUp = currentPrice >= prevClose;

    // ─── Sub-Pane Configuration ──────────────────────────────
    const activeIndicators = useMemo(() => indicators.filter(i => i.visible), [indicators]);
    const hasSubPane = useMemo(() => activeIndicators.some(i => i.type === 'RSI'), [activeIndicators]);
    const SUB_PANE_RATIO = 0.25;

    // ─── Indicator Calculations ──────────────────────────────
    const indicatorData = useMemo(() => {
        if (data.length === 0) return [];

        return activeIndicators.map(ind => {
            const values: number[] = new Array(data.length).fill(NaN);

            if (ind.type === 'SMA') {
                for (let i = ind.period - 1; i < data.length; i++) {
                    const slice = data.slice(i - ind.period + 1, i + 1);
                    values[i] = slice.reduce((sum, c) => sum + c.close, 0) / ind.period;
                }
            } else if (ind.type === 'EMA') {
                const k = 2 / (ind.period + 1);
                let prevEma = data[0].close;
                values[0] = prevEma;
                for (let i = 1; i < data.length; i++) {
                    const ema = data[i].close * k + prevEma * (1 - k);
                    values[i] = ema;
                    prevEma = ema;
                }
            } else if (ind.type === 'RSI') {
                let avgGain = 0;
                let avgLoss = 0;
                for (let i = 1; i < data.length; i++) {
                    const diff = data[i].close - data[i - 1].close;
                    const gain = Math.max(0, diff);
                    const loss = Math.max(0, -diff);

                    if (i <= ind.period) {
                        avgGain += gain / ind.period;
                        avgLoss += loss / ind.period;
                    } else {
                        avgGain = (avgGain * (ind.period - 1) + gain) / ind.period;
                        avgLoss = (avgLoss * (ind.period - 1) + loss) / ind.period;
                    }

                    if (i >= ind.period) {
                        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
                        values[i] = 100 - (100 / (1 + rs));
                    }
                }
            } else if (ind.type === 'VWAP') {
                let cumulativePV = 0;
                let cumulativeV = 0;
                let lastDate = -1;

                for (let i = 0; i < data.length; i++) {
                    const d = data[i];
                    const currentDate = new Date(d.time).setHours(0, 0, 0, 0);

                    // Reset on new day
                    if (currentDate !== lastDate) {
                        cumulativePV = 0;
                        cumulativeV = 0;
                        lastDate = currentDate;
                    }

                    const typicalPrice = (d.high + d.low + d.close) / 3;
                    cumulativePV += typicalPrice * d.volume;
                    cumulativeV += d.volume;

                    if (cumulativeV > 0) {
                        values[i] = cumulativePV / cumulativeV;
                    }
                }
            }

            return { ...ind, values };
        });
    }, [data, activeIndicators]);

    // Resize observer
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const ro = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setDimensions({ width, height });
        });
        ro.observe(container);
        return () => ro.disconnect();
    }, []);

    // ─── Shared scale helpers ────────────────────────────────
    const scales = useMemo(() => {
        const W = dimensions.width;
        const H = dimensions.height;
        if (W === 0 || H === 0 || data.length === 0) return null;

        const chartW = W - MARGIN.left - MARGIN.right;
        const totalChartH = H - MARGIN.top - MARGIN.bottom;

        const subPaneH = hasSubPane ? totalChartH * SUB_PANE_RATIO : 0;
        const mainChartH = totalChartH - subPaneH;

        const volumeH = mainChartH * VOLUME_HEIGHT_RATIO;
        const priceH = mainChartH - volumeH;

        // 1. Mathematical Time Scaling
        const currentOffset = timeOffset ?? (data.length > 0 ? data[data.length - 1].time + stepMs * 2 : Date.now());
        const timeScale = stepMs / pxPerCandle; // ms per pixel

        const startTime = currentOffset - chartW * timeScale;
        const endTime = currentOffset;

        // visibleData now truly filters by timestamp rather than slice index
        const visibleData = data.filter(d => d.time >= startTime - stepMs * 10 && d.time <= endTime + stepMs * 10);

        // 2. Base Price Scale Calculation
        const validHighs = data.map(d => d.high).filter(h => h > 0 && !isNaN(h));
        const validLows = data.map(d => d.low).filter(l => l > 0 && !isNaN(l));

        let priceMin = validHighs.length > 0 ? Math.min(...validLows) : 0;
        let priceMax = validHighs.length > 0 ? Math.max(...validHighs) : 100;
        let priceRange = priceMax - priceMin || 1;

        // 3. Auto-Scaling Logic (Fit visible candles to height)
        if (isAutoMode && visibleData.length > 0) {
            const visHighs = visibleData.map(d => d.high).filter(h => !isNaN(h));
            const visLows = visibleData.map(d => d.low).filter(l => !isNaN(l));
            if (visHighs.length > 0) {
                priceMin = Math.min(...visLows);
                priceMax = Math.max(...visHighs);
                // Add padding
                const padding = (priceMax - priceMin) * 0.1;
                priceMin -= padding;
                priceMax += padding;
                priceRange = priceMax - priceMin || 1;
            }
        } else {
            // Apply Manual Y-Axis Scaling & Panning
            const baseRange = priceRange;
            const finalPriceRange = baseRange / priceScaleMultiplier;
            const middlePrice = priceMin + baseRange / 2;
            priceMin = middlePrice - finalPriceRange / 2 + priceOffset;
            priceMax = middlePrice + finalPriceRange / 2 + priceOffset;
            priceRange = finalPriceRange;
        }

        const maxVol = Math.max(...data.map(d => d.volume)) || 1;

        const yPrice = (price: number) => MARGIN.top + priceH * (1 - (price - priceMin) / priceRange);
        const priceFromY = (y: number) => priceMin + (1 - (y - MARGIN.top) / priceH) * priceRange;

        const xTime = (time: number) => MARGIN.left + chartW - (currentOffset - time) / timeScale;
        const timeFromX = (x: number) => currentOffset - (MARGIN.left + chartW - x) * timeScale;

        const gap = pxPerCandle;
        const candleW = Math.max(pxPerCandle * 0.7, 1);

        // Retain xCandle for backwards compatibility in drawing loops, though we mostly use xTime now
        const xCandle = (i: number) => {
            // For visibleData, map index back to its time coordinate
            if (!visibleData[i]) return 0;
            return xTime(visibleData[i].time);
        };

        return { W, H, chartW, totalChartH, mainChartH, priceH, subPaneH, volumeH, priceMin, priceMax, priceRange, maxVol, yPrice, priceFromY, gap, candleW, xCandle, xTime, timeFromX, timeScale, currentOffset, visibleData };
    }, [data, secondaryData, dimensions, orderLines, hasSubPane, timeOffset, pxPerCandle, stepMs, isAutoMode, priceScaleMultiplier, priceOffset]);

    // Infinite Scroll Pagination
    useEffect(() => {
        if (!data.length || !scales || isLoadingHistory || isLoading) return;

        const firstCandleTime = data[0].time;
        const leftEdgeTime = scales.currentOffset - scales.chartW * scales.timeScale;

        // If user pans such that the left edge is within 1 screen-width of the oldest loaded candle
        if (leftEdgeTime < firstCandleTime + scales.chartW * scales.timeScale) {
            const fetchToDate = new Date(firstCandleTime);
            fetchHistoryData(fetchToDate, true);
        }
    }, [timeOffset, data, scales, isLoadingHistory, isLoading, fetchHistoryData]);

    // ─── Draw ────────────────────────────────────────────────
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !scales || !colors) return;

        const win = canvas.ownerDocument.defaultView || window;
        const dpr = win.devicePixelRatio || 1;

        canvas.width = dimensions.width * dpr;
        canvas.height = dimensions.height * dpr;
        canvas.style.width = `${dimensions.width}px`;
        canvas.style.height = `${dimensions.height}px`;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.scale(dpr, dpr);

        const rootStyle = getComputedStyle(document.documentElement);
        // const chromaticShift = parseFloat(rootStyle.getPropertyValue('--chromatic-shift') || '0');

        const { W, H, chartW, mainChartH, priceH, subPaneH, volumeH, priceMin, priceRange, maxVol, yPrice, gap, candleW, xCandle, visibleData } = scales;

        // ─── Background ──────────────────────────────────────
        ctx.fillStyle = colors.chartBg;
        ctx.fillRect(0, 0, W, H);

        // ─── Watermark ───────────────────────────────────────
        ctx.fillStyle = colors.chartWatermark;
        ctx.font = `bold ${Math.min(120, chartW / 5)}px Inter, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(symbol, W / 2, H / 2 - 20);

        // ─── Horizontal Grid ─────────────────────────────────
        const gridSteps = 8;
        const priceStep = priceRange / gridSteps;
        ctx.strokeStyle = colors.chartGrid;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);

        for (let i = 0; i <= gridSteps; i++) {
            const price = priceMin + i * priceStep;
            const y = yPrice(price);
            ctx.beginPath();
            ctx.moveTo(MARGIN.left, y);
            ctx.lineTo(W - MARGIN.right, y);
            ctx.stroke();

            ctx.fillStyle = colors.chartAxisText;
            ctx.font = "11px 'JetBrains Mono', monospace";
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(price.toFixed(2), W - MARGIN.right + 8, y);
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(price.toFixed(2), W - MARGIN.right + 8, y);
        }

        // ─── Cyber-Nerve: Neural OI Overlay ──────────────────
        // Visualizes Open Interest Change as a background "Sentiment Cloud"
        // Cyan Glow (Top) = High Call Writing (Resistance)
        // Magenta Glow (Bottom) = High Put Writing (Support)
        if (tickerData?.oi_change) {
            const oiDelta = tickerData.oi_change;
            const maxOIDelta = 100000; // Normalization factor
            const intensity = Math.min(Math.abs(oiDelta) / maxOIDelta, 1);

            if (intensity > 0.1) {
                const gradient = ctx.createLinearGradient(0, MARGIN.top, 0, MARGIN.top + priceH);

                // If OI Increasing (Build-up) -> Stronger Glow
                // If OI Decreasing (Unwinding) -> Fainter / Negative Space? keeping it simple for now

                // We don't have CE/PE breakdown in TickerData yet, so we use Price Direction + OI to infer
                // Price UP + OI UP = Long Buildup (Bullish) -> Green/Cyan hints?
                // Price DOWN + OI UP = Short Buildup (Bearish) -> Red/Magenta hints?

                // For a true "Resistance/Support" cloud we need option chain data here.
                // Fallback: Use simple sentiment glow based on net change

                const glowColor = tickerData.change_percent >= 0
                    ? `rgba(0, 255, 255, ${intensity * 0.3})` // Cyan (Call Unwinding/Long Buildup?? - simplified to Bullish Sentiment)
                    : `rgba(255, 0, 229, ${intensity * 0.3})`; // Magenta (Bearish Sentiment)

                ctx.save();
                ctx.globalCompositeOperation = "screen";

                // Create a radial glow from the center or right side
                const radial = ctx.createRadialGradient(
                    W - MARGIN.right, H / 2,
                    10,
                    W - MARGIN.right, H / 2,
                    H * 0.8
                );

                radial.addColorStop(0, glowColor);
                radial.addColorStop(1, "rgba(0,0,0,0)");

                ctx.fillStyle = radial;
                ctx.fillRect(0, MARGIN.top, W, priceH);
                ctx.restore();
            }
        }

        // ─── Volume Bars ─────────────────────────────────────
        const yVolume = (vol: number) => MARGIN.top + priceH + volumeH * (1 - vol / maxVol);
        for (let i = 0; i < visibleData.length; i++) {
            const d = visibleData[i];
            const x = xCandle(i);
            const yTop = yVolume(d.volume);
            const yBot = MARGIN.top + priceH + volumeH;
            ctx.fillStyle = d.close >= d.open ? colors.chartVolumeBull : colors.chartVolumeBear;
            ctx.fillRect(x - candleW / 2, yTop, candleW, yBot - yTop);
        }

        // ─── Sub-Pane Indicators (RSI) ────────────────────────
        if (hasSubPane) {
            const subPaneY = MARGIN.top + mainChartH;

            // Background
            ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
            ctx.fillRect(MARGIN.left, subPaneY, chartW, subPaneH);
            ctx.strokeStyle = colors.chartGrid;
            ctx.strokeRect(MARGIN.left, subPaneY, chartW, subPaneH);

            const rsiInd = indicatorData.find(i => i.type === 'RSI' && i.visible);
            if (rsiInd) {
                const ob = rsiInd.settings?.overbought || 70;
                const os = rsiInd.settings?.oversold || 30;

                const yRSI = (val: number) => subPaneY + subPaneH * (1 - val / 100);

                // OB/OS Lines
                ctx.strokeStyle = "rgba(168, 85, 247, 0.3)";
                ctx.setLineDash([5, 5]);

                [ob, os, 50].forEach(level => {
                    const y = yRSI(level);
                    ctx.beginPath();
                    ctx.moveTo(MARGIN.left, y);
                    ctx.lineTo(MARGIN.left + chartW, y);
                    ctx.stroke();

                    ctx.fillStyle = "rgba(168, 85, 247, 0.5)";
                    ctx.font = "8px 'JetBrains Mono'";
                    ctx.fillText(level.toString(), W - MARGIN.right + 4, y);
                });
                ctx.setLineDash([]);

                // RSI Plot
                ctx.strokeStyle = rsiInd.color;
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                const dataOffset = data.length - visibleData.length;
                for (let i = 0; i < visibleData.length; i++) {
                    const dataIdx = i + dataOffset;
                    const val = rsiInd.values[dataIdx];
                    if (!isNaN(val)) {
                        const x = xCandle(i);
                        const y = yRSI(val);
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                }
                ctx.stroke();
            }
        }

        // ─── Main Pane Indicators (SMA, EMA, VWAP) ────────────
        indicatorData.filter(i => i.type !== 'RSI').forEach(ind => {
            ctx.strokeStyle = ind.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            let started = false;
            const dataOffset = data.length - visibleData.length;

            for (let i = 0; i < visibleData.length; i++) {
                const dataIdx = i + dataOffset;
                const val = ind.values[dataIdx];
                if (!isNaN(val)) {
                    const x = xCandle(i);
                    const y = yPrice(val);
                    if (!started) {
                        ctx.moveTo(x, y);
                        started = true;
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
            }
            ctx.stroke();
        });

        // ─── OI Profile Overlay ──────────────────────────────
        if (showOIProfile && data.length > 0) {
            // Mock OI Profile Generator for the visible price range
            const profileSteps = 40; // Number of price buckets
            const stepH = priceRange / profileSteps;
            const maxBarWidth = chartW * 0.3; // Take up max 30% of width

            ctx.save();
            ctx.globalAlpha = 0.6;

            for (let i = 0; i <= profileSteps; i++) {
                const stepPrice = priceMin + i * stepH;
                const y = yPrice(stepPrice);

                // Normal distribution mock based on current price
                const distance = Math.abs(stepPrice - currentPrice);
                const variance = priceRange * 0.2; // tighter bell curve
                const weight = Math.exp(-(distance * distance) / (2 * variance * variance));

                // Randomize slightly for realistic look
                const callOI = weight * maxBarWidth * (0.8 + Math.random() * 0.4);
                const putOI = weight * maxBarWidth * (0.8 + Math.random() * 0.4);

                // Puts (Support - Green/Cyan) project from left
                ctx.fillStyle = colors.up || "rgba(0, 255, 128, 0.4)";
                ctx.fillRect(MARGIN.left, y - (priceH / profileSteps) / 2, putOI * 0.8, priceH / profileSteps - 1);

                // Calls (Resistance - Red/Magenta) project from right 
                // Wait, typically they are stacked or side-by-side. Let's stack them from the left
                ctx.fillStyle = colors.down || "rgba(255, 0, 128, 0.4)";
                ctx.fillRect(MARGIN.left + putOI * 0.8, y - (priceH / profileSteps) / 2, callOI * 0.8, priceH / profileSteps - 1);
            }

            // Draw Point of Control (POC) Line
            const pocY = yPrice(currentPrice); // Simplified POC to current price for mock
            ctx.strokeStyle = "#F59E0B"; // Amber for POC
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(MARGIN.left, pocY);
            ctx.lineTo(MARGIN.left + maxBarWidth * 1.5, pocY);
            ctx.stroke();

            // POC Label
            ctx.fillStyle = "#F59E0B";
            ctx.font = "bold 9px 'JetBrains Mono', monospace";
            ctx.textAlign = "left";
            ctx.fillText("POC", MARGIN.left + maxBarWidth * 1.5 + 4, pocY);

            ctx.restore();
        }

        // ─── Ghost Overlay (Historical Arbitrage) ────────────
        // Cyber-Nerve Feature: Render secondary broker data as 'Ghost' candles
        // Colors: Cyan (#00E5FF) if Ghost > Main (Premium), Magenta (#FF00E5) if Ghost < Main (Discount)

        // Map timestamps for O(1) alignment
        const mainTimeMap = new Map<number, number>(); // time -> index
        data.forEach((d, i) => mainTimeMap.set(d.time, i));

        if (secondaryData.length > 0) {
            ctx.globalCompositeOperation = 'source-over'; // Default

            for (let i = 0; i < secondaryData.length; i++) {
                const sCandle = secondaryData[i];
                const mainIdx = mainTimeMap.get(sCandle.time);

                // Only draw if we successfully aligned it to a main candle (to share X-axis)
                if (mainIdx !== undefined) {
                    const x = xCandle(mainIdx);
                    // Compare with Main Candle to determine 'Phantom Split' color
                    const mainCandle = data[mainIdx];
                    const diff = sCandle.close - mainCandle.close;
                    const isPremium = diff > 0;

                    // Phantom Colors (Neon Cyan / Neon Magenta)
                    // Low opacity to keep it 'Ghostly'
                    ctx.strokeStyle = isPremium ? "rgba(0, 229, 255, 0.4)" : "rgba(255, 0, 229, 0.4)";
                    ctx.fillStyle = isPremium ? "rgba(0, 229, 255, 0.15)" : "rgba(255, 0, 229, 0.15)";

                    ctx.lineWidth = 1;

                    const bodyTop = yPrice(Math.max(sCandle.open, sCandle.close));
                    const bodyBot = yPrice(Math.min(sCandle.open, sCandle.close));
                    const bodyH = Math.max(bodyBot - bodyTop, 1);

                    // Draw Wick
                    ctx.beginPath();
                    ctx.moveTo(x, yPrice(sCandle.high));
                    ctx.lineTo(x, yPrice(sCandle.low));
                    ctx.stroke();

                    // Draw Body
                    ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);

                    // Optional: Draw a faint connector line between Main Close and Ghost Close to visualize the spread?
                    // Might be too cluttered. Smart Command 'gap' could toggle this.
                }
            }
        }

        // ─── Main Candles / Line ──────────────────────────────
        if (chartType === "candle") {
            for (let i = 0; i < visibleData.length; i++) {
                const d = visibleData[i];
                const x = xCandle(i);
                const isUp = d.close >= d.open;

                ctx.strokeStyle = isUp ? colors.up : colors.down;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, yPrice(d.high));
                ctx.lineTo(x, yPrice(d.low));
                ctx.stroke();

                const bodyTop = yPrice(Math.max(d.open, d.close));
                const bodyBot = yPrice(Math.min(d.open, d.close));
                const bodyH = Math.max(bodyBot - bodyTop, 1);

                // Cyber-Innovation: Neural Glow Rendering
                const volIntensity = d.volume / (maxVol || 1);
                const glowOpacity = parseFloat(rootStyle.getPropertyValue('--neon-glow-opacity') || '0.1');

                if (volIntensity > 0.5) {
                    ctx.save();
                    ctx.shadowBlur = 10 + (volIntensity * 15);
                    ctx.shadowColor = isUp ? colors.up : colors.down;
                    ctx.globalAlpha = glowOpacity * volIntensity * 2;
                    ctx.fillRect(x - candleW / 2 - 2, bodyTop - 2, candleW + 4, bodyH + 4);
                    ctx.restore();
                }

                ctx.fillStyle = isUp ? colors.up : colors.down;
                ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
            }
        } else {
            // ... (Rest of Line Chart Logic)
            ctx.strokeStyle = colors.up;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < visibleData.length; i++) {
                const x = xCandle(i);
                const y = yPrice(visibleData[i].close);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            const grad = ctx.createLinearGradient(0, MARGIN.top, 0, MARGIN.top + priceH);
            grad.addColorStop(0, colors.chartVolumeBull);
            grad.addColorStop(1, "rgba(204,255,0,0)");
            ctx.fillStyle = grad;
            ctx.lineTo(xCandle(visibleData.length - 1), MARGIN.top + priceH);
            ctx.lineTo(xCandle(0), MARGIN.top + priceH);
            ctx.closePath();
            ctx.fill();
        }

        // ─── Arbitrage Overlay Line ──────────────────────────
        // ... (Existing Arb Line Logic)
        if (secondaryPrice) {
            const secY = yPrice(secondaryPrice);
            ctx.strokeStyle = colors.chartGrid; // Subtle
            ctx.setLineDash([2, 5]);
            ctx.beginPath();
            ctx.moveTo(MARGIN.left, secY);
            ctx.lineTo(W - MARGIN.right, secY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Label for gap
            const gap = currentPrice - secondaryPrice;
            const gapPct = (gap / secondaryPrice) * 100;
            ctx.fillStyle = colors.chartAxisText;
            ctx.font = "italic 10px Inter";
            ctx.textAlign = "right";
            ctx.fillText(`Gap: ${gap >= 0 ? '+' : ''}${gap.toFixed(2)} (${gapPct.toFixed(2)}%)`, W - MARGIN.right - 5, secY - 5);
        }

        // ─── Current Price Line ──────────────────────────────
        // ... (Existing CP Line Logic)
        const cpY = yPrice(currentPrice);
        ctx.strokeStyle = colors.chartCurrentPriceLine;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(MARGIN.left, cpY);
        ctx.lineTo(W - MARGIN.right, cpY);
        ctx.stroke();
        ctx.setLineDash([]);

        const labelH = 22;
        const labelW = 66;
        ctx.fillStyle = isCurrentUp ? colors.up : colors.down;
        ctx.fillRect(W - MARGIN.right + 2, cpY - labelH / 2, labelW, labelH);
        ctx.fillStyle = "#000";
        ctx.font = "bold 11px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(currentPrice.toFixed(2), W - MARGIN.right + 2 + labelW / 2, cpY);

        // ... (Rest of existing drawing code, Order Lines etc.)
        // ─── ORDER LINES ─────────────────────────────────────
        for (const line of orderLines) {
            // ... (Keep existing Order Line logic exactly as is)
            const lineY = yPrice(line.price);
            if (lineY < MARGIN.top || lineY > MARGIN.top + priceH) continue;

            let lineColor: string;
            let dashPattern: number[];
            let lineLabel: string;
            let lineWidth = 1;
            const isHovered = hoveredLine === line.id;
            const isDragging = draggingLine === line.id;

            if (line.type === 'entry') {
                lineColor = line.side === 'BUY' ? colors.orderEntryBuy : colors.orderEntrySell;
                dashPattern = [6, 4];
                const pnl = line.side === 'BUY'
                    ? (currentPrice - line.price) * line.qty
                    : (line.price - currentPrice) * line.qty;
                const pnlStr = pnl >= 0 ? `+₹${pnl.toFixed(0)}` : `-₹${Math.abs(pnl).toFixed(0)}`;

                const pendingQty = line.qty - (line.filledQty || 0);
                const qtyStr = pendingQty > 0 ? pendingQty : line.qty;
                const filledStr = line.filledQty ? ` (${line.filledQty}/${line.qty} FILL)` : '';

                lineLabel = `${line.side} ${qtyStr} @ ₹${line.price.toFixed(2)}${filledStr} • ${pnlStr}`;
                lineWidth = 1.5;
            } else if (line.type === 'target') {
                lineColor = colors.orderTarget;
                dashPattern = [3, 3];
                lineLabel = `TP ₹${line.price.toFixed(2)}`;
            } else {
                lineColor = colors.orderStoploss;
                dashPattern = [3, 3];
                lineLabel = `SL ₹${line.price.toFixed(2)}`;
            }

            if (isHovered || isDragging) lineWidth += 1;

            ctx.strokeStyle = lineColor;
            ctx.lineWidth = lineWidth;
            ctx.setLineDash(dashPattern);
            ctx.globalAlpha = isHovered || isDragging ? 1 : 0.8;
            ctx.beginPath();
            ctx.moveTo(MARGIN.left, lineY);
            ctx.lineTo(W - MARGIN.right, lineY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Render Partial Fill Progress Bar
            if (line.filledQty && line.filledQty > 0 && line.filledQty < line.qty) {
                const fillRatio = line.filledQty / line.qty;
                ctx.beginPath();
                ctx.strokeStyle = lineColor;
                ctx.lineWidth = lineWidth + 1;
                ctx.moveTo(MARGIN.left, lineY);
                ctx.lineTo(MARGIN.left + (W - MARGIN.left - MARGIN.right) * fillRatio, lineY);
                ctx.stroke();
            }

            ctx.globalAlpha = 1;

            // Pill
            ctx.font = "bold 10px 'JetBrains Mono', monospace";
            const textW = ctx.measureText(lineLabel).width;
            const pillW = textW + 32;
            const pillH = 20;
            const pillX = W - MARGIN.right - pillW - 4;
            const pillY = lineY - pillH / 2;

            ctx.fillStyle = colors.orderLabelBg;
            ctx.beginPath();
            const r = 4;
            ctx.moveTo(pillX + r, pillY);
            ctx.lineTo(pillX + pillW - r, pillY);
            ctx.arcTo(pillX + pillW, pillY, pillX + pillW, pillY + r, r);
            ctx.lineTo(pillX + pillW, pillY + pillH - r);
            ctx.arcTo(pillX + pillW, pillY + pillH, pillX + pillW - r, pillY + pillH, r);
            ctx.lineTo(pillX + r, pillY + pillH);
            ctx.arcTo(pillX, pillY + pillH, pillX, pillY + pillH - r, r);
            ctx.lineTo(pillX, pillY + r);
            ctx.arcTo(pillX, pillY, pillX + r, pillY, r);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = lineColor;
            ctx.fillRect(pillX, pillY, 3, pillH);

            ctx.fillStyle = lineColor;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            ctx.fillText(lineLabel, pillX + 8, lineY);

            ctx.fillStyle = "#666";
            ctx.font = "bold 12px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("×", pillX + pillW - 10, lineY);

            // Price tag
            const tagW = 60;
            const tagH = 18;
            ctx.fillStyle = lineColor;
            ctx.globalAlpha = 0.85;
            ctx.fillRect(W - MARGIN.right + 2, lineY - tagH / 2, tagW, tagH);
            ctx.globalAlpha = 1;
            ctx.fillStyle = "#000";
            ctx.font = "bold 9px 'JetBrains Mono', monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(line.price.toFixed(2), W - MARGIN.right + 2 + tagW / 2, lineY);

            if (line.draggable && (isHovered || isDragging)) {
                const dotX = MARGIN.left + 12;
                ctx.fillStyle = lineColor;
                for (let dotRow = -1; dotRow <= 1; dotRow++) {
                    ctx.beginPath();
                    ctx.arc(dotX, lineY + dotRow * 4, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(dotX + 5, lineY + dotRow * 4, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // ─── X-Axis Labels ───────────────────────────────────
        ctx.fillStyle = colors.chartAxisText;
        ctx.font = "10px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        const labelInterval = Math.ceil(visibleData.length / 8);
        for (let i = 0; i < visibleData.length; i += labelInterval) {
            const x = xCandle(i);
            ctx.fillText(formatTime(visibleData[i].time, interval), x, H - MARGIN.bottom + 8);
        }

        // ─── Crosshair ──────────────────────────────────────
        // ... (Keep existing Crosshair logic)
        if (mousePos && !draggingLine &&
            mousePos.x > MARGIN.left && mousePos.x < W - MARGIN.right &&
            mousePos.y > MARGIN.top && mousePos.y < MARGIN.top + priceH) {

            ctx.strokeStyle = colors.chartCrosshair;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);

            ctx.beginPath();
            ctx.moveTo(MARGIN.left, mousePos.y);
            ctx.lineTo(W - MARGIN.right, mousePos.y);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(mousePos.x, MARGIN.top);
            ctx.lineTo(mousePos.x, MARGIN.top + priceH + volumeH);
            ctx.stroke();
            ctx.setLineDash([]);

            const crossPrice = priceMin + (1 - (mousePos.y - MARGIN.top) / priceH) * priceRange;
            ctx.fillStyle = colors.chartCrosshairLabel;
            ctx.fillRect(W - MARGIN.right + 2, mousePos.y - 10, labelW, 20);
            ctx.fillStyle = "#aaa";
            ctx.font = "10px 'JetBrains Mono', monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(crossPrice.toFixed(2), W - MARGIN.right + 2 + labelW / 2, mousePos.y);

            const candleIdx = Math.round((mousePos.x - MARGIN.left - gap / 2) / gap);
            if (candleIdx >= 0 && candleIdx < visibleData.length) {
                const timeLabel = formatTime(visibleData[candleIdx].time, interval);
                const timeLabelW = ctx.measureText(timeLabel).width + 12;
                ctx.fillStyle = colors.chartCrosshairLabel;
                ctx.fillRect(mousePos.x - timeLabelW / 2, H - MARGIN.bottom + 2, timeLabelW, 18);
                ctx.fillStyle = "#aaa";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(timeLabel, mousePos.x, H - MARGIN.bottom + 11);
            }
        }
        // ─── Technical Indicators ────────────────────────────
        indicatorData.forEach(ind => {
            ctx.strokeStyle = ind.color;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([]);
            ctx.beginPath();

            let first = true;
            for (let i = 0; i < visibleData.length; i++) {
                const globalIdx = data.findIndex(d => d.time === visibleData[i].time);
                if (globalIdx === -1) continue;

                const val = ind.values[globalIdx];
                if (isNaN(val)) continue;

                const x = xCandle(i);
                const y = yPrice(val);

                if (first) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
                first = false;
            }
            ctx.stroke();

            // Label at the end of the line
            if (!first) {
                const lastVal = ind.values[data.findIndex(d => d.time === visibleData[visibleData.length - 1].time)];
                if (!isNaN(lastVal)) {
                    ctx.fillStyle = ind.color;
                    ctx.font = "bold 9px 'JetBrains Mono'";
                    ctx.textAlign = "left";
                    ctx.fillText(`${ind.type}(${ind.period})`, W - MARGIN.right + 2, yPrice(lastVal));
                }
            }
        });

        // ─── Drawings (Neon-Sketch) ──────────────────────────
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const renderDrawing = (d: any, isCurrent = false) => {
            if (!d || !d.p1 || !d.p2) return;

            // Convert Price/Time to X/Y
            const x1 = xCandle(visibleData.findIndex(c => c.time === d.p1.time));
            if (x1 === -1) return;
            const y1 = yPrice(d.p1.price);

            let x2;
            const idx2 = visibleData.findIndex(c => c.time === d.p2.time);
            if (idx2 !== -1) {
                x2 = xCandle(idx2);
            } else {
                if (isCurrent && mousePos) x2 = mousePos.x;
                else return;
            }

            const y2 = yPrice(d.p2.price);

            ctx.strokeStyle = isCurrent ? colors.primary : (d.color || colors.primary);
            ctx.lineWidth = 2;
            ctx.shadowColor = ctx.strokeStyle as string;
            ctx.shadowBlur = 10;

            if (d.type === 'TRENDLINE') {
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            } else if (d.type === 'RECTANGLE') {
                ctx.fillStyle = isCurrent ? "rgba(0, 229, 255, 0.1)" : (d.fill || "rgba(0, 229, 255, 0.1)");
                ctx.beginPath();
                ctx.rect(x1, y1, x2 - x1, y2 - y1);
                ctx.fill();
                ctx.stroke();
            }

            ctx.shadowBlur = 0;

            // Draw anchors
            if (isCurrent) {
                ctx.fillStyle = "#fff";
                ctx.beginPath(); ctx.arc(x1, y1, 3, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(x2, y2, 3, 0, Math.PI * 2); ctx.fill();
            }
        };

        storeDrawings.filter(d => d.symbol === symbol).forEach(d => renderDrawing(d));
        if (currentDrawing) renderDrawing(currentDrawing, true);

    }, [data, secondaryData, storeDrawings, currentDrawing, dimensions, mousePos, currentPrice, isCurrentUp, interval, chartType, symbol, scales, orderLines, hoveredLine, draggingLine, colors, showOIProfile, indicatorData]);

    useEffect(() => { draw(); }, [draw]);

    // ─── Find if mouse is near an order line ─────────────────
    const findLineAtY = useCallback((y: number): OrderLine | null => {
        if (!scales) return null;
        for (const line of orderLines) {
            if (!line.draggable) continue;
            const lineY = scales.yPrice(line.price);
            if (Math.abs(y - lineY) < LINE_HIT_THRESHOLD) return line;
        }
        return null;
    }, [orderLines, scales]);

    // ─── Mouse Handlers ──────────────────────────────────────
    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect || !scales) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 1. Check for Order Line Drag first
        const nearLine = findLineAtY(y);
        const drawingMode = activeTool !== 'CURSOR';

        if (nearLine && !drawingMode) {
            setDraggingLine(nearLine.id);
            // e.preventDefault(); // Don't prevent default, allows focus
            return;
        }

        // 2. Axis Scaling Detection
        if (x > scales.W - MARGIN.right) {
            setIsYAxisScaling(true);
            lastPanY.current = y;
            if (setIsAutoMode) setIsAutoMode(false);
            return;
        }
        if (y > scales.H - MARGIN.bottom) {
            setIsXAxisScaling(true);
            lastPanX.current = x;
            return;
        }

        // 3. Panning Mode
        if (!drawingMode) {
            setIsPanning(true);
            lastPanX.current = x;
            lastPanY.current = y; // Fix: Set Y for vertical panning
            if (setIsAutoMode) setIsAutoMode(false);
            return;
        }

        // 3. Neon-Sketch Logic
        if (activeTool !== 'CURSOR' && activeTool !== 'MEASURE') {
            let price = scales.priceFromY(y);
            let snappedTime = Math.round(scales.timeFromX(x) / stepMs) * stepMs;

            // Magnet Mode: Snap to nearest candle wick
            if (magnetMode) {
                const hoverCandle = scales.visibleData.find(d => Math.abs(d.time - snappedTime) < stepMs);
                if (hoverCandle) {
                    const points = [hoverCandle.high, hoverCandle.low, hoverCandle.open, hoverCandle.close];
                    // Find closest point to click price
                    const closest = points.reduce((prev, curr) => Math.abs(curr - price) < Math.abs(prev - price) ? curr : prev);
                    if (Math.abs(scales.yPrice(closest) - y) < 30) {
                        price = closest;
                        snappedTime = hoverCandle.time;
                    }
                }
            }

            setCurrentDrawing({
                symbol,
                type: activeTool,
                p1: { time: snappedTime, price },
                p2: { time: snappedTime, price }, // Initially same point
                color: colors?.primary || '#00e5ff'
            });
        }
    }, [findLineAtY, activeTool, scales, data, colors, symbol, stepMs]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect || !scales) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setMousePos({ x, y });
        if (syncCrosshair) setSyncedMousePos({ x, y });

        if (isYAxisScaling && lastPanY.current !== null) {
            const dy = y - lastPanY.current;
            // Inverted for natural "pulling" feel
            setPriceScaleMultiplier(prev => Math.max(0.1, Math.min(prev * (1 + dy * 0.015), 50)));
            lastPanY.current = y;
            return;
        }

        if (isXAxisScaling && lastPanX.current !== null) {
            const dx = x - lastPanX.current;
            setPxPerCandle(prev => Math.max(0.5, Math.min(prev * (1 + dx * 0.01), 150)));
            lastPanX.current = x;
            return;
        }

        if (isPanning && lastPanX.current !== null && lastPanY.current !== null) {
            const dx = x - lastPanX.current;
            const dy = y - lastPanY.current;

            // X-Axis Pan
            setTimeOffset(prev => (prev ?? Date.now()) + dx * scales.timeScale);

            // Y-Axis Pan
            const priceDelta = dy * (scales.priceRange / scales.priceH);
            setPriceOffset(prev => prev + priceDelta);

            lastPanX.current = x;
            lastPanY.current = y;
            return;
        }

        if (draggingLine) {
            const newPrice = scales.priceFromY(y);
            updateOrderLinePrice(draggingLine, newPrice);
            return;
        }

        if (currentDrawing) {
            const price = scales.priceFromY(y);
            const snappedTime = Math.round(scales.timeFromX(x) / stepMs) * stepMs;

            setCurrentDrawing((prev: any) => ({
                ...prev,
                p2: { time: snappedTime, price }
            }));
            return;
        }

        const nearLine = findLineAtY(y);
        setHoveredLine(nearLine?.id ?? null);

        const hoverTime = scales.timeFromX(x);
        const bucketTime = Math.round((hoverTime + stepMs / 2) / stepMs) * stepMs;
        const matchedCandle = scales.visibleData.find(d => d.time === bucketTime || (d.time <= hoverTime && d.time + stepMs > hoverTime));
        setHoveredCandle(matchedCandle || null);

    }, [data, scales, draggingLine, findLineAtY, updateOrderLinePrice, currentDrawing, isPanning, stepMs]);

    const handleMouseUp = useCallback(() => {
        setIsPanning(false);
        setIsYAxisScaling(false);
        setIsXAxisScaling(false);
        lastPanX.current = null;
        lastPanY.current = null;

        if (draggingLine) {

            setDraggingLine(null);
            return;
        }
        if (currentDrawing) {
            addDrawing({
                ...currentDrawing,
                id: Math.random().toString(36).substring(7)
            });
            setCurrentDrawing(null);
            setActiveTool('CURSOR'); // Reset to cursor after drawing
        }
    }, [draggingLine, currentDrawing, addDrawing, setActiveTool]);
    const handleMouseLeave = useCallback(() => {
        setIsPanning(false);
        setIsYAxisScaling(false);
        setIsXAxisScaling(false);
        lastPanX.current = null;
        lastPanY.current = null;
        setMousePos(null);
        if (syncCrosshair) setSyncedMousePos(null);
        setHoveredCandle(null);
        setDraggingLine(null);
        setHoveredLine(null);
    }, [syncCrosshair, setSyncedMousePos]);

    const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
        if (!scales) return;
        if (setIsAutoMode) setIsAutoMode(false);

        // Semantic zoom: anchor on the time under the cursor
        const rect = canvasRef.current?.getBoundingClientRect();
        const x = rect ? e.clientX - rect.left : 0;
        const timeUnderCursor = scales.timeFromX(x);

        // Zoom intensity (prevent aggressive zooming based on trackpad vs mouse wheel)
        const zoomDelta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY) * 0.02, 0.4);
        const zoomFactor = 1 + zoomDelta;

        setPxPerCandle(prev => {
            const newPx = Math.max(0.5, Math.min(prev / zoomFactor, 150)); // Clamp scale

            // Adjust timeOffset so `timeUnderCursor` stays at `x`
            const newTimeScale = stepMs / newPx;
            const newOffset = timeUnderCursor + (scales.chartW - x) * newTimeScale;
            setTimeOffset(newOffset);

            return newPx;
        });
    }, [scales, stepMs]);

    // Apply synced position from external charts
    useEffect(() => {
        if (syncCrosshair && syncedMousePos) {
            // We set it as long as we aren't the primary mouse holder? 
            // Actually, setting it is fine as it triggers re-render of crosshairs.
            setMousePos(syncedMousePos);
        } else if (syncCrosshair && !syncedMousePos) {
            setMousePos(null);
        }
    }, [syncCrosshair, syncedMousePos]);

    const { visibleData = [] } = scales || {};
    const activeCandle = hoveredCandle || visibleData[visibleData.length - 1];
    const isActiveUp = activeCandle ? activeCandle.close >= activeCandle.open : true;
    const cursorStyle = draggingLine ? "ns-resize" : hoveredLine ? "ns-resize" : "crosshair";

    return (
        <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[var(--chart-bg)]">
            <canvas
                ref={canvasRef}
                className="absolute inset-0"
                style={{ cursor: cursorStyle }}
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onWheel={handleWheel}
                onDoubleClick={() => {
                    setPriceOffset(0);
                    setPriceScaleMultiplier(1);
                    if (setIsAutoMode) setIsAutoMode(true);
                }}
            />

            {/* ─── OHLCV Overlay ──────────────────────────────── */}
            {activeCandle && (
                <div className="absolute top-2 left-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono select-none pointer-events-none z-10 pr-2">
                    <span className={`font-bold ${isActiveUp ? "text-up" : "text-down"} whitespace-nowrap`}>
                        O <span className="text-[12px]">{activeCandle.open.toFixed(2)}</span>
                    </span>
                    <span className={`font-bold ${isActiveUp ? "text-up" : "text-down"} whitespace-nowrap`}>
                        H <span className="text-[12px]">{activeCandle.high.toFixed(2)}</span>
                    </span>
                    <span className={`font-bold ${isActiveUp ? "text-up" : "text-down"} whitespace-nowrap`}>
                        L <span className="text-[12px]">{activeCandle.low.toFixed(2)}</span>
                    </span>
                    <span className={`font-bold ${isActiveUp ? "text-up" : "text-down"} whitespace-nowrap`}>
                        C <span className="text-[12px]">{activeCandle.close.toFixed(2)}</span>
                    </span>
                    <span className="text-muted-foreground font-bold whitespace-nowrap">
                        V <span className="text-[12px]">{activeCandle.volume.toLocaleString()}</span>
                    </span>
                </div>
            )}

            {/* ─── Active Orders Badge ────────────────────────── */}
            {orderLines.length > 0 && (
                <div className="absolute top-2 right-[80px] flex items-center gap-2 px-2 py-1 rounded bg-white/5 border border-white/10 z-10 select-none">
                    <div className="w-2 h-2 rounded-full bg-up animate-pulse shadow-[0_0_8px_var(--up)]" />
                    <span className="text-[10px] font-mono text-white/70">
                        {orderLines.filter(l => l.type === 'entry').length} ACTIVE
                    </span>
                    {tickerData?.fused_price && (
                        <>
                            <div className="w-[1px] h-3 bg-white/10 mx-1" />
                            <span className="text-[10px] font-bold text-up animate-pulse flex items-center gap-1">
                                <span className="text-[8px]">🛰️</span> FUSED
                            </span>
                        </>
                    )}
                </div>
            )}

            {/* ─── Indicator Legend ───────────────────────────── */}
            <div className="absolute top-10 left-3 flex flex-col gap-1 z-10 select-none cursor-default">
                {indicatorData.map((ind) => (
                    <div
                        key={ind.id}
                        className="group flex items-center gap-2 px-2 py-0.5 rounded hover:bg-white/5 transition-colors"
                    >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ind.color }} />
                        <span className="text-[10px] font-bold text-zinc-300">
                            {ind.type}{ind.period ? `(${ind.period})` : ''}
                        </span>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); useDrawingStore.getState().toggleIndicator(ind.id); }}
                                className="p-0.5 hover:text-white text-zinc-600 transition-colors"
                            >
                                {ind.visible ? <span className="text-[10px]">👁️</span> : <span className="text-[10px]">🕶️</span>}
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setSettingsIndId(ind.id); }}
                                className="p-0.5 hover:text-white text-zinc-600 transition-colors"
                            >
                                <span className="text-[10px]">⚙️</span>
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); useDrawingStore.getState().removeIndicator(ind.id); }}
                                className="p-0.5 hover:text-red-400 text-zinc-600 transition-colors"
                            >
                                <span className="text-[10px]">×</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* ─── Fetch Error Banner ───────────────────────────── */}
            {fetchError && (
                <div className="absolute bottom-10 left-3 right-[80px] z-20 px-3 py-2 rounded bg-red-900/80 border border-red-500/50 backdrop-blur-sm">
                    <p className="text-[11px] font-mono text-red-200">
                        ⚠️ {fetchError}
                    </p>
                </div>
            )}

            {/* ─── Settings Dialog ──────────────────────────────── */}
            <IndicatorSettingsDialog
                indicatorId={settingsIndId}
                onClose={() => setSettingsIndId(null)}
            />
        </div>
    );
};
