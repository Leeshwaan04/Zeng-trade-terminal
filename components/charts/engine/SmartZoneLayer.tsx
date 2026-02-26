import React from "react";
import { ChartLayer } from "./ChartEngine";
import { detectSmartZones, detectFVGs, Zone } from "./utils/smartZones";

export const SmartZoneLayer = ({ showZones = true, showFVG = true }: { showZones?: boolean, showFVG?: boolean }) => {

    const draw = (ctx: CanvasRenderingContext2D, { data, scales }: any) => {
        if (!data || data.length === 0 || !scales) return;
        const { x, y } = scales;

        // 1. Detect
        let zones: Zone[] = [];
        if (showZones) zones = [...zones, ...detectSmartZones(data)];
        if (showFVG) zones = [...zones, ...detectFVGs(data)];

        // 2. Draw
        zones.forEach(zone => {
            const startX = x(zone.indexStart);
            const endX = x(data.length + 5); // Extend to right

            if (zone.type === "RESISTANCE") {
                const py = y(zone.priceStart);
                ctx.beginPath();
                ctx.strokeStyle = "rgba(255, 50, 50, 0.8)";
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.moveTo(startX, py);
                ctx.lineTo(endX, py);
                ctx.stroke();
                ctx.setLineDash([]);

                // Label
                ctx.fillStyle = "rgba(255, 50, 50, 0.8)";
                ctx.font = "10px Inter";
                ctx.fillText("RES", endX - 30, py - 5);
            }

            if (zone.type === "SUPPORT") {
                const py = y(zone.priceStart);
                ctx.beginPath();
                ctx.strokeStyle = "rgba(0, 255, 100, 0.8)";
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.moveTo(startX, py);
                ctx.lineTo(endX, py);
                ctx.stroke();
                ctx.setLineDash([]);

                // Label
                ctx.fillStyle = "rgba(0, 255, 100, 0.8)";
                ctx.font = "10px Inter";
                ctx.fillText("SUP", endX - 30, py + 12);
            }

            if (zone.type === "FVG_BULL" || zone.type === "FVG_BEAR") {
                const y1 = y(zone.priceStart);
                const y2 = y(zone.priceEnd);
                const h = y2 - y1;

                ctx.fillStyle = zone.type === "FVG_BULL"
                    ? "rgba(0, 255, 255, 0.15)" // Cyan tint
                    : "rgba(255, 0, 255, 0.15)"; // Magenta tint

                ctx.fillRect(startX, y1, endX - startX, h);

                // Border
                ctx.strokeStyle = zone.type === "FVG_BULL"
                    ? "rgba(0, 255, 255, 0.4)"
                    : "rgba(255, 0, 255, 0.4)";
                ctx.strokeRect(startX, y1, endX - startX, h);
            }
        });
    };

    return <ChartLayer zIndex={5} draw={draw} />;
};
