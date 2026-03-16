"use client";

import React from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar
} from "recharts";
import {
    TrendingUp,
    TrendingDown,
    Activity,
    Target,
    AlertCircle,
    ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BacktestResultsProps {
    data: {
        totalProfit: number;
        winRate: number;
        maxDrawdown: number;
        sharpeRatio: number;
        trades: any[];
        equityCurve: number[];
    };
}

export const BacktestResults = ({ data }: BacktestResultsProps) => {
    const isProfitable = data.totalProfit >= 0;

    const chartData = data.equityCurve.map((val, i) => ({
        index: i,
        equity: parseFloat(val.toFixed(2))
    }));

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    label="Net Profit"
                    value={`₹${data.totalProfit.toLocaleString()}`}
                    sub={isProfitable ? "+ " : "- "}
                    icon={<TrendingUp className={cn("w-4 h-4", isProfitable ? "text-up" : "text-down")} />}
                    trend={isProfitable ? "up" : "down"}
                />
                <MetricCard
                    label="Win Rate"
                    value={`${(data.winRate * 100).toFixed(1)}%`}
                    icon={<Target className="w-4 h-4 text-primary" />}
                />
                <MetricCard
                    label="Max Drawdown"
                    value={`${data.maxDrawdown.toFixed(2)}%`}
                    icon={<AlertCircle className="w-4 h-4 text-down" />}
                    trend="down"
                />
                <MetricCard
                    label="Sharpe Ratio"
                    value={data.sharpeRatio.toFixed(2)}
                    icon={<Activity className="w-4 h-4 text-yellow-400" />}
                />
            </div>

            {/* EQUITY CHART */}
            <div className="bg-surface-1 border border-border rounded-xl p-4 h-[300px]">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        Equity Curve
                    </h3>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isProfitable ? "var(--color-up)" : "var(--color-down)"} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={isProfitable ? "var(--color-up)" : "var(--color-down)"} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="index" hide />
                        <YAxis
                            domain={['auto', 'auto']}
                            orientation="right"
                            stroke="rgba(255,255,255,0.3)"
                            fontSize={10}
                            tickFormatter={(val) => `₹${(val / 1000).toFixed(1)}k`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#000', border: '1px solid #333', fontSize: '12px' }}
                            itemStyle={{ color: '#fff' }}
                            labelStyle={{ color: '#888' }}
                            formatter={(val: any) => [`₹${val.toLocaleString()}`, "Equity"]}
                        />
                        <Area
                            type="monotone"
                            dataKey="equity"
                            stroke={isProfitable ? "var(--color-up)" : "var(--color-down)"}
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorEquity)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* TRADE LOG SUMMARY */}
            <div className="bg-surface-1 border border-border rounded-xl p-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
                    Execution Log ({data.trades.length} trades)
                </h3>
                <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                    {data.trades.map((t, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded bg-surface-2 border border-border/50 group hover:border-primary/40 transition-colors">
                            <div className="flex items-center gap-3">
                                <span className={cn(
                                    "text-[9px] font-black uppercase px-2 py-0.5 rounded",
                                    t.type === 'BUY' ? "bg-up/10 text-up" : "bg-down/10 text-down"
                                )}>
                                    {t.type}
                                </span>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-bold text-foreground">₹{t.price.toLocaleString()}</span>
                                    <span className="text-[9px] text-muted-foreground">{new Date(t.time).toLocaleTimeString()}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-muted-foreground font-mono">Qty: {t.quantity}</span>
                                <ArrowRight className="w-3 h-3 text-border group-hover:text-primary transition-colors" />
                            </div>
                        </div>
                    ))}
                    {data.trades.length === 0 && (
                        <div className="py-6 text-center text-xs text-muted-foreground italic">
                            No trades executed in this interval.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const MetricCard = ({ label, value, sub, icon, trend }: any) => (
    <div className="p-4 rounded-xl border border-border bg-surface-1/40 backdrop-blur-md relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
            {icon}
        </div>
        <div className="flex flex-col">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{label}</span>
            <div className="flex items-end gap-1">
                <span className={cn(
                    "text-xl font-black tracking-tight",
                    trend === 'up' ? "text-up" : trend === 'down' ? "text-down" : "text-foreground"
                )}>
                    {value}
                </span>
                {sub && <span className="text-xs text-muted-foreground font-medium mb-1">{sub}</span>}
            </div>
        </div>
    </div>
);
