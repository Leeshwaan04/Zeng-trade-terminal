"use client";

import React from "react";
import { ChartLayer } from "./ChartEngine";
import { Drawing } from "@/types/drawing";

export const DrawingLayer = ({ drawings, previewDrawing }: { drawings: Drawing[], previewDrawing?: Drawing | null }) => {

    const draw = (ctx: CanvasRenderingContext2D, { scales }: any) => {
        if (!scales) return;
        const { x, y } = scales;

        const renderDrawing = (d: Drawing) => {
            if (d.points.length < 1) return;

            const p1 = d.points[0];
            const x1 = x(p1.index);
            const y1 = y(p1.price);

            ctx.lineWidth = d.style.lineWidth;
            ctx.strokeStyle = d.style.color;
            ctx.fillStyle = d.style.fillColor || "transparent";

            if (d.style.lineStyle === "dashed") ctx.setLineDash([5, 5]);
            else ctx.setLineDash([]);

            ctx.beginPath();

            if (d.type === "TRENDLINE") {
                if (d.points.length < 2) {
                    // Draw dot
                    ctx.arc(x1, y1, 3, 0, Math.PI * 2);
                    ctx.fill();
                    return;
                }
                const p2 = d.points[1];
                const x2 = x(p2.index);
                const y2 = y(p2.price);
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }

            if (d.type === "RECTANGLE") {
                if (d.points.length < 2) return;
                const p2 = d.points[1];
                const x2 = x(p2.index);
                const y2 = y(p2.price);

                ctx.rect(x1, y1, x2 - x1, y2 - y1);
                ctx.stroke();
                if (d.style.fillColor) ctx.fill();
            }
        };

        // Draw Committed Drawings
        drawings.forEach(renderDrawing);

        // Draw Preview (Active creation)
        if (previewDrawing) {
            renderDrawing(previewDrawing);
        }
    };

    return <ChartLayer zIndex={40} draw={draw} />;
};
