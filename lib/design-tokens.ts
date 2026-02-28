/**
 * Design Tokens — Single source of truth for all colors used in canvas/JS contexts.
 *
 * Components that use CSS/Tailwind should reference the CSS custom properties
 * via var(--token) or Tailwind classes (e.g. `bg-up`, `text-down`, `bg-surface-2`).
 *
 * Components that use HTML5 Canvas (like CustomCandlestickChart) should use
 * `getChartColors()` which reads the live CSS variables, making the canvas
 * responsive to theme changes (light ↔ dark).
 */

// ─── GROWW CLASSIC ───────────────────
export const GROWW_TOKENS: Record<keyof typeof DARK_TOKENS, string> = {
    up: "#22c55e",
    down: "#ef4444",
    primary: "#22c55e",
    surface0: "#080a0c",
    surface1: "#121418",
    surface2: "#1e2228",
    surface3: "#272a30",
    surface4: "#333842",
    chartBg: "#121418",
    chartGrid: "rgba(255, 255, 255, 0.04)",
    chartCrosshair: "rgba(255, 255, 255, 0.4)",
    chartCrosshairLabel: "#080a0c",
    chartWatermark: "rgba(255,255,255,0.02)",
    chartVolumeBull: "rgba(34, 197, 94, 0.2)",
    chartVolumeBear: "rgba(239, 68, 68, 0.2)",
    chartCurrentPriceLine: "rgba(255, 255, 255, 0.5)",
    chartAxisText: "#a1a1aa",
    orderEntryBuy: "#3b82f6",
    orderEntrySell: "#ef4444",
    orderTarget: "#22c55e",
    orderStoploss: "#ef4444",
    orderLabelBg: "rgba(18, 20, 24, 0.95)",
    foreground: "#d1d5db",
    mutedForeground: "#71717a",
    border: "rgba(255, 255, 255, 0.08)",
} as const;

// ─── MIDNIGHT PROTOCOL ───────────────────
export const MIDNIGHT_TOKENS: Record<keyof typeof DARK_TOKENS, string> = {
    up: "#475569",
    down: "#94a3b8",
    primary: "#94a3b8",
    surface0: "#000000",
    surface1: "#050505",
    surface2: "#0f172a",
    surface3: "#1e293b",
    surface4: "#334155",
    chartBg: "#000000",
    chartGrid: "rgba(255, 255, 255, 0.05)",
    chartCrosshair: "rgba(255, 255, 255, 0.2)",
    chartCrosshairLabel: "#000000",
    chartWatermark: "rgba(255,255,255,0.02)",
    chartVolumeBull: "rgba(255, 255, 255, 0.1)",
    chartVolumeBear: "rgba(255, 255, 255, 0.1)",
    chartCurrentPriceLine: "rgba(255, 255, 255, 0.3)",
    chartAxisText: "#64748b",
    orderEntryBuy: "#64748b",
    orderEntrySell: "#94a3b8",
    orderTarget: "#475569",
    orderStoploss: "#7f1d1d",
    orderLabelBg: "rgba(0, 0, 0, 0.9)",
    foreground: "#e2e8f0",
    mutedForeground: "#64748b",
    border: "rgba(255, 255, 255, 0.1)",
} as const;

// ─── ANTIGRAVITY (Default) ───────────────────
export const DARK_TOKENS = {
    // Semantic Trading
    up: "#00ff66",   // Hyper Green
    down: "#ff003c", // Hot Pink/Red

    // Primary accent
    primary: "#00e5ff", // Electric Cyan

    // Surfaces
    surface0: "#030508", // Absolute Deep Void
    surface1: "#05080f", // Card
    surface2: "#162032", // Hover
    surface3: "#1e293b", // Active
    surface4: "#334155", // Border

    // Chart
    chartBg: "#000000",
    chartGrid: "rgba(255, 255, 255, 0.04)",
    chartCrosshair: "rgba(0, 229, 255, 0.4)",
    chartCrosshairLabel: "#030508",
    chartWatermark: "rgba(255,255,255,0.02)",
    chartVolumeBull: "rgba(0, 255, 102, 0.2)",
    chartVolumeBear: "rgba(255, 0, 60, 0.2)",
    chartCurrentPriceLine: "rgba(0, 229, 255, 0.5)",
    chartAxisText: "#94a3b8", // Slate-400

    // Order Lines
    orderEntryBuy: "#00e5ff",
    orderEntrySell: "#ff003c",
    orderTarget: "#00ff66",
    orderStoploss: "#ff003c",
    orderLabelBg: "rgba(3, 5, 8, 0.95)",

    // Text
    foreground: "#e2e8f0",
    mutedForeground: "#94a3b8",
    border: "#1e293b",
} as const;

