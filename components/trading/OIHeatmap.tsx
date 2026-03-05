"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Layers, Maximize2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface OIHeatmapProps {
    symbol?: string;
}

export const OIHeatmap = ({ symbol = "NIFTY" }: OIHeatmapProps) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hoverCell, setHoverCell] = useState<{ strike: string; time: string; ce: number, pe: number } | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/kite/oi-history?symbol=${symbol}`);
            const json = await res.json();
            if (json.status === "success") {
                setData(json.data);
            }
        } catch (error) {
            console.error("Failed to fetch OI heatmap data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // 1 min sync
        return () => clearInterval(interval);
    }, [symbol]);

    // Process data for the grid
    const { strikes, times, grid } = useMemo(() => {
        if (data.length === 0) return { strikes: [], times: [], grid: {} };

        const allStrikes = new Set<string>();
        const allTimes: string[] = [];
        const mapping: any = {};

        data.forEach((snapshot) => {
            allTimes.push(snapshot.time);
            Object.keys(snapshot.strikes).forEach((s) => allStrikes.add(s));
            mapping[snapshot.time] = snapshot.strikes;
        });

        const sortedStrikes = Array.from(allStrikes).sort((a, b) => parseFloat(b) - parseFloat(a)); // Descending
        return { strikes: sortedStrikes, times: allTimes, grid: mapping };
    }, [data]);

    // Draw Heatmap
    useEffect(() => {
        if (!canvasRef.current || strikes.length === 0 || times.length === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const cellWidth = width / times.length;
        const cellHeight = height / strikes.length;

        ctx.clearRect(0, 0, width, height);

        times.forEach((time, tIdx) => {
            strikes.forEach((strike, sIdx) => {
                const strikeData = grid[time]?.[strike];
                if (!strikeData) return;

                // Sentiment Color: (PE - CE) / (PE + CE) -> -1 to 1
                const total = strikeData.ce_oi + strikeData.pe_oi;
                const score = (strikeData.pe_oi - strikeData.ce_oi) / total;

                // Render Color: Green for PE Heavy (Support), Red for CE Heavy (Resistance)
                let color = "rgba(40, 40, 40, 0.5)"; // Neutral
                if (score > 0) {
                    color = `rgba(16, 185, 129, ${Math.abs(score)})`; // Emerald
                } else if (score < 0) {
                    color = `rgba(239, 68, 68, ${Math.abs(score)})`; // Rose
                }

                ctx.fillStyle = color;
                ctx.fillRect(tIdx * cellWidth, sIdx * cellHeight, cellWidth - 1, cellHeight - 1);
            });
        });
    }, [strikes, times, grid]);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!canvasRef.current || strikes.length === 0) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const tIdx = Math.floor(x / (rect.width / times.length));
        const sIdx = Math.floor(y / (rect.height / strikes.length));

        if (tIdx >= 0 && tIdx < times.length && sIdx >= 0 && sIdx < strikes.length) {
            const time = times[tIdx];
            const strike = strikes[sIdx];
            const strikeData = grid[time]?.[strike];
            if (strikeData) {
                setHoverCell({ strike, time, ce: strikeData.ce_oi, pe: strikeData.pe_oi });
            }
        } else {
            setHoverCell(null);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] border border-white/5 rounded-lg overflow-hidden font-mono shadow-2xl">
            {/* Toolbar */}
            <div className="p-2 border-b border-white/5 bg-zinc-900/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-100 italic">Strike-Time OI Heatmap</h2>
                    <span className="text-[9px] font-bold text-zinc-600 ml-2">{symbol} (Snapshot: 3m)</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchData} className="p-1 hover:text-emerald-400 transition-colors">
                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                    </button>
                    <button className="p-1 hover:text-primary transition-colors"><Maximize2 className="w-3.5 h-3.5" /></button>
                </div>
            </div>

            {/* Heatmap Area */}
            <div className="flex-1 relative bg-[radial-gradient(circle_at_center,_#111_0%,_#000_100%)]">
                {/* Strike Labels (Fixed Y-Axis) */}
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-black/80 border-r border-white/5 flex flex-col z-10">
                    {strikes.map((s, i) => (
                        <div key={s} className="flex-1 flex items-center justify-center text-[7px] font-black text-zinc-600 border-b border-white/5 px-1 truncate">
                            {s}
                        </div>
                    ))}
                </div>

                {/* Canvas Grid */}
                <canvas
                    ref={canvasRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={() => setHoverCell(null)}
                    className="absolute inset-0 left-12 cursor-crosshair"
                />

                {/* Legend Overlay */}
                <div className="absolute top-2 right-2 flex flex-col gap-1 z-20 pointer-events-none bg-black/60 p-1.5 rounded-md border border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                        <span className="text-[7px] text-zinc-400 uppercase font-black">Support Buildup</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
                        <span className="text-[7px] text-zinc-400 uppercase font-black">Resistance Shift</span>
                    </div>
                </div>

                {/* Tooltip Overlay */}
                {hoverCell && (
                    <div className="absolute bottom-2 left-14 z-30 p-2 bg-black/90 border border-white/10 rounded-md shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-150 backdrop-blur-xl">
                        <div className="text-[8px] font-black text-zinc-500 uppercase border-b border-white/10 pb-1 mb-1">
                            {hoverCell.strike} @ {hoverCell.time}
                        </div>
                        <div className="flex gap-4">
                            <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-500 uppercase">CE OI</span>
                                <span className="text-[10px] font-black text-red-400">{(hoverCell.ce / 1000000).toFixed(2)}M</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[7px] text-zinc-500 uppercase">PE OI</span>
                                <span className="text-[10px] font-black text-emerald-400">{(hoverCell.pe / 1000000).toFixed(2)}M</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Time Labels (X-Axis) */}
            <div className="h-6 border-t border-white/5 flex items-center overflow-hidden bg-black/40 px-12">
                {times.filter((_, i) => i % 5 === 0).map((t) => (
                    <div key={t} className="flex-1 text-[7px] font-black text-zinc-600 text-center border-r border-white/5 opacity-60">
                        {t}
                    </div>
                ))}
            </div>
        </div>
    );
};
