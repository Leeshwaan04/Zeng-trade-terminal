"use client";

import React, { useMemo } from "react";
import {
    ComposedChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Line,
    Cell
} from "recharts";
import { format } from "date-fns";

interface SimulatedChartProps {
    symbol: string;
    interval?: string;
}

// Generate "Perfect" Legend Pattern Data
const generateData = (count: number, interval: string) => {
    const data = [];
    // Vary start price based on interval to make charts look distinct
    let price = interval === "1D" ? 21500 : interval === "1H" ? 21800 : 22000;
    let time = new Date().getTime() - count * (
        interval === "1m" ? 60 * 1000 :
            interval === "5m" ? 5 * 60 * 1000 :
                interval === "1H" ? 60 * 60 * 1000 :
                    24 * 60 * 60 * 1000
    );

    for (let i = 0; i < count; i++) {
        const volatility = Math.random() * 20 - (interval === "1D" ? 5 : 8); // Different bias
        const open = price;
        const close = price + volatility + (Math.random() * 10); // Trend up
        const high = Math.max(open, close) + Math.random() * 10;
        const low = Math.min(open, close) - Math.random() * 10;
        const volume = Math.floor(Math.random() * 10000) + 5000;

        // MA calculation (simple smooth line)
        const ma = close * 0.998;

        data.push({
            time,
            open,
            high,
            low,
            close,
            volume,
            ma,
            // Color for Recharts custom shape
            color: close > open ? "#10B981" : "#EF4444"
        });

        price = close;
        time += (
            interval === "1m" ? 60 * 1000 :
                interval === "5m" ? 5 * 60 * 1000 :
                    interval === "1H" ? 60 * 60 * 1000 :
                        24 * 60 * 60 * 1000
        );
    }
    return data;
};

// Custom Candle Shape for Recharts
const CandleShape = (props: any) => {
    const { x, y, width, height, open, close, high, low, color } = props;
    const isUp = close > open;
    const wickHeight = Math.abs(high - low);

    // Scale wick Y (approximate for demo visual)
    // Real implementation would need precise Y scaling from chart scales, 
    // but Recharts passes pre-scaled x/y/width/height for the BAR (body).
    // The "high" and "low" props passed here are raw values, not coordinates.
    // So standard Recharts 'Bar' isn't perfect for Candles without CustomShape logic using scales.

    // Fallback: Simplified visual. 
    // We will use a standard Bar for the body, and ErrorBar for wicks, OR just simple bars.
    // Actually, Recharts is tricky for Candles. 
    // BETTER APPROACH for "Dummy": Use a nice Area Chart with Gradient + Line (Robinhood Style)
    // It looks cleaner and "Replica" enough for indices.
    return <rect x={x} y={y} width={width} height={height} fill={color} />;
};

export const SimulatedChart = ({ symbol, interval = "1D" }: SimulatedChartProps) => {
    // Regenerate data when interval changes
    const data = useMemo(() => generateData(100, interval), [interval]);

    return (
        <div className="w-full h-full bg-black relative flex flex-col justify-center items-center">
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                <h1 className="text-9xl font-bold text-white tracking-tighter">{symbol}</h1>
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 20, right: 50, left: 10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid stroke="#333" strokeDasharray="3 3" vertical={false} opacity={0.3} />

                    <XAxis
                        dataKey="time"
                        tickFormatter={(t) => format(t, "HH:mm")}
                        stroke="#555"
                        tick={{ fontSize: 10, fill: "#666" }}
                        axisLine={false}
                        tickLine={false}
                    />

                    <YAxis
                        domain={['auto', 'auto']}
                        orientation="right"
                        stroke="#555"
                        tick={{ fontSize: 10, fill: "#666" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => val.toFixed(0)}
                    />

                    <Tooltip
                        contentStyle={{ backgroundColor: "#111", borderColor: "#333", color: "#eee" }}
                        itemStyle={{ color: "#fff" }}
                        labelFormatter={(t) => format(t, "MMM dd HH:mm")}
                        formatter={((value: any) => [(value as number)?.toFixed(2) ?? value, "Price"]) as any}
                        cursor={{ stroke: '#FFFFFF', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />

                    {/* Volume (Bar at bottom) */}
                    <Bar dataKey="volume" yAxisId={0} fill="#333" opacity={0.3} barSize={4} />

                    {/* Stock Price (Area + Line) -> Robinhood Style */}
                    <path
                        fill="url(#colorPrice)"
                    />

                    {/* Main Price Line */}
                    <Line
                        type="monotone"
                        dataKey="close"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: "#fff", stroke: "#10B981" }}
                        animationDuration={1500}
                    />

                    {/* Moving Average */}
                    <Line
                        type="monotone"
                        dataKey="ma"
                        stroke="#F59E0B"
                        strokeWidth={1}
                        strokeDasharray="4 4"
                        dot={false}
                    />

                </ComposedChart>
            </ResponsiveContainer>

            {/* Simulation Badge */}
            <div className="absolute bottom-4 left-4 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded text-[9px] font-mono text-yellow-500 select-none">
                SIMULATED DATA • {symbol} • {interval}
            </div>
        </div>
    );
};
