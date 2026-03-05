"use client";

import React, { useEffect, useRef } from "react";
import { ChartLayer, useChart } from "./ChartEngine";
import { useOrderStore, OrderLine } from "@/hooks/useOrderStore";
import { cn } from "@/lib/utils";

export const HyperOrderLayer = ({ symbol }: { symbol: string }) => {
    const activeOrderLines = useOrderStore(state => state.activeOrderLines);
    const { updateOrderLinePrice, commitOrderLinePrice, cancelOrder } = useOrderStore.getState();
    const { scales, registerDraggable, unregisterDraggable } = useChart();

    // Filter lines for this symbol
    const myLines = activeOrderLines.filter(l => l.symbol === symbol && l.visible);

    // Register draggables whenever scales or myLines change
    useEffect(() => {
        if (!scales) return;

        myLines.forEach(line => {
            if (line.draggable) {
                const py = scales.y(line.price);
                registerDraggable(line.id, {
                    y: py,
                    onDrag: (newY: number) => {
                        const newPrice = scales.priceFromY(newY);
                        updateOrderLinePrice(line.id, newPrice);
                    },
                    onEnd: () => {
                        commitOrderLinePrice(line.id);
                    }
                });
            }
        });

        // Cleanup: unregister lines that are gone
        return () => {
            myLines.forEach(line => unregisterDraggable(line.id));
        };
    }, [myLines, scales, registerDraggable, unregisterDraggable]);

    const draw = (ctx: CanvasRenderingContext2D, { width, scales, mouse }: any) => {
        if (!scales || myLines.length === 0) return;
        const { y, chartW, MARGIN } = scales;

        myLines.forEach(line => {
            const py = y(line.price);
            const isBuy = line.side === 'BUY';
            const color = line.type === 'stopLoss' ? "rgba(255, 50, 50, 0.8)"
                : line.type === 'target' ? "rgba(0, 255, 100, 0.8)"
                    : "rgba(0, 180, 255, 0.8)";

            // 1. Line
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            if (line.type !== 'entry') ctx.setLineDash([4, 4]);
            ctx.moveTo(0, py);
            ctx.lineTo(chartW, py);
            ctx.stroke();
            ctx.setLineDash([]);

            // 2. Tag / Label
            const tagW = 80;
            const tagH = 20;
            const tagX = chartW - tagW;
            const tagY = py - tagH / 2;

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.roundRect(tagX, tagY, tagW + 60, tagH, 4);
            ctx.fill();

            // Text
            ctx.fillStyle = "#000";
            ctx.font = "bold 9px Inter";
            const label = `${line.type.toUpperCase()} ${line.qty} @ ${line.price.toFixed(2)}`;
            ctx.fillText(label, tagX + 5, py + 3);

            // Close Button area indicator (Visual only for now, engine handles drag)
            ctx.fillStyle = "rgba(0,0,0,0.2)";
            ctx.fillText("✕", tagX + tagW + 45, py + 3);
        });
    };

    return <ChartLayer zIndex={20} draw={draw} />;
};