export const LIGHT_TOKENS: Record<keyof typeof DARK_TOKENS, string> = {
    // Semantic Trading
    up: "#16a34a",
    down: "#dc2626",

    // Primary accent
    primary: "#0284c7",

    // Surfaces
    surface0: "#f8fafc",
    surface1: "#ffffff",
    surface2: "#f1f5f9",
    surface3: "#e2e8f0",
    surface4: "#cbd5e1",

    // Chart
    chartBg: "#ffffff",
    chartGrid: "rgba(0, 0, 0, 0.05)",
    chartCrosshair: "rgba(2, 132, 199, 0.5)",
    chartCrosshairLabel: "#f8fafc",
    chartWatermark: "rgba(0,0,0,0.03)",
    chartVolumeBull: "rgba(22, 163, 74, 0.2)",
    chartVolumeBear: "rgba(220, 38, 38, 0.2)",
    chartCurrentPriceLine: "rgba(2, 132, 199, 0.5)",
    chartAxisText: "#334155",

    // Order Lines
    orderEntryBuy: "#0284c7",
    orderEntrySell: "#dc2626",
    orderTarget: "#16a34a",
    orderStoploss: "#dc2626",
    orderLabelBg: "rgba(255, 255, 255, 0.95)",

    // Text
    foreground: "#0f172a",
    mutedForeground: "#64748b",
    border: "#cbd5e1",
} as const;

export type DesignTokens = Record<keyof typeof DARK_TOKENS, string>;

/**
 * Reads live CSS custom properties from the document.
 * Use this in canvas-based components to respect theme changes.
 */
export function getChartColors(el?: HTMLElement): DesignTokens {
    if (typeof window === "undefined") return DARK_TOKENS;

    const root = el ?? document.documentElement;
    const s = getComputedStyle(root);
    const classes = document.documentElement.className;
    const themeName = classes.includes("midnight")
        ? "midnight"
        : classes.includes("groww")
            ? "groww"
            : classes.includes("light")
                ? "light"
                : "antigravity";

    let fallbacks: DesignTokens = DARK_TOKENS;
    if (themeName === "light") fallbacks = LIGHT_TOKENS;
    else if (themeName === "groww") fallbacks = GROWW_TOKENS;
    else if (themeName === "midnight") fallbacks = MIDNIGHT_TOKENS;

    const get = (prop: string, fallback: string) =>
        s.getPropertyValue(prop).trim() || fallback;

    return {
        up: get("--up", fallbacks.up),
        down: get("--down", fallbacks.down),
        primary: get("--primary", fallbacks.primary),
        surface0: get("--surface-0", fallbacks.surface0),
        surface1: get("--surface-1", fallbacks.surface1),
        surface2: get("--surface-2", fallbacks.surface2),
        surface3: get("--surface-3", fallbacks.surface3),
        surface4: get("--surface-4", fallbacks.surface4),
        chartBg: get("--chart-bg", fallbacks.chartBg),
        chartGrid: get("--chart-grid", fallbacks.chartGrid),
        chartCrosshair: get("--chart-crosshair", fallbacks.chartCrosshair),
        chartCrosshairLabel: fallbacks.chartCrosshairLabel,
        chartWatermark: get("--chart-watermark", fallbacks.chartWatermark),
        chartVolumeBull: get("--chart-volume-bull", fallbacks.chartVolumeBull),
        chartVolumeBear: get("--chart-volume-bear", fallbacks.chartVolumeBear),
        chartCurrentPriceLine: fallbacks.chartCurrentPriceLine,
        chartAxisText: fallbacks.chartAxisText,
        orderEntryBuy: get("--order-entry-buy", fallbacks.orderEntryBuy),
        orderEntrySell: get("--order-entry-sell", fallbacks.orderEntrySell),
        orderTarget: get("--order-target", fallbacks.orderTarget),
        orderStoploss: get("--order-stoploss", fallbacks.orderStoploss),
        orderLabelBg: get("--order-label-bg", fallbacks.orderLabelBg),
        foreground: get("--foreground", fallbacks.foreground),
        mutedForeground: get("--muted-foreground", fallbacks.mutedForeground),
        border: get("--border", fallbacks.border),
    };
}
