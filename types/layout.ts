export type WidgetType =
    | "CHART"
    | "WATCHLIST"
    | "ORDER_BOOK"
    | "POSITIONS"
    | "OPTION_CHAIN"
    | "STRATEGY_BUILDER"
    | "PAYOFF_DIAGRAM"
    | "PORTFOLIO_HEATMAP"
    | "ALGO_RULES"
    | "AUTOMATE_BUILDER"
    | "ORDER_ENTRY"
    | "WHALE_SONAR"
    | "STRADDLE"
    | "HYPER_CHART";

// ... (existing constants) ...

export const WIDGET_COLORS = [
    { id: "blue", label: "Blue", hex: "#3b82f6" },
    { id: "orange", label: "Orange", hex: "#f97316" },
    { id: "purple", label: "Purple", hex: "#a855f7" },
    { id: "green", label: "Green", hex: "#22c55e" },
    { id: "yellow", label: "Yellow", hex: "#eab308" },
] as const;
export type WidgetColorGroup = (typeof WIDGET_COLORS)[number]["id"];


export const ORDER_TYPES = ["MARKET", "LIMIT", "SL", "SL-M"] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const PRODUCT_TYPES = ["CNC", "NRML", "MIS", "MTF"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const ORDER_VARIETIES = ["regular", "amo", "co", "iceberg"] as const;
export type OrderVariety = (typeof ORDER_VARIETIES)[number];

export const VALIDITY_TYPES = ["DAY", "IOC", "TTL"] as const;
export type ValidityType = (typeof VALIDITY_TYPES)[number];

export type MultiChartViewMode = "1x1" | "1x2" | "2x1" | "2x2";

export interface MultiChartConfig {
    viewMode: MultiChartViewMode;
    symbols: [string, string?, string?, string?]; // Up to 4 symbols
}

export interface WidgetConfig {
    id: string;
    type: WidgetType;
    title: string;
    symbol?: string; // Standard single-symbol for charts/chains
    colorGroup?: WidgetColorGroup; // Grouping matching widgets to share symbol
    multiChartConfig?: MultiChartConfig; // For Multiview grid charts
}

export interface GridArea {
    id: string;
    gridArea: string; // CSS grid-area property (e.g., "1 / 1 / 3 / 2")
    widgets: WidgetConfig[]; // Stack of widgets in this area
    activeWidgetId: string;
}

export interface WorkspaceConfig {
    id: string;
    name: string;
    category: "Standard" | "Pro" | "Analysis";
    gridTemplateColumns: string;
    gridTemplateRows: string;
    areas: GridArea[];
    icon?: string; // Lucide icon name
}

export const PRESET_LAYOUTS: Record<string, WorkspaceConfig> = {
    "standard": {
        id: "standard",
        name: "Standard",
        category: "Standard",
        gridTemplateColumns: "250px 1fr 300px",
        gridTemplateRows: "1fr",
        icon: "LayoutDashboard",
        areas: [
            {
                id: "left-sidebar",
                gridArea: "1 / 1 / 2 / 2",
                widgets: [{ id: "wl-1", type: "WATCHLIST", title: "Watchlist" }],
                activeWidgetId: "wl-1"
            },
            {
                id: "main-chart",
                gridArea: "1 / 2 / 2 / 3",
                widgets: [{ id: "chart-1", type: "CHART", title: "Chart", symbol: "NIFTY 50" }],
                activeWidgetId: "chart-1"
            },
            {
                id: "right-panel",
                gridArea: "1 / 3 / 2 / 4",
                widgets: [
                    { id: "oe-1", type: "ORDER_ENTRY", title: "Trade", symbol: "NIFTY 50" },
                    { id: "ob-1", type: "ORDER_BOOK", title: "Depth" },
                    { id: "pos-1", type: "POSITIONS", title: "Positions" }
                ],
                activeWidgetId: "oe-1"
            }
        ]
    },
    "scalping": {
        id: "scalping",
        name: "Sahi Scalper",
        category: "Pro",
        gridTemplateColumns: "1.5fr 1fr",
        gridTemplateRows: "1fr 1fr",
        icon: "Zap",
        areas: [
            {
                id: "main-chart-area",
                gridArea: "1 / 1 / 3 / 2",
                widgets: [{ id: "sc-chart-1", type: "CHART", title: "NIFTY 50", symbol: "NIFTY 50" }],
                activeWidgetId: "sc-chart-1"
            },
            {
                id: "sec-chart-area",
                gridArea: "1 / 2 / 2 / 3",
                widgets: [{ id: "sc-chart-2", type: "CHART", title: "BANKNIFTY", symbol: "BANKNIFTY" }],
                activeWidgetId: "sc-chart-2"
            },
            {
                id: "tools-area",
                gridArea: "2 / 2 / 3 / 3",
                widgets: [
                    { id: "sc-chain", type: "OPTION_CHAIN", title: "Option Chain", symbol: "NIFTY 50" },
                    { id: "sc-pos", type: "POSITIONS", title: "Positions" },
                    { id: "sc-book", type: "ORDER_BOOK", title: "Order Book" }
                ],
                activeWidgetId: "sc-chain"
            }
        ]
    },
    "analysis": {
        id: "analysis",
        name: "Multi-Chart",
        category: "Analysis",
        gridTemplateColumns: "250px 1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        icon: "Grid2x2",
        areas: [
            {
                id: "sidebar",
                gridArea: "1 / 1 / 3 / 2",
                widgets: [{ id: "an-wl", type: "WATCHLIST", title: "Scan List" }],
                activeWidgetId: "an-wl"
            },
            {
                id: "chart-1",
                gridArea: "1 / 2 / 2 / 3",
                widgets: [{ id: "an-c1", type: "CHART", title: "Chart 1", symbol: "NIFTY 50" }],
                activeWidgetId: "an-c1"
            },
            {
                id: "chart-2",
                gridArea: "1 / 3 / 2 / 4",
                widgets: [{ id: "an-c2", type: "CHART", title: "Chart 2", symbol: "BANKNIFTY" }],
                activeWidgetId: "an-c2"
            },
            {
                id: "chart-3",
                gridArea: "2 / 2 / 3 / 3",
                widgets: [{ id: "an-c3", type: "CHART", title: "Chart 3", symbol: "RELIANCE" }],
                activeWidgetId: "an-c3"
            },
            {
                id: "chart-4",
                gridArea: "2 / 3 / 3 / 4",
                widgets: [{ id: "an-c4", type: "CHART", title: "Chart 4", symbol: "HDFCBANK" }],
                activeWidgetId: "an-c4"
            }
        ]
    },
    "options": {
        id: "options",
        name: "Options Trader",
        category: "Pro",
        gridTemplateColumns: "1.2fr 1fr 300px",
        gridTemplateRows: "1fr",
        icon: "Layers",
        areas: [
            {
                id: "chain-area",
                gridArea: "1 / 1 / 2 / 2",
                widgets: [{ id: "opt-chain", type: "OPTION_CHAIN", title: "Option Chain", symbol: "NIFTY 50" }],
                activeWidgetId: "opt-chain"
            },
            {
                id: "chart-area",
                gridArea: "1 / 2 / 2 / 3",
                widgets: [{ id: "opt-chart", type: "CHART", title: "Strategy Chart", symbol: "NIFTY 50" }],
                activeWidgetId: "opt-chart"
            },
            {
                id: "right-panel",
                gridArea: "1 / 3 / 2 / 4",
                widgets: [
                    { id: "opt-oe", type: "ORDER_ENTRY", title: "Order Info", symbol: "NIFTY 50" },
                    { id: "opt-pos", type: "POSITIONS", title: "Net P&L" }
                ],
                activeWidgetId: "opt-oe"
            }
        ]
    },
    "legend-strategy": {
        id: "legend-strategy",
        name: "Legend Strategy",
        category: "Pro",
        gridTemplateColumns: "1fr 400px",
        gridTemplateRows: "1.5fr 1fr",
        icon: "BookOpen",
        areas: [
            {
                id: "top-main",
                gridArea: "1 / 1 / 2 / 2",
                widgets: [{ id: "leg-chain", type: "OPTION_CHAIN", title: "Strategy Builder", symbol: "NIFTY 50" }],
                activeWidgetId: "leg-chain"
            },
            {
                id: "top-right",
                gridArea: "1 / 2 / 2 / 3",
                widgets: [{ id: "leg-payoff", type: "PAYOFF_DIAGRAM", title: "Payoff Projection" }],
                activeWidgetId: "leg-payoff"
            },
            {
                id: "bottom-left",
                gridArea: "2 / 1 / 3 / 2",
                widgets: [{ id: "leg-builder", type: "STRATEGY_BUILDER", title: "Active Strategy" }],
                activeWidgetId: "leg-builder"
            },
            {
                id: "bottom-right",
                gridArea: "2 / 2 / 3 / 3",
                widgets: [
                    { id: "leg-pos", type: "POSITIONS", title: "Positions" },
                    { id: "leg-oe", type: "ORDER_ENTRY", title: "Execution Hub", symbol: "NIFTY 50" }
                ],
                activeWidgetId: "leg-pos"
            }
        ]
    },
    "algorithmic": {
        id: "algorithmic",
        name: "Algo Studio",
        category: "Pro",
        gridTemplateColumns: "1fr 400px",
        gridTemplateRows: "1fr 1fr",
        icon: "Cpu",
        areas: [
            {
                id: "chart-main",
                gridArea: "1 / 1 / 3 / 2",
                widgets: [
                    { id: "algo-chart", type: "CHART", title: "Strategy Chart", symbol: "NIFTY 50" },
                    { id: "auto-builder", type: "AUTOMATE_BUILDER", title: "Logic Builder" }
                ],
                activeWidgetId: "auto-builder"
            },
            {
                id: "algo-panel",
                gridArea: "1 / 2 / 2 / 3",
                widgets: [{ id: "algo-rules", type: "ALGO_RULES", title: "Automation Rules" }],
                activeWidgetId: "algo-rules"
            },
            {
                id: "positions-panel",
                gridArea: "2 / 2 / 3 / 3",
                widgets: [
                    { id: "algo-pos", type: "POSITIONS", title: "Positions" },
                    { id: "algo-oe", type: "ORDER_ENTRY", title: "Manual Override", symbol: "NIFTY 50" }
                ],
                activeWidgetId: "algo-pos"
            }
        ]
    },
    "cyber-scalp": {
        id: "cyber-scalp",
        name: "Cyber-Scalp (Neural)",
        category: "Pro",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 350px",
        icon: "Brain",
        areas: [
            {
                id: "spot-chart",
                gridArea: "1 / 1 / 2 / 2",
                widgets: [{ id: "cs-spot", type: "CHART", title: "Spot [NIFTY]", symbol: "NIFTY 50" }],
                activeWidgetId: "cs-spot"
            },
            {
                id: "atm-chart",
                gridArea: "1 / 2 / 2 / 3",
                widgets: [{ id: "cs-atm", type: "CHART", title: "ATM Option [Dynamic]", symbol: "NIFTY24SEP25500CE" }], // Placeholder
                activeWidgetId: "cs-atm"
            },
            {
                id: "blitz-pad",
                gridArea: "2 / 1 / 3 / 3",
                widgets: [
                    { id: "cs-oe", type: "ORDER_ENTRY", title: "Blitz Entry", symbol: "NIFTY 50" },
                    { id: "cs-pos", type: "POSITIONS", title: "Scalp Positions" }
                ],
                activeWidgetId: "cs-oe"
            }
        ]
    },
    "whale": {
        id: "whale",
        name: "Whale Hunter",
        category: "Analysis",
        gridTemplateColumns: "1fr 350px",
        gridTemplateRows: "1fr",
        icon: "Radar",
        areas: [
            {
                id: "main-chart",
                gridArea: "1 / 1 / 2 / 2",
                widgets: [{ id: "wh-chart", type: "CHART", title: "NIFTY 50", symbol: "NIFTY 50" }],
                activeWidgetId: "wh-chart"
            },
            {
                id: "sonar-panel",
                gridArea: "1 / 2 / 2 / 3",
                widgets: [
                    { id: "wh-sonar", type: "WHALE_SONAR", title: "Whale Sonar" },
                    { id: "wh-book", type: "ORDER_BOOK", title: "Market Depth" }
                ],
                activeWidgetId: "wh-sonar"
            }
        ]
    },
    "hyper": {
        id: "hyper",
        name: "Hyper-Charts Beta",
        category: "Analysis",
        gridTemplateColumns: "1fr",
        gridTemplateRows: "1fr",
        icon: "Cpu",
        areas: [
            {
                id: "hyper-main",
                gridArea: "1 / 1 / 2 / 2",
                widgets: [{ id: "h-chart", type: "HYPER_CHART", title: "Hyper Engine", symbol: "NIFTY 50" }],
                activeWidgetId: "h-chart"
            }
        ]
    },
    "groww-classic": {
        id: "groww-classic",
        name: "Groww Classic",
        category: "Standard",
        gridTemplateColumns: "minmax(280px, 0.55fr) minmax(280px, 0.55fr) 1.8fr",
        gridTemplateRows: "1.2fr 1fr",
        icon: "LayoutGrid",
        areas: [
            {
                id: "gc-watchlist",
                gridArea: "1 / 1 / 2 / 3",
                widgets: [{ id: "gc-wl", type: "WATCHLIST", title: "Watchlist" }],
                activeWidgetId: "gc-wl"
            },
            {
                id: "gc-positions",
                gridArea: "2 / 1 / 3 / 2",
                widgets: [{ id: "gc-pos", type: "POSITIONS", title: "Positions" }],
                activeWidgetId: "gc-pos"
            },
            {
                id: "gc-orders",
                gridArea: "2 / 2 / 3 / 3",
                widgets: [{ id: "gc-ob", type: "ORDER_BOOK", title: "Orders" }],
                activeWidgetId: "gc-ob"
            },
            {
                id: "gc-chart",
                gridArea: "1 / 3 / 3 / 4",
                widgets: [
                    { id: "gc-chart-1", type: "CHART", title: "Chart", symbol: "NIFTY 50" },
                    { id: "gc-oc", type: "OPTION_CHAIN", title: "Option Chain", symbol: "NIFTY 50" }
                ],
                activeWidgetId: "gc-chart-1"
            }
        ]
    },
    "915-advanced": {
        id: "915-advanced",
        name: "915 Advanced",
        category: "Pro",
        gridTemplateColumns: "320px 1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        icon: "ShieldAlert",
        areas: [
            {
                id: "adv-watchlist",
                gridArea: "1 / 1 / 3 / 2",
                widgets: [{ id: "adv-wl", type: "WATCHLIST", title: "Global Watchlist" }],
                activeWidgetId: "adv-wl"
            },
            {
                id: "adv-chart-1",
                gridArea: "1 / 2 / 2 / 3",
                widgets: [{ id: "adv-c1", type: "CHART", title: "Spot Chart", symbol: "NIFTY 50" }],
                activeWidgetId: "adv-c1"
            },
            {
                id: "adv-straddle",
                gridArea: "1 / 3 / 2 / 4",
                widgets: [{ id: "adv-str", type: "STRADDLE", title: "Straddle Decay" }],
                activeWidgetId: "adv-str"
            },
            {
                id: "adv-options",
                gridArea: "2 / 2 / 3 / 4",
                widgets: [
                    { id: "adv-oc", type: "OPTION_CHAIN", title: "Option Chain", symbol: "NIFTY 50" },
                    { id: "adv-pos", type: "POSITIONS", title: "Net Positions" }
                ],
                activeWidgetId: "adv-oc"
            }
        ]
    }
};
