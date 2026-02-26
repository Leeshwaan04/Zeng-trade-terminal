"use client";

import React, { useRef, useEffect, useState, useMemo, createContext, useContext } from "react";
import { useResizeObserver } from "@/hooks/use-resize-observer"; // We need to create this or use existing raw observer

// ─── Chart Context ───────────────────────────────────────────
interface ChartContextType {
    width: number;
    height: number;
    data: any[];
    scales: {
        x: (i: number) => number;
        y: (p: number) => number;
        priceFromY: (y: number) => number;
        indexFromX: (x: number) => number;
        candleWidth: number;
        gap: number;
    } | null;
    mouse: { x: number; y: number } | null;
}

const ChartContext = createContext<ChartContextType | null>(null);

export const useChart = () => {
    const ctx = useContext(ChartContext);
    if (!ctx) throw new Error("useChart must be used within ChartEngine");
    return ctx;
};

// ─── Chart Layer ─────────────────────────────────────────────
interface ChartLayerProps {
    zIndex?: number;
    draw: (ctx: CanvasRenderingContext2D, props: ChartContextType) => void;
}

export const ChartLayer = ({ zIndex = 0, draw }: ChartLayerProps) => {
    const { width, height, data, scales, mouse } = useChart();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !scales || width === 0 || height === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Handle DPR
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Draw
        draw(ctx, { width, height, data, scales, mouse });

    }, [width, height, data, scales, mouse, draw]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex }}
        />
    );
}

// ─── Chart Engine ────────────────────────────────────────────
interface ChartEngineProps {
    data: any[];
    height?: number | string;
    children: React.ReactNode;
    onMouseMove?: (x: number, y: number, price: number, time: number) => void;
}

export const ChartEngine = ({ data, height = "100%", children, onMouseMove }: ChartEngineProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);

    // Resize Observer Logic
    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(entries => {
            const { width, height } = entries[0].contentRect;
            setDimensions({ width, height });
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, []);

    // ─── Interaction State ───────────────────────────────────────
    const [transform, setTransform] = useState({ k: 1, x: 0 }); // k = scale (zoom), x = pan offset
    const [isDragging, setIsDragging] = useState(false);
    const lastMouseX = useRef(0);

    // Calculate Scales with Transform
    const scales = useMemo(() => {
        const { width, height } = dimensions;
        if (width === 0 || height === 0 || data.length === 0) return null;

        const MARGIN = { top: 10, bottom: 30, right: 60 };
        const chartW = width - MARGIN.right;
        const chartH = height - MARGIN.top - MARGIN.bottom;

        // X Scale (Zoomable)
        // Base gap * scale
        const baseGap = chartW / 50; // Show 50 candles by default? 
        // Or better: fit current data if k=1? 
        // Let's settle on: k=1 means "Standard View" (e.g. 100 candles), x=0 means "Latest candle at right"

        const visibleCandles = 60 / transform.k;
        const gap = chartW / visibleCandles;
        const candleWidth = gap * 0.7;

        // Viewport Logic
        // We need to determine which candles are visible based on transform.x (offset in pixels)
        // transform.x positive -> pushing chart right (seeing past)
        // transform.x negative -> pushing chart left (seeing future empty space)

        const xRaw = (i: number) => {
            // Index 0 is oldest? Or Data[length-1] is latest?
            // Let's assume Data[0] is oldest.
            // We want data[length-1] to be at width-margin.right normally.

            // Standard: x = i * gap
            // With Pan: x = i * gap + transform.x
            // With Zoom: gap is already scaled.

            // Align right: 
            // The X of the last candle should be (chartW - gap/2) + transform.x
            const offsetFromRight = (data.length - 1 - i) * gap;
            return chartW - offsetFromRight + transform.x - gap / 2;
        };

        const x = xRaw;
        const indexFromX = (mx: number) => {
            // Inverse of xRaw
            // mx = chartW - (len - 1 - i) * gap + dx - gap/2
            // mx - chartW - dx + gap/2 = - (len - 1 - i) * gap
            // (chartW + dx - gap/2 - mx) / gap = len - 1 - i
            // i = len - 1 - (chartW + dx - gap/2 - mx) / gap
            return Math.round(data.length - 1 - ((chartW + transform.x - gap / 2 - mx) / gap));
        };

        // Calculate Visible Range for Y-Axis Auto-Scale
        const startIdx = Math.max(0, indexFromX(0));
        const endIdx = Math.min(data.length - 1, indexFromX(width));

        let min = Infinity, max = -Infinity;
        // Optimization: iterate only visible range
        for (let i = startIdx; i <= endIdx; i++) {
            const d = data[i];
            if (!d) continue;
            if (d.low < min) min = d.low;
            if (d.high > max) max = d.high;
        }

        // Fallback if no data visible
        if (min === Infinity) { min = 0; max = 100; }

        const padding = (max - min) * 0.1;
        min -= padding;
        max += padding;
        const range = max - min;

        // Y Scale
        const y = (p: number) => MARGIN.top + chartH * (1 - (p - min) / range);
        const priceFromY = (my: number) => min + (1 - (my - MARGIN.top) / chartH) * range;

        return { x, y, priceFromY, indexFromX, candleWidth, gap, chartW, chartH, min, max, MARGIN, visibleRange: { startIdx, endIdx } };
    }, [dimensions, data, transform]);

    // ─── Event Handlers ──────────────────────────────────────────

    const handleWheel = (e: React.WheelEvent) => {
        // Zoom
        e.preventDefault();
        const sensitivity = 0.001;
        const delta = -e.deltaY * sensitivity;

        setTransform(prev => {
            const newK = Math.max(0.1, Math.min(10, prev.k * (1 + delta)));
            return { ...prev, k: newK };
        });
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        lastMouseX.current = e.clientX;
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect || !scales) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setMouse({ x, y });

        if (isDragging) {
            const dx = e.clientX - lastMouseX.current;
            lastMouseX.current = e.clientX;
            setTransform(prev => ({ ...prev, x: prev.x + dx }));
        }

        if (onMouseMove) {
            const price = scales.priceFromY(y);
            onMouseMove(x, y, price, 0); // Todo: return time
        }
    };

    const handleMouseLeave = () => {
        setMouse(null);
        setIsDragging(false);
    };

    return (
        <ChartContext.Provider value={{ width: dimensions.width, height: dimensions.height, data, scales: scales as any, mouse }}>
            <div
                ref={containerRef}
                className="relative w-full overflow-hidden bg-black select-none cursor-crosshair"
                style={{ height }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}
            >
                {children}
            </div>
        </ChartContext.Provider>
    );
};
