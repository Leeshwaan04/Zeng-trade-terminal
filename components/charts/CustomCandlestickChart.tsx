"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useOrderStore, OrderLine } from "@/hooks/useOrderStore";
import { useMarketStore } from "@/hooks/useMarketStore";
import { useAuthStore } from "@/hooks/useAuthStore";
import { useWorkerTicker } from "@/hooks/useWorkerTicker";
import { getChartColors, type DesignTokens } from "@/lib/design-tokens";
import { getInstrumentToken } from "@/lib/market-config";

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
export const CustomCandlestickChart = ({ symbol, interval = "1D", chartType = "candle" }: CustomCandlestickChartProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
    const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
    const [draggingLine, setDraggingLine] = useState<string | null>(null);
    const [hoveredLine, setHoveredLine] = useState<string | null>(null);
    const [colors, setColors] = useState<DesignTokens | null>(null);

    const MARGIN = { top: 10, right: 70, bottom: 30, left: 0 };
    const VOLUME_HEIGHT_RATIO = 0.15;
    const LINE_HIT_THRESHOLD = 6;

    // ─── Drawing State ───────────────────────────────────────
    const [drawingMode, setDrawingMode] = useState<'none' | 'trendline' | 'rect'>('none');
    const [drawings, setDrawings] = useState<any[]>([]);
    const [currentDrawing, setCurrentDrawing] = useState<any | null>(null);

    // Load drawings from local storage
    useEffect(() => {
        const saved = localStorage.getItem(`drawings-${symbol}`);
        if (saved) {
            try { setDrawings(JSON.parse(saved)); } catch (e) { }
        }
    }, [symbol]);

    // Save drawings
    useEffect(() => {
        if (drawings.length > 0) {
            localStorage.setItem(`drawings-${symbol}`, JSON.stringify(drawings));
        }
    }, [drawings, symbol]);

    const [data, setData] = useState<Candle[]>([]);
    const [secondaryData, setSecondaryData] = useState<Candle[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const activeBroker = useAuthStore(state => state.activeBroker) || 'KITE';

    // ─── Fetch Historical Data ───────────────────────────────
    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                // Calculate date range
                const toDate = new Date();
                const fromDate = new Date();
                if (interval === "1D") fromDate.setDate(toDate.getDate() - 200);
                else if (interval === "1H") fromDate.setDate(toDate.getDate() - 30);
                else fromDate.setDate(toDate.getDate() - 5);

                const fromStr = fromDate.toISOString().split('T')[0];
                const toStr = toDate.toISOString().split('T')[0];

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
                const secondaryBroker = activeBroker === 'KITE' ? 'UPSTOX' : 'KITE'; // Default pair for now

                const pUrl = getUrl(primaryBroker, symbol);
                const sUrl = getUrl(secondaryBroker, symbol);

                const [pRes, sRes] = await Promise.all([
                    pUrl ? fetch(pUrl).catch(e => null) : null,
                    sUrl ? fetch(sUrl).catch(e => null) : null
                ]);

                // Process Primary
                if (pRes && pRes.ok) {
                    const pJson = await pRes.json();
                    if (pJson.data?.candles) {
                        const candles = pJson.data.candles.map((c: any) => ({
                            time: new Date(c[0]).getTime(),
                            open: c[1], high: c[2], low: c[3], close: c[4], volume: c[5]
                        })).sort((a: any, b: any) => a.time - b.time);
                        setData(candles);
                    }
                }

                // Process Secondary
                if (sRes && sRes.ok) {
                    const sJson = await sRes.json();
                    // Upstox/Kite response formats might differ slightly in wrapper, but standardizing here
                    const rawCandles = sJson.data?.candles || sJson.data; // Handle potential variance
                    if (Array.isArray(rawCandles)) {
                        const candles = rawCandles.map((c: any) => ({
                            time: new Date(c[0]).getTime(),
                            open: c[1], high: c[2], low: c[3], close: c[4], volume: c[5]
                        })).sort((a: any, b: any) => a.time - b.time);
                        setSecondaryData(candles);
                    }
                } else {
                    setSecondaryData([]);
                }

            } catch (err) {
                console.error("Chart data fetch error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();

        const poll = setInterval(fetchHistory, 60000);
        return () => clearInterval(poll);
    }, [symbol, interval, activeBroker]);

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
        if (W === 0 || H === 0) return null;

        const chartW = W - MARGIN.left - MARGIN.right;
        const chartH = H - MARGIN.top - MARGIN.bottom;
        const volumeH = chartH * VOLUME_HEIGHT_RATIO;
        const priceH = chartH - volumeH;

        // Consider secondary data for Y-axis scaling if available
        const allHighs = [...data.map(d => d.high), ...secondaryData.map(d => d.high)];
        const allLows = [...data.map(d => d.low), ...secondaryData.map(d => d.low)];
        const orderPrices = orderLines.map(l => l.price);

        const priceMin = Math.min(...allLows, ...orderPrices) - 30;
        const priceMax = Math.max(...allHighs, ...orderPrices) + 30;
        const priceRange = priceMax - priceMin;
        const maxVol = Math.max(...data.map(d => d.volume));

        const yPrice = (price: number) => MARGIN.top + priceH * (1 - (price - priceMin) / priceRange);
        const priceFromY = (y: number) => priceMin + (1 - (y - MARGIN.top) / priceH) * priceRange;

        const gap = chartW / Math.max(data.length, 1);
        const candleW = gap * 0.7;
        const xCandle = (i: number) => MARGIN.left + i * gap + gap / 2;

        return { W, H, chartW, chartH, volumeH, priceH, priceMin, priceMax, priceRange, maxVol, yPrice, priceFromY, gap, candleW, xCandle };
    }, [data, secondaryData, dimensions, orderLines]);

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

        const { W, H, chartW, priceH, volumeH, priceMin, priceRange, maxVol, yPrice, gap, candleW, xCandle } = scales;

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
        for (let i = 0; i < data.length; i++) {
            const d = data[i];
            const x = xCandle(i);
            const yTop = yVolume(d.volume);
            const yBot = MARGIN.top + priceH + volumeH;
            ctx.fillStyle = d.close >= d.open ? colors.chartVolumeBull : colors.chartVolumeBear;
            ctx.fillRect(x - candleW / 2, yTop, candleW, yBot - yTop);
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
            for (let i = 0; i < data.length; i++) {
                const d = data[i];
                const x = xCandle(i);
                // ... (Rest of existing candle logic)
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
            for (let i = 0; i < data.length; i++) {
                const x = xCandle(i);
                const y = yPrice(data[i].close);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            const grad = ctx.createLinearGradient(0, MARGIN.top, 0, MARGIN.top + priceH);
            grad.addColorStop(0, colors.chartVolumeBull);
            grad.addColorStop(1, "rgba(204,255,0,0)");
            ctx.fillStyle = grad;
            ctx.lineTo(xCandle(data.length - 1), MARGIN.top + priceH);
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
                lineLabel = `${line.side} ${line.qty} @ ₹${line.price.toFixed(2)} • ${pnlStr}`;
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
        const labelInterval = Math.ceil(data.length / 8);
        for (let i = 0; i < data.length; i += labelInterval) {
            const x = xCandle(i);
            ctx.fillText(formatTime(data[i].time, interval), x, H - MARGIN.bottom + 8);
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
            if (candleIdx >= 0 && candleIdx < data.length) {
                const timeLabel = formatTime(data[candleIdx].time, interval);
                const timeLabelW = ctx.measureText(timeLabel).width + 12;
                ctx.fillStyle = colors.chartCrosshairLabel;
                ctx.fillRect(mousePos.x - timeLabelW / 2, H - MARGIN.bottom + 2, timeLabelW, 18);
                ctx.fillStyle = "#aaa";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(timeLabel, mousePos.x, H - MARGIN.bottom + 11);
            }
        }
        // ─── Drawings (Neon-Sketch) ──────────────────────────
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        const renderDrawing = (d: any, isCurrent = false) => {
            if (!d || !d.p1 || !d.p2) return;

            // Convert Price/Time to X/Y
            // We need to find X coordinates for the timestamps
            // O(N) lookup for now, can be optimized with map
            const x1 = xCandle(data.findIndex(c => c.time === d.p1.time));
            const y1 = yPrice(d.p1.price);

            // p2 might be in future (time > last candle)? 
            // For now, let's just clamp to existing candles or map assuming linear gap
            let x2;
            const idx2 = data.findIndex(c => c.time === d.p2.time);
            if (idx2 !== -1) {
                x2 = xCandle(idx2);
            } else {
                // If time is not in data, estimate X based on time difference
                // internal gap = (data[last].time - data[first].time) / length
                // this is complex for variable intervals. 
                // Fallback: just use current mouse X if it's currentDrawing, else skip
                if (isCurrent && mousePos) x2 = mousePos.x;
                else return; // Don't render invisible lines
            }

            const y2 = yPrice(d.p2.price);

            ctx.strokeStyle = isCurrent ? colors.primary : (d.color || colors.primary);
            ctx.lineWidth = 2;
            ctx.shadowColor = ctx.strokeStyle as string;
            ctx.shadowBlur = 10;

            if (d.type === 'trendline') {
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            } else if (d.type === 'rect') {
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

        drawings.forEach(d => renderDrawing(d));
        if (currentDrawing) renderDrawing(currentDrawing, true);

    }, [data, secondaryData, drawings, currentDrawing, dimensions, mousePos, currentPrice, isCurrentUp, interval, chartType, symbol, scales, orderLines, hoveredLine, draggingLine, colors]);

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
        if (nearLine && !drawingMode) {
            setDraggingLine(nearLine.id);
            e.preventDefault();
            return;
        }

        // 2. Neon-Sketch Logic
        if (drawingMode !== 'none') {
            const price = scales.priceFromY(y);
            // Snap to candle time
            const idx = Math.round((x - MARGIN.left - scales.gap / 2) / scales.gap);
            const snappedTime = (idx >= 0 && idx < data.length) ? data[idx].time : Date.now(); // Fallback

            setCurrentDrawing({
                type: drawingMode,
                p1: { time: snappedTime, price },
                p2: { time: snappedTime, price }, // Initially same point
                color: colors?.primary || '#00e5ff'
            });
        }
    }, [findLineAtY, drawingMode, scales, data, colors]);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect || !scales) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setMousePos({ x, y });

        if (draggingLine) {
            const newPrice = scales.priceFromY(y);
            updateOrderLinePrice(draggingLine, newPrice);
            return;
        }

        if (currentDrawing) {
            const price = scales.priceFromY(y);
            const idx = Math.round((x - MARGIN.left - scales.gap / 2) / scales.gap);
            const snappedTime = (idx >= 0 && idx < data.length) ? data[idx].time : Date.now();

            setCurrentDrawing((prev: any) => ({
                ...prev,
                p2: { time: snappedTime, price }
            }));
            return;
        }

        const nearLine = findLineAtY(y);
        setHoveredLine(nearLine?.id ?? null);

        const idx = Math.round((x - MARGIN.left - scales.gap / 2) / scales.gap);
        if (idx >= 0 && idx < data.length) {
            setHoveredCandle(data[idx]);
        } else {
            setHoveredCandle(null);
        }
    }, [data, scales, draggingLine, findLineAtY, updateOrderLinePrice, currentDrawing]);

    const handleMouseUp = useCallback(() => {
        if (draggingLine) {
            setDraggingLine(null);
            return;
        }
        if (currentDrawing) {
            setDrawings(prev => [...prev, currentDrawing]);
            setCurrentDrawing(null);
        }
    }, [draggingLine, currentDrawing]);
    const handleMouseLeave = useCallback(() => {
        setMousePos(null);
        setHoveredCandle(null);
        setDraggingLine(null);
        setHoveredLine(null);
    }, []);

    const activeCandle = hoveredCandle || data[data.length - 1];
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

        </div>
    );
};
