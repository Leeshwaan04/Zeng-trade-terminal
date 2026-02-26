"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { WidgetType, GridArea, WorkspaceConfig } from "@/types/layout";
import {
    X,
    RotateCcw,
    Save,
    LayoutGrid,
    BarChart3,
    ListOrdered,
    BookOpen,
    Activity,
    Columns,
    Grid3X3,
    Shield,
    TrendingUp,
    Plus,
    Sparkles,
    Link2,
    Lightbulb,
    Zap,
    Target,
    LineChart,
    ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════
   WIDGET METADATA
   ═══════════════════════════════════════════════════════════ */

const WIDGET_META: Record<WidgetType, { label: string; icon: React.ReactNode; color: string; desc: string }> = {
    CHART: { label: "Chart", icon: <BarChart3 className="w-3.5 h-3.5" />, color: "text-foreground", desc: "Candlestick charts with indicators" },
    WATCHLIST: { label: "Watchlist", icon: <ListOrdered className="w-3.5 h-3.5" />, color: "text-foreground", desc: "Live streaming quotes" },
    ORDER_BOOK: { label: "Market Depth", icon: <BookOpen className="w-3.5 h-3.5" />, color: "text-purple-400", desc: "Level 2 bid/ask data" },
    POSITIONS: { label: "Positions", icon: <Activity className="w-3.5 h-3.5" />, color: "text-green-400", desc: "Open trades & P&L" },
    OPTION_CHAIN: { label: "Option Chain", icon: <Grid3X3 className="w-3.5 h-3.5" />, color: "text-yellow-400", desc: "Strikes, premiums & Greeks" },
    STRATEGY_BUILDER: { label: "Strategy Builder", icon: <Shield className="w-3.5 h-3.5" />, color: "text-pink-400", desc: "Multi-leg option strategies" },
    PAYOFF_DIAGRAM: { label: "Payoff Diagram", icon: <TrendingUp className="w-3.5 h-3.5" />, color: "text-orange-400", desc: "P&L visualization curve" },
    PORTFOLIO_HEATMAP: { label: "Portfolio Heatmap", icon: <LayoutGrid className="w-3.5 h-3.5" />, color: "text-rose-400", desc: "Visual sizing of holdings" },
    ORDER_ENTRY: { label: "Order Entry", icon: <Columns className="w-3.5 h-3.5" />, color: "text-emerald-400", desc: "Buy/Sell execution panel" },
};

/* ═══════════════════════════════════════════════════════════
   GRID TEMPLATES
   ═══════════════════════════════════════════════════════════ */

const GRID_TEMPLATES = [
    { id: "2-col", label: "2 Column", cols: "1fr 1fr", rows: "1fr", slots: 2 },
    { id: "3-col", label: "3 Column", cols: "250px 1fr 300px", rows: "1fr", slots: 3 },
    { id: "2x2", label: "2×2 Grid", cols: "1fr 1fr", rows: "1fr 1fr", slots: 4 },
    { id: "sidebar-2", label: "Sidebar + Stack", cols: "250px 1fr", rows: "1fr 1fr", slots: 3 },
    { id: "main-sidebar", label: "Main + Sidebar", cols: "1fr 400px", rows: "1.5fr 1fr", slots: 4 },
    { id: "triple-stack", label: "Triple Stack", cols: "1fr", rows: "1fr 1fr 1fr", slots: 3 },
];

/* ═══════════════════════════════════════════════════════════
   🧠 AI TRADING STYLE PROFILES — The Innovation
   
   These profiles encode the "ideal workspace" for different
   trading styles based on what pro traders actually use.
   No other terminal offers this.
   ═══════════════════════════════════════════════════════════ */

interface TradingProfile {
    id: string;
    name: string;
    icon: React.ReactNode;
    gradient: string;
    description: string;
    template: string;
    widgets: WidgetType[][];  // Per slot
    explanation: string;
}

const AI_PROFILES: TradingProfile[] = [
    {
        id: "scalper",
        name: "Scalper",
        icon: <Zap className="w-4 h-4" />,
        gradient: "from-yellow-500 to-orange-600",
        description: "Sub-minute entries, tight stops, high frequency",
        template: "main-sidebar",
        widgets: [
            ["CHART"],                          // Big chart top-left
            ["ORDER_BOOK"],                     // Depth top-right
            ["POSITIONS", "ORDER_ENTRY"],        // Positions + quick trade bottom-left
            ["WATCHLIST"],                       // Scanner bottom-right
        ],
        explanation: "📊 Large chart for tape reading · 📕 Market depth for entry timing · ⚡ Quick order panel for speed"
    },
    {
        id: "swing",
        name: "Swing Trader",
        icon: <LineChart className="w-4 h-4" />,
        gradient: "bg-surface-2 border border-border",
        description: "Multi-day holds, technical analysis focus",
        template: "3-col",
        widgets: [
            ["WATCHLIST"],                       // Watchlist left sidebar
            ["CHART"],                           // Main chart center
            ["ORDER_ENTRY", "POSITIONS"],         // Trade + positions right
        ],
        explanation: "📋 Watchlist to scan setups · 📈 Full-width chart for pattern analysis · 💼 Positions to track swing P&L"
    },
    {
        id: "options",
        name: "Options Trader",
        icon: <Grid3X3 className="w-4 h-4" />,
        gradient: "from-purple-500 to-pink-600",
        description: "Multi-leg strategies, Greeks, payoff analysis",
        template: "main-sidebar",
        widgets: [
            ["OPTION_CHAIN"],                    // Chain top-left
            ["PAYOFF_DIAGRAM"],                  // Payoff top-right
            ["STRATEGY_BUILDER"],                // Builder bottom-left
            ["POSITIONS", "ORDER_ENTRY"],          // Execution bottom-right
        ],
        explanation: "🔗 Chain → Builder → Payoff flow · 📐 Visual P&L before execution · 🎯 All 4 panels work together"
    },
    {
        id: "analyst",
        name: "Market Analyst",
        icon: <Target className="w-4 h-4" />,
        gradient: "from-emerald-500 to-teal-600",
        description: "Multi-chart comparison, deep research",
        template: "2x2",
        widgets: [
            ["CHART"],                           // NIFTY chart
            ["CHART"],                           // BANKNIFTY chart
            ["WATCHLIST"],                       // Sector watchlist
            ["ORDER_BOOK", "POSITIONS"],          // Depth + holdings
        ],
        explanation: "🔍 Side-by-side index comparison · 📊 Sector-wise scanning · 📈 Correlation analysis"
    },
];

/* ═══════════════════════════════════════════════════════════
   🔗 SMART WIDGET LINKING — Contextual Recommendations
   
   When a user adds a widget, suggest complementary widgets.
   ═══════════════════════════════════════════════════════════ */

interface SmartSuggestion {
    trigger: WidgetType;
    recommend: WidgetType;
    reason: string;
    linkType: "symbol" | "data" | "workflow";
}

const SMART_SUGGESTIONS: SmartSuggestion[] = [
    { trigger: "CHART", recommend: "ORDER_BOOK", reason: "Add depth for precise entry timing", linkType: "symbol" },
    { trigger: "CHART", recommend: "ORDER_ENTRY", reason: "Quick execution from chart analysis", linkType: "symbol" },
    { trigger: "OPTION_CHAIN", recommend: "STRATEGY_BUILDER", reason: "Build multi-leg strategies from the chain", linkType: "workflow" },
    { trigger: "OPTION_CHAIN", recommend: "PAYOFF_DIAGRAM", reason: "Visualize P&L before entering trades", linkType: "workflow" },
    { trigger: "STRATEGY_BUILDER", recommend: "PAYOFF_DIAGRAM", reason: "See real-time payoff as you build", linkType: "data" },
    { trigger: "WATCHLIST", recommend: "CHART", reason: "Chart any symbol from your watchlist", linkType: "symbol" },
    { trigger: "POSITIONS", recommend: "CHART", reason: "Monitor open position charts", linkType: "symbol" },
    { trigger: "ORDER_BOOK", recommend: "ORDER_ENTRY", reason: "Execute at visible bid/ask levels", linkType: "symbol" },
];

const LINK_TYPE_LABELS: Record<string, { label: string; color: string }> = {
    symbol: { label: "Symbol Linked", color: "text-primary bg-primary/10 border-primary/20" },
    data: { label: "Data Linked", color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
    workflow: { label: "Workflow Linked", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
};

/* ═══════════════════════════════════════════════════════════
   AREA GENERATOR
   ═══════════════════════════════════════════════════════════ */

function generateAreas(templateId: string, widgetOverrides?: WidgetType[][]): GridArea[] {
    const ts = Date.now();

    const areaConfigs: Record<string, { gridAreas: string[] }> = {
        "2-col": { gridAreas: ["1 / 1 / 2 / 2", "1 / 2 / 2 / 3"] },
        "3-col": { gridAreas: ["1 / 1 / 2 / 2", "1 / 2 / 2 / 3", "1 / 3 / 2 / 4"] },
        "2x2": { gridAreas: ["1 / 1 / 2 / 2", "1 / 2 / 2 / 3", "2 / 1 / 3 / 2", "2 / 2 / 3 / 3"] },
        "sidebar-2": { gridAreas: ["1 / 1 / 3 / 2", "1 / 2 / 2 / 3", "2 / 2 / 3 / 3"] },
        "main-sidebar": { gridAreas: ["1 / 1 / 2 / 2", "1 / 2 / 2 / 3", "2 / 1 / 3 / 2", "2 / 2 / 3 / 3"] },
        "triple-stack": { gridAreas: ["1 / 1 / 2 / 2", "2 / 1 / 3 / 2", "3 / 1 / 4 / 2"] },
    };

    const defaultsMap: Record<string, WidgetType[][]> = {
        "2-col": [["CHART"], ["WATCHLIST"]],
        "3-col": [["WATCHLIST"], ["CHART"], ["ORDER_ENTRY"]],
        "2x2": [["CHART"], ["CHART"], ["POSITIONS"], ["ORDER_ENTRY"]],
        "sidebar-2": [["WATCHLIST"], ["CHART"], ["POSITIONS"]],
        "main-sidebar": [["CHART"], ["ORDER_BOOK"], ["POSITIONS"], ["ORDER_ENTRY"]],
        "triple-stack": [["CHART"], ["POSITIONS"], ["ORDER_ENTRY"]],
    };
    const defaults: WidgetType[][] = defaultsMap[templateId] || [["CHART"]];

    const config = areaConfigs[templateId];
    if (!config) return [];

    const widgets = widgetOverrides || defaults;

    return config.gridAreas.map((gridArea, i) => {
        const slotWidgets = (widgets[i] || ["CHART"]).map((type, j) => ({
            id: `w-${ts}-${i}-${j}`,
            type,
            title: WIDGET_META[type].label,
            symbol: ["CHART", "ORDER_ENTRY", "OPTION_CHAIN", "ORDER_BOOK"].includes(type) ? "NIFTY 50" : undefined,
        }));

        return {
            id: `slot-${i + 1}`,
            gridArea,
            widgets: slotWidgets,
            activeWidgetId: slotWidgets[0].id,
        };
    });
}

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

interface LayoutCustomizerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const LayoutCustomizer = ({ isOpen, onClose }: LayoutCustomizerProps) => {
    const { addWorkspace, setActiveWorkspace } = useLayoutStore();

    const [layoutName, setLayoutName] = useState("");
    const [selectedTemplate, setSelectedTemplate] = useState("3-col");
    const [areas, setAreas] = useState<GridArea[]>(() => generateAreas("3-col"));
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [activeProfile, setActiveProfile] = useState<string | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(true);
    const [appliedSuggestion, setAppliedSuggestion] = useState<string | null>(null);

    const currentTemplate = GRID_TEMPLATES.find(t => t.id === selectedTemplate)!;

    // 🧠 Compute contextual suggestions based on current widgets
    const activeSuggestions = useMemo(() => {
        const currentWidgets = areas.flatMap(a => a.widgets.map(w => w.type));
        return SMART_SUGGESTIONS.filter(s =>
            currentWidgets.includes(s.trigger) && !currentWidgets.includes(s.recommend)
        ).slice(0, 3);
    }, [areas]);

    const handleTemplateChange = (templateId: string) => {
        setSelectedTemplate(templateId);
        setAreas(generateAreas(templateId));
        setSelectedSlot(null);
        setActiveProfile(null);
    };

    const handleProfileApply = (profile: TradingProfile) => {
        setActiveProfile(profile.id);
        setSelectedTemplate(profile.template);
        setAreas(generateAreas(profile.template, profile.widgets));
        setLayoutName(profile.name + " Setup");
        setSelectedSlot(null);
    };

    const handleWidgetChange = (slotId: string, widgetType: WidgetType) => {
        setAreas(prev => prev.map(area => {
            if (area.id !== slotId) return area;
            const newId = `w-${Date.now()}`;
            return {
                ...area,
                widgets: [{
                    id: newId,
                    type: widgetType,
                    title: WIDGET_META[widgetType].label,
                    symbol: ["CHART", "ORDER_ENTRY", "OPTION_CHAIN", "ORDER_BOOK"].includes(widgetType) ? "NIFTY 50" : undefined,
                }],
                activeWidgetId: newId,
            };
        }));
    };

    const handleAddWidgetToSlot = (slotId: string, widgetType: WidgetType) => {
        setAreas(prev => prev.map(area => {
            if (area.id !== slotId) return area;
            const newId = `w-${Date.now()}`;
            return {
                ...area,
                widgets: [...area.widgets, {
                    id: newId,
                    type: widgetType,
                    title: WIDGET_META[widgetType].label,
                    symbol: ["CHART", "ORDER_ENTRY", "OPTION_CHAIN", "ORDER_BOOK"].includes(widgetType) ? "NIFTY 50" : undefined,
                }],
            };
        }));
    };

    const handleRemoveWidgetFromSlot = (slotId: string, widgetId: string) => {
        setAreas(prev => prev.map(area => {
            if (area.id !== slotId) return area;
            const newWidgets = area.widgets.filter(w => w.id !== widgetId);
            if (newWidgets.length === 0) return area;
            return { ...area, widgets: newWidgets, activeWidgetId: newWidgets[0].id };
        }));
    };

    const handleApplySuggestion = (suggestion: SmartSuggestion) => {
        // Find the first slot that doesn't already have this widget and has the trigger
        const triggerSlot = areas.find(a => a.widgets.some(w => w.type === suggestion.trigger));
        if (triggerSlot) {
            handleAddWidgetToSlot(triggerSlot.id, suggestion.recommend);
            setAppliedSuggestion(suggestion.recommend);
            setTimeout(() => setAppliedSuggestion(null), 2000);
        }
    };

    const handleSave = () => {
        if (!layoutName.trim()) return;
        const id = `custom-${Date.now()}`;

        const workspace: WorkspaceConfig = {
            id,
            name: layoutName.trim(),
            category: "Pro",
            gridTemplateColumns: currentTemplate.cols,
            gridTemplateRows: currentTemplate.rows,
            areas: areas.map(a => ({ ...a, widgets: [...a.widgets] })),
        };

        addWorkspace(workspace);
        setActiveWorkspace(id);
        onClose();
        setLayoutName("");
        setActiveProfile(null);
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-[780px] max-h-[90vh] bg-zinc-950 border border-white/10 rounded-2xl shadow-[0_25px_100px_-15px_rgba(0,229,255,0.15),0_0_0_1px_rgba(255,255,255,0.05)] overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-3 duration-300">

                {/* ═══ Header ═══ */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-gradient-to-r from-zinc-950 to-zinc-900">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <LayoutGrid className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-white tracking-tight">Customize Layout</h2>
                            <p className="text-[9px] text-zinc-600 font-mono">Build your perfect trading workspace</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { handleTemplateChange("3-col"); setLayoutName(""); setActiveProfile(null); }}
                            className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors"
                            title="Reset"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-6 space-y-6">

                        {/* ═══ 🧠 AI Trading Profiles — THE INNOVATION ═══ */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">AI-Optimized Profiles</label>
                                <span className="text-[8px] bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Smart</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {AI_PROFILES.map(profile => (
                                    <button
                                        key={profile.id}
                                        onClick={() => handleProfileApply(profile)}
                                        className={cn(
                                            "relative flex flex-col p-3 rounded-xl border transition-all text-left overflow-hidden group/profile",
                                            activeProfile === profile.id
                                                ? "border-primary/50 bg-primary/5 shadow-[0_0_20px_-5px_rgba(0,229,255,0.3)]"
                                                : "border-white/5 bg-zinc-900/30 hover:bg-zinc-900/60 hover:border-white/15"
                                        )}
                                    >
                                        {/* Gradient accent */}
                                        <div className={cn(
                                            "absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r opacity-0 group-hover/profile:opacity-100 transition-opacity",
                                            profile.gradient
                                        )} />

                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className={cn(
                                                "p-1 rounded-md bg-gradient-to-br",
                                                profile.gradient,
                                                "text-white"
                                            )}>
                                                {profile.icon}
                                            </span>
                                            <span className="text-[10px] font-black text-white uppercase tracking-wide">{profile.name}</span>
                                        </div>
                                        <p className="text-[8px] text-zinc-500 leading-relaxed">{profile.description}</p>

                                        {activeProfile === profile.id && (
                                            <div className="mt-2 pt-2 border-t border-white/5">
                                                <p className="text-[8px] text-zinc-400 leading-relaxed">{profile.explanation}</p>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ═══ Layout Name ═══ */}
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Layout Name</label>
                            <input
                                value={layoutName}
                                onChange={(e) => setLayoutName(e.target.value)}
                                placeholder="e.g., My Scalping Setup"
                                className="w-full bg-black border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                            />
                        </div>

                        {/* ═══ Grid Template ═══ */}
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Grid Template</label>
                            <div className="grid grid-cols-6 gap-2">
                                {GRID_TEMPLATES.map(template => (
                                    <button
                                        key={template.id}
                                        onClick={() => handleTemplateChange(template.id)}
                                        className={cn(
                                            "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                                            selectedTemplate === template.id
                                                ? "border-primary/50 bg-primary/5 shadow-[0_0_15px_-5px_rgba(0,229,255,0.3)]"
                                                : "border-white/5 bg-zinc-900/30 hover:border-white/10 hover:bg-zinc-900/50"
                                        )}
                                    >
                                        <GridPreview templateId={template.id} isActive={selectedTemplate === template.id} />
                                        <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wide text-center leading-tight">{template.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ═══ Live Layout Preview ═══ */}
                        <div>
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Widget Assignment</label>
                            <div
                                className="grid gap-2 bg-black/80 rounded-xl border border-white/5 p-3 min-h-[250px]"
                                style={{
                                    gridTemplateColumns: currentTemplate.cols,
                                    gridTemplateRows: currentTemplate.rows,
                                }}
                            >
                                {areas.map(area => {
                                    const mainWidget = area.widgets[0];
                                    const meta = mainWidget ? WIDGET_META[mainWidget.type] : null;
                                    const isSelected = selectedSlot === area.id;

                                    return (
                                        <div
                                            key={area.id}
                                            style={{ gridArea: area.gridArea }}
                                            onClick={() => setSelectedSlot(isSelected ? null : area.id)}
                                            className={cn(
                                                "rounded-xl border-2 border-dashed p-3 flex flex-col cursor-pointer transition-all min-h-[90px] relative group/slot",
                                                isSelected
                                                    ? "border-primary/60 bg-primary/5 shadow-[inset_0_0_20px_-10px_rgba(0,229,255,0.15)]"
                                                    : "border-white/10 bg-zinc-900/20 hover:border-white/20 hover:bg-zinc-900/40"
                                            )}
                                        >
                                            {meta && (
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className={meta.color}>{meta.icon}</span>
                                                    <span className="text-[10px] font-bold text-white uppercase tracking-wide">{meta.label}</span>
                                                </div>
                                            )}
                                            {meta && (
                                                <p className="text-[8px] text-zinc-600 leading-relaxed">{meta.desc}</p>
                                            )}

                                            {/* Tabs */}
                                            {area.widgets.length > 1 && (
                                                <div className="flex flex-wrap gap-1 mt-auto pt-2">
                                                    {area.widgets.map(w => {
                                                        const wMeta = WIDGET_META[w.type];
                                                        return (
                                                            <div key={w.id} className="flex items-center gap-1 bg-zinc-800/60 px-1.5 py-0.5 rounded-md text-[8px] text-zinc-400 border border-white/5">
                                                                <span className={wMeta.color}>{wMeta.icon}</span>
                                                                {wMeta.label}
                                                                {area.widgets.length > 1 && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleRemoveWidgetFromSlot(area.id, w.id); }}
                                                                        className="ml-0.5 text-zinc-600 hover:text-down"
                                                                    >
                                                                        <X className="w-2.5 h-2.5" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {!isSelected && (
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/slot:opacity-100 transition-opacity rounded-xl">
                                                    <span className="text-[9px] text-zinc-400 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">Click to edit</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ═══ Widget Picker ═══ */}
                        {selectedSlot && (
                            <div className="animate-in slide-in-from-bottom-3 duration-200">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                        Choose Widget
                                    </label>
                                    <button
                                        onClick={() => setSelectedSlot(null)}
                                        className="text-[9px] text-zinc-600 hover:text-primary transition-colors font-bold uppercase tracking-wider"
                                    >Done</button>
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                    {(Object.keys(WIDGET_META) as WidgetType[]).map(type => {
                                        const meta = WIDGET_META[type];
                                        const selectedArea = areas.find(a => a.id === selectedSlot);
                                        const isPrimary = selectedArea?.widgets[0]?.type === type;

                                        return (
                                            <div key={type} className="flex flex-col gap-1">
                                                <button
                                                    onClick={() => handleWidgetChange(selectedSlot!, type)}
                                                    className={cn(
                                                        "flex flex-col gap-1 p-2.5 rounded-xl border transition-all text-left",
                                                        isPrimary
                                                            ? "border-primary/40 bg-primary/10 text-white shadow-[0_0_15px_-5px_rgba(0,229,255,0.2)]"
                                                            : "border-white/5 bg-zinc-900/40 hover:bg-zinc-800/50 hover:border-white/10 text-zinc-400 hover:text-white"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className={meta.color}>{meta.icon}</span>
                                                        <span className="text-[9px] font-bold uppercase tracking-wide">{meta.label}</span>
                                                    </div>
                                                    <p className="text-[7px] text-zinc-600 leading-relaxed pl-5.5">{meta.desc}</p>
                                                </button>
                                                {!isPrimary && (
                                                    <button
                                                        onClick={() => handleAddWidgetToSlot(selectedSlot!, type)}
                                                        className="text-[8px] text-zinc-600 hover:text-primary transition-colors flex items-center gap-1 justify-center py-0.5"
                                                    >
                                                        <Plus className="w-2.5 h-2.5" /> Add as tab
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ═══ 💡 Smart Suggestions — THE INNOVATION ═══ */}
                        {showSuggestions && activeSuggestions.length > 0 && !selectedSlot && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex items-center gap-2 mb-3">
                                    <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Smart Suggestions</label>
                                    <button
                                        onClick={() => setShowSuggestions(false)}
                                        className="ml-auto text-[8px] text-zinc-600 hover:text-white"
                                    >Hide</button>
                                </div>
                                <div className="space-y-2">
                                    {activeSuggestions.map((s, i) => {
                                        const triggerMeta = WIDGET_META[s.trigger];
                                        const recommendMeta = WIDGET_META[s.recommend];
                                        const linkMeta = LINK_TYPE_LABELS[s.linkType];
                                        const isApplied = appliedSuggestion === s.recommend;

                                        return (
                                            <div
                                                key={i}
                                                className={cn(
                                                    "flex items-center gap-3 p-3 rounded-xl border transition-all",
                                                    isApplied
                                                        ? "border-up/30 bg-up/5"
                                                        : "border-white/5 bg-zinc-900/30 hover:bg-zinc-900/50"
                                                )}
                                            >
                                                {/* Trigger → Recommend visual */}
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className={triggerMeta.color}>{triggerMeta.icon}</span>
                                                    <ArrowRight className="w-3 h-3 text-zinc-600" />
                                                    <span className={recommendMeta.color}>{recommendMeta.icon}</span>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-white">Add {recommendMeta.label}</span>
                                                        <span className={cn("text-[7px] px-1.5 py-0.5 rounded-full border font-bold uppercase", linkMeta.color)}>
                                                            <Link2 className="w-2 h-2 inline mr-0.5" />
                                                            {linkMeta.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-[8px] text-zinc-500 mt-0.5">{s.reason}</p>
                                                </div>

                                                <button
                                                    onClick={() => handleApplySuggestion(s)}
                                                    disabled={isApplied}
                                                    className={cn(
                                                        "shrink-0 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all",
                                                        isApplied
                                                            ? "bg-up/20 text-up"
                                                            : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                                                    )}
                                                >
                                                    {isApplied ? "✓ Added" : "Apply"}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ═══ Footer ═══ */}
                <div className="px-6 py-4 border-t border-white/5 bg-gradient-to-r from-zinc-900/50 to-zinc-950 flex items-center justify-between">
                    <div className="text-[10px] text-zinc-600 font-mono flex items-center gap-3">
                        <span>{areas.length} panels</span>
                        <span className="text-zinc-800">·</span>
                        <span>{areas.reduce((acc, a) => acc + a.widgets.length, 0)} widgets</span>
                        {activeProfile && (
                            <>
                                <span className="text-zinc-800">·</span>
                                <span className="text-yellow-400/80 flex items-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    {AI_PROFILES.find(p => p.id === activeProfile)?.name} profile
                                </span>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-[10px] font-bold text-zinc-400 hover:text-white border border-white/5 rounded-xl hover:bg-white/5 transition-all uppercase tracking-widest"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!layoutName.trim()}
                            className={cn(
                                "px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all",
                                layoutName.trim()
                                    ? "bg-primary text-black hover:shadow-[0_0_30px_rgba(0,229,255,0.4)] hover:scale-[1.02] active:scale-[0.98]"
                                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                            )}
                        >
                            <Save className="w-3.5 h-3.5" />
                            Create Layout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════════════════════
   GRID PREVIEW THUMBNAILS
   ═══════════════════════════════════════════════════════════ */

const GridPreview = ({ templateId, isActive }: { templateId: string; isActive: boolean }) => {
    const color = isActive ? "bg-primary/50" : "bg-zinc-700";
    const border = isActive ? "border-primary/30" : "border-white/5";

    const previewMap: Record<string, React.ReactNode> = {
        "2-col": (
            <div className={`grid grid-cols-2 gap-0.5 w-10 h-7 border rounded-sm ${border} p-0.5`}>
                <div className={`rounded-[1px] ${color}`} />
                <div className={`rounded-[1px] ${color}`} />
            </div>
        ),
        "3-col": (
            <div className={`grid grid-cols-[1fr_2fr_1fr] gap-0.5 w-10 h-7 border rounded-sm ${border} p-0.5`}>
                <div className={`rounded-[1px] ${color}`} />
                <div className={`rounded-[1px] ${color}`} />
                <div className={`rounded-[1px] ${color}`} />
            </div>
        ),
        "2x2": (
            <div className={`grid grid-cols-2 grid-rows-2 gap-0.5 w-10 h-7 border rounded-sm ${border} p-0.5`}>
                <div className={`rounded-[1px] ${color}`} />
                <div className={`rounded-[1px] ${color}`} />
                <div className={`rounded-[1px] ${color}`} />
                <div className={`rounded-[1px] ${color}`} />
            </div>
        ),
        "sidebar-2": (
            <div className={`grid grid-cols-[1fr_2fr] grid-rows-2 gap-0.5 w-10 h-7 border rounded-sm ${border} p-0.5`}>
                <div className={`rounded-[1px] ${color} row-span-2`} />
                <div className={`rounded-[1px] ${color}`} />
                <div className={`rounded-[1px] ${color}`} />
            </div>
        ),
        "main-sidebar": (
            <div className={`grid grid-cols-[2fr_1fr] grid-rows-[1.5fr_1fr] gap-0.5 w-10 h-7 border rounded-sm ${border} p-0.5`}>
                <div className={`rounded-[1px] ${color}`} />
                <div className={`rounded-[1px] ${color}`} />
                <div className={`rounded-[1px] ${color}`} />
                <div className={`rounded-[1px] ${color}`} />
            </div>
        ),
        "triple-stack": (
            <div className={`grid grid-cols-1 grid-rows-3 gap-0.5 w-10 h-7 border rounded-sm ${border} p-0.5`}>
                <div className={`rounded-[1px] ${color}`} />
                <div className={`rounded-[1px] ${color}`} />
                <div className={`rounded-[1px] ${color}`} />
            </div>
        ),
    };

    return previewMap[templateId] || null;
};
