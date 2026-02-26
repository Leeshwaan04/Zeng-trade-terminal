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

// ─── Static Fallbacks (dark mode defaults) ───────────────────
export const DARK_TOKENS = {
    // Semantic Trading
    up: "#4ade80",   // Neon Green
    down: "#f87171", // Soft Neon Red

    // Primary accent
    primary: "#3b82f6", // Royal Blue

    // Surfaces
    surface0: "#05080f", // Deep Void
    surface1: "#0b101a", // Card
    surface2: "#162032", // Hover
    surface3: "#1e293b", // Active
    surface4: "#334155", // Border

    // Chart
    chartBg: "#05080f",
    chartGrid: "rgba(59, 130, 246, 0.08)",
    chartCrosshair: "rgba(96, 165, 250, 0.5)",
    chartCrosshairLabel: "#1e293b",
    chartWatermark: "rgba(255,255,255,0.03)",
    chartVolumeBull: "rgba(74, 222, 128, 0.25)",
    chartVolumeBear: "rgba(248, 113, 113, 0.25)",
    chartCurrentPriceLine: "rgba(255,255,255,0.4)",
    chartAxisText: "#94a3b8", // Slate-400

    // Order Lines
    orderEntryBuy: "#4ade80",
    orderEntrySell: "#f87171",
    orderTarget: "#4ade80",
    orderStoploss: "#f87171",
    orderLabelBg: "rgba(11, 16, 26, 0.95)",

    // Text
    foreground: "#e2e8f0",
    mutedForeground: "#94a3b8",
    border: "#1e293b",
} as const;

export type DesignTokens = { [K in keyof typeof DARK_TOKENS]: string };

/**
 * Reads live CSS custom properties from the document.
 * Use this in canvas-based components to respect theme changes.
 */
export function getChartColors(el?: HTMLElement): DesignTokens {
    if (typeof window === "undefined") return DARK_TOKENS;

    const root = el ?? document.documentElement;
    const s = getComputedStyle(root);

    const get = (prop: string, fallback: string) =>
        s.getPropertyValue(prop).trim() || fallback;

    return {
        up: get("--up", DARK_TOKENS.up),
        down: get("--down", DARK_TOKENS.down),
        primary: get("--primary", DARK_TOKENS.primary),
        surface0: get("--surface-0", DARK_TOKENS.surface0),
        surface1: get("--surface-1", DARK_TOKENS.surface1),
        surface2: get("--surface-2", DARK_TOKENS.surface2),
        surface3: get("--surface-3", DARK_TOKENS.surface3),
        surface4: get("--surface-4", DARK_TOKENS.surface4),
        chartBg: get("--chart-bg", DARK_TOKENS.chartBg),
        chartGrid: get("--chart-grid", DARK_TOKENS.chartGrid),
        chartCrosshair: get("--chart-crosshair", DARK_TOKENS.chartCrosshair),
        chartCrosshairLabel: DARK_TOKENS.chartCrosshairLabel,
        chartWatermark: get("--chart-watermark", DARK_TOKENS.chartWatermark),
        chartVolumeBull: get("--chart-volume-bull", DARK_TOKENS.chartVolumeBull),
        chartVolumeBear: get("--chart-volume-bear", DARK_TOKENS.chartVolumeBear),
        chartCurrentPriceLine: DARK_TOKENS.chartCurrentPriceLine,
        chartAxisText: DARK_TOKENS.chartAxisText,
        orderEntryBuy: get("--order-entry-buy", DARK_TOKENS.orderEntryBuy),
        orderEntrySell: get("--order-entry-sell", DARK_TOKENS.orderEntrySell),
        orderTarget: get("--order-target", DARK_TOKENS.orderTarget),
        orderStoploss: get("--order-stoploss", DARK_TOKENS.orderStoploss),
        orderLabelBg: get("--order-label-bg", DARK_TOKENS.orderLabelBg),
        foreground: get("--foreground", DARK_TOKENS.foreground),
        mutedForeground: get("--muted-foreground", DARK_TOKENS.mutedForeground),
        border: get("--border", DARK_TOKENS.border),
    };
}
