"use client";

import React, { useMemo } from "react";
import { useOrderStore } from "@/hooks/useOrderStore";
import { ResponsiveContainer, Treemap, Tooltip } from "recharts";
import { cn } from "@/lib/utils";

// Custom Content for Treemap Nodes
const CustomizedContent = (props: any) => {
    const { root, depth, x, y, width, height, index, payload, colors, rank, name, value } = props;

    // Calculate P&L Percentage (simulated logic for demo, actual from payload)
    const pnlPercent = payload?.pnlPercent || 0;
    const isProfit = pnlPercent >= 0;
    const intensity = Math.min(Math.abs(pnlPercent) / 5, 1); // Max intensity at 5% move

    // Color Logic: Mix base color with intensity
    const backgroundColor = isProfit
        ? `rgba(204, 255, 0, ${0.1 + intensity * 0.4})`
        : `rgba(255, 77, 77, ${0.1 + intensity * 0.4})`;

    const borderColor = isProfit ? "#CCFF00" : "#FF4D4D";

    if (!width || !height) return null;

    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: backgroundColor,
                    stroke: borderColor,
                    strokeWidth: 1,
                    strokeOpacity: 0.3,
                }}
            />
            {width > 40 && height > 30 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={Math.min(width / 5, 14)}
                    fontWeight="bold"
                    style={{ pointerEvents: 'none' }}
                >
                    <tspan x={x + width / 2} dy="-0.5em">{name}</tspan>
                    <tspan x={x + width / 2} dy="1.2em" fill={isProfit ? "#CCFF00" : "#FF4D4D"} fontSize={Math.min(width / 6, 10)}>
                        {pnlPercent > 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
                    </tspan>
                </text>
            )}
        </g>
    );
};

// Custom Tooltip
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const isProfit = data.pnl >= 0;
        return (
            <div className="bg-popover border border-border p-3 rounded shadow-xl backdrop-blur-md">
                <div className="font-bold text-foreground mb-1">{data.name}</div>
                <div className="text-xs text-muted-foreground font-mono space-y-1">
                    <div className="flex justify-between gap-4">
                        <span>Invested</span>
                        <span className="text-foreground">₹{data.invested.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span>P&L</span>
                        <span className={isProfit ? "text-up font-bold" : "text-down font-bold"}>
                            {data.pnl > 0 ? "+" : ""}₹{data.pnl.toFixed(2)} ({data.pnlPercent.toFixed(2)}%)
                        </span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span>LTP</span>
                        <span className="text-foreground">₹{data.ltp.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export const PortfolioHeatmap = () => {
    const positions = useOrderStore(state => state.positions);

    const data = useMemo(() => {
        // Filter out closed positions and map to Treemap format
        const activePositions = positions.filter(p => p.quantity !== 0);

        if (activePositions.length === 0) return [];

        return activePositions.map(p => {
            const invested = Math.abs(p.quantity) * p.average_price;
            const pnl = p.pnl; // Assuming pnl is updated in store
            const pnlPercent = invested !== 0 ? (pnl / invested) * 100 : 0;

            return {
                name: p.symbol,
                size: invested, // Size by invested value
                invested: invested,
                pnl: pnl,
                pnlPercent: pnlPercent,
                ltp: p.last_price
            };
        });

        // Ensure data structure for Recharts Treemap (needs nested children or flat array with proper keys)
        // Actually Recharts simple Treemap takes flat array with dataKey="size"
    }, [positions]);

    if (data.length === 0) {
        return (
            <div className="h-full w-full flex flex-col items-center justify-center bg-muted/20 text-muted-foreground font-mono gap-2">
                <div className="w-12 h-12 border-2 border-dashed border-border rounded-lg opacity-50" />
                <span className="text-xs uppercase tracking-widest">No Active Holdings</span>
            </div>
        );
    }

    return (
        <div className="h-full w-full bg-background/40 relative font-sans">
            <ResponsiveContainer width="100%" height="100%">
                <Treemap
                    data={data}
                    dataKey="size"
                    aspectRatio={4 / 3}
                    stroke="transparent"
                    content={<CustomizedContent />}
                >
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                </Treemap>
            </ResponsiveContainer>
        </div>
    );
};
