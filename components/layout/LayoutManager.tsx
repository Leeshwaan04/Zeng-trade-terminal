import React, { useEffect, useState, useRef } from "react";
import { useLayoutStore } from "@/hooks/useLayoutStore";
import { WidgetContainer } from "./WidgetContainer";
import { TradingChart } from "@/components/charts/TradingChart";
import { PositionsTable } from "@/components/trading/PositionsTable";
import { OrderEntryPanel } from "@/components/trading/OrderEntryPanel";
import { WatchlistWidget } from "@/components/trading/WatchlistWidget";
import { OrderBookWidget } from "@/components/trading/OrderBookWidget";
import { GridResizer } from "./GridResizer";
import { NeuralOptionChain } from "@/components/trading/NeuralOptionChain";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { SortableWidget } from "./SortableWidget";
import { StrategyBuilder } from "@/components/trading/StrategyBuilder";
import { PayoffDiagram } from "@/components/trading/PayoffDiagram";
import { PortfolioHeatmap } from "@/components/analytics/PortfolioHeatmap";
import { AlgoRulesPanel } from "@/components/trading/AlgoRulesPanel";
import { AutomateBuilder } from "@/components/automate/AutomateBuilder";
import { useCyberScalp } from "@/hooks/useCyberScalp";
import { useMediaQuery } from "@/hooks/use-media-query";
import { WhaleSonarWidget } from "@/components/trading/WhaleSonarWidget";
import { HyperChartWidget } from "@/components/charts/HyperChartWidget";

export const LayoutManager = () => {
    // Hydration fix for zustand persist
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const {
        activeWorkspaceId,
        workspaces,
        setActiveWidget,
        resizeGrid,
        reorderWidgets,
        maximizedWidgetId
    } = useLayoutStore();

    const { correlation } = useCyberScalp();

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            reorderWidgets(activeWorkspaceId, active.id as string, over?.id as string);
        }
    };

    // Normalize key lookup (Layout IDs might be inconsistently cased in localStorage)
    const activeWorkspace = workspaces[activeWorkspaceId] ||
        workspaces[activeWorkspaceId.toLowerCase()] ||
        workspaces[activeWorkspaceId.toUpperCase()] ||
        Object.values(workspaces)[0];

    const isMobile = useMediaQuery("(max-width: 768px)");

    // Ref to track initial sizes during drag
    const initialSizesRef = useRef<string[]>([]);

    if (!isMounted || !activeWorkspace) return null;

    // Mobile Responsive Logic
    // If mobile, force single column and stack all areas vertically
    let effectiveCols = activeWorkspace.gridTemplateColumns;
    let effectiveRows = activeWorkspace.gridTemplateRows;
    let effectiveAreas = activeWorkspace.areas;

    if (isMobile) {
        effectiveCols = "1fr";
        // Stack areas: each area gets a row.
        effectiveRows = `repeat(${activeWorkspace.areas.length}, 450px)`;

        // Remap areas to be vertical stack
        effectiveAreas = activeWorkspace.areas.map((area, index) => ({
            ...area,
            gridArea: `${index + 1} / 1 / ${index + 2} / 2`
        }));
    }

    const colSizes = isMobile ? [] : activeWorkspace.gridTemplateColumns.split(" ");
    const rowSizes = isMobile ? [] : activeWorkspace.gridTemplateRows.split(" ");

    const handleResize = (type: 'cols' | 'rows', index: number, delta: number) => {
        if (isMobile) return;
        // Simple logic:
        // If we resize at index i, we are changing the size of track i or i-1?
        // Resizer i is between track i and i+1.

        // STANDARD LAYOUT (3 cols): 250px | 1fr | 300px
        // Resizer 0 (between 0 and 1): adjust 250px.
        // Resizer 1 (between 1 and 2): adjust 300px (but inverted delta?).
        // Actually, if we pull Resizer 1 lefter, 1fr shrinks and 300px grows?
        // Or we just change 1fr? No, changing 1fr doesn't make sense with px around.

        // Let's support resizing 'px' values primarily.

        // If we are resizing:
        // Col 0 (250px) -> Update Col 0.
        // Col 2 (300px) -> Update Col 2.

        // General logic:
        // Identify which track is the 'sized' track adjacent to the handle.
        // For standard layout:
        // Handle 0: affects Col 0 (250px).
        // Handle 1: affects Col 2 (300px) - but wait, handle 1 is after Col 1.
        // So Handle 1 moves the boundary between Col 1 (1fr) and Col 2 (300px).
        // Moving Handle 1 Right -> Col 1 grows, Col 2 shrinks.
        // Moving Handle 1 Left -> Col 1 shrinks, Col 2 grows.

        // Implementation for pixel tracks:
        const sizes = type === 'cols' ? [...colSizes] : [...rowSizes];

        if (activeWorkspace.id === 'standard' && type === 'cols') {
            if (index === 0) {
                // Resizing the left sidebar
                const startSize = parseInt(initialSizesRef.current[0]);
                const newSize = Math.max(150, startSize + delta); // Min width 150
                resizeGrid(activeWorkspace.id, 'cols', 0, `${newSize}px`);
            } else if (index === 1) {
                // Resizing the right panel
                const startSize = parseInt(initialSizesRef.current[2]);
                const newSize = Math.max(200, startSize - delta); // Inverted delta
                resizeGrid(activeWorkspace.id, 'cols', 2, `${newSize}px`);
            }
        } else if (activeWorkspace.id === 'scalping' && type === 'cols') {
            // 1fr 400px
            if (index === 0) {
                const startSize = parseInt(initialSizesRef.current[1]);
                const newSize = Math.max(250, startSize - delta);
                resizeGrid(activeWorkspace.id, 'cols', 1, `${newSize}px`);
            }
        } else if (activeWorkspace.id === 'scalping' && type === 'rows') {
            // 1fr 200px
            if (index === 0) {
                const startSize = parseInt(initialSizesRef.current[1]);
                const newSize = Math.max(100, startSize - delta);
                resizeGrid(activeWorkspace.id, 'rows', 1, `${newSize}px`);
            }
        }
        // Generic fall-back for other layouts could be added here
    };

    const onResizeStart = (type: 'cols' | 'rows') => {
        initialSizesRef.current = type === 'cols' ? [...colSizes] : [...rowSizes];
    };

    // Calculate grid logic to place resizers using dummy divs or purely absolute positioning?
    // Absolute positioning is easier if we know where the lines are.
    // CSS Grid doesn't expose line positions easily.
    // Hack: Insert Resize handles IN the grid as 0-width columns?
    // That requires changing the grid-template itself to include gaps as columns.

    // EASIER: Just place handles inside the grid areas? No.
    // Overlay: We need to know column widths.

    // ALTERNATIVE: Use a "Splitter" layout pattern instead of native CSS Grid gap?
    // Too much refactoring.

    // CSS GRID HACK:
    // We can't easily overlay DOM elements on grid lines without knowing pixels.
    // BUT, we can use `grid-column: 1 / 2` etc.
    // This doesn't help with the "gap".

    // WAIT. If we use `gap-[1px]`, the gap is 1px.
    // We want the handle to sit OVER that gap.

    // Let's stick effectively to the specific layout logic for now.
    // For "Standard" (250px 1fr 300px), we have 2 vertical lines.
    // Line 1 is at 250px.
    // Line 2 is at 100% - 300px.

    // We can render the handles with `left: 250px` etc?
    // No, 1fr size is unknown.

    // The safest way with CSS Grid is to add the handles AS elements in the grid.
    // But then we change the indices.

    // Let's assume we simply render them as children of the grid, with specific line attachments.
    // `grid-column: 2 / 3` implies it occupies the cell.
    // We want it on the LINE.

    // `grid-column-start: 2` puts it at the start of column 2. which is the line between 1 and 2.
    // So we can position absolute relative to the grid item?
    // No, grid container is relative.

    // Let's try placing them in the grid cells but acting as overlays.
    // Handle 0: grid-column: 2; grid-row: 1 / -1; justify-self: start; transform: translateX(-50%);
    // This puts it at the LEFT edge of Column 2. Match!

    // Maximize Logic
    if (maximizedWidgetId) {
        // Find the widget config and area
        let targetWidget = null;
        let targetAreaId = "";

        for (const area of activeWorkspace.areas) {
            const widget = area.widgets.find(w => w.id === maximizedWidgetId);
            if (widget) {
                targetWidget = widget;
                targetAreaId = area.id;
                break;
            }
        }

        if (targetWidget) {
            return (
                <div className="w-full h-full bg-background z-50 p-2">
                    <WidgetContainer
                        widgets={[targetWidget]}
                        activeWidgetId={targetWidget.id}
                        onWidgetSelect={() => { }}
                        isActive={true}
                        onActivate={() => { }}
                    >
                        {targetWidget.type === "CHART" && (
                            <TradingChart
                                symbol={targetWidget.symbol || "NIFTY 50"}
                                widgetId={targetWidget.id}
                            />
                        )}
                        {targetWidget.type === "WATCHLIST" && <WatchlistWidget />}
                        {targetWidget.type === "ORDER_BOOK" && (
                            <OrderBookWidget symbol={targetWidget.symbol} />
                        )}
                        {targetWidget.type === "POSITIONS" && <PositionsTable />}
                        {targetWidget.type === "ORDER_ENTRY" && (
                            <OrderEntryPanel symbol={targetWidget.symbol || "NIFTY 50"} />
                        )}
                        {targetWidget.type === "OPTION_CHAIN" && (
                            <NeuralOptionChain symbol={targetWidget.symbol} />
                        )}
                        {targetWidget.type === "STRATEGY_BUILDER" && <StrategyBuilder />}
                        {targetWidget.type === "PAYOFF_DIAGRAM" && <PayoffDiagram />}
                    </WidgetContainer>
                </div>
            );
        }
    }

    return (
        <div
            className="w-full h-full grid gap-[1px] bg-background relative isolate overflow-auto md:overflow-hidden"
            style={{
                gridTemplateColumns: effectiveCols,
                gridTemplateRows: effectiveRows,
            }}
        >
            {/* Cyber-Scalp: Correlation Badge */}
            {activeWorkspace.id === 'cyber-scalp' && correlation !== null && !isMobile && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[150%] z-[60] pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-md border border-[var(--color-neon-cyan)]/30 rounded-full px-4 py-1 flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,255,0.2)]">
                        <div className={`w-2 h-2 rounded-full ${correlation > 0.8 ? 'bg-[var(--color-neon-cyan)] animate-pulse' : 'bg-gray-500'}`} />
                        <span className="text-xs font-mono text-[var(--color-neon-cyan)] tracking-wider">
                            CORR: {correlation.toFixed(2)}
                        </span>
                    </div>
                </div>
            )}

            <DndContext
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={effectiveAreas.map(a => a.id)} strategy={rectSortingStrategy}>
                    {/* Render Vertical Resizers (Columns) - Hidden on Mobile */}
                    {!isMobile && colSizes.slice(0, -1).map((_, i) => (
                        <div
                            key={`v-resizer-${i}`}
                            className="relative w-0 h-full z-50 pointer-events-none"
                            style={{
                                gridColumnStart: i + 2, // Line index starts at 1. Line between col 1 and 2 is line 2.
                                gridRow: "1 / -1"
                            }}
                        >
                            <div className="absolute top-0 bottom-0 -left-[3px] w-[6px] pointer-events-auto">
                                <GridResizer
                                    type="col"
                                    index={i}
                                    onResizeStart={() => onResizeStart('cols')}
                                    onResize={(delta) => handleResize('cols', i, delta)}
                                    onResizeEnd={() => { }}
                                />
                            </div>
                        </div>
                    ))}

                    {/* Render Horizontal Resizers (Rows) - Hidden on Mobile */}
                    {!isMobile && rowSizes.slice(0, -1).map((_, i) => (
                        <div
                            key={`h-resizer-${i}`}
                            className="relative h-0 w-full z-50 pointer-events-none"
                            style={{
                                gridRowStart: i + 2,
                                gridColumn: "1 / -1"
                            }}
                        >
                            <div className="absolute left-0 right-0 -top-[3px] h-[6px] pointer-events-auto">
                                <GridResizer
                                    type="row"
                                    index={i}
                                    onResizeStart={() => onResizeStart('rows')}
                                    onResize={(delta) => handleResize('rows', i, delta)}
                                    onResizeEnd={() => { }}
                                />
                            </div>
                        </div>
                    ))}

                    {effectiveAreas.map((area) => {
                        const widgetConfig = area.widgets.find(w => w.id === area.activeWidgetId) || area.widgets[0];
                        if (!widgetConfig) return null;

                        return (
                            <SortableWidget
                                key={area.id}
                                id={area.id}
                                style={{ gridArea: area.gridArea }}
                                className="overflow-hidden min-h-0 min-w-0 bg-background relative border-b md:border-b-0 border-white/10 last:border-0"
                            >
                                <WidgetContainer
                                    widgets={area.widgets}
                                    activeWidgetId={area.activeWidgetId}
                                    onWidgetSelect={(widgetId) => setActiveWidget(area.id, widgetId)}
                                    isActive={false}
                                    onActivate={() => { }}
                                    allowOverflow={widgetConfig.type === "CHART"}
                                >
                                    {widgetConfig.type === "CHART" && (
                                        <TradingChart
                                            symbol={widgetConfig.symbol || "NIFTY 50"}
                                            widgetId={widgetConfig.id}
                                        />
                                    )}
                                    {widgetConfig.type === "WATCHLIST" && <WatchlistWidget />}
                                    {widgetConfig.type === "ORDER_BOOK" && (
                                        <OrderBookWidget symbol={widgetConfig.symbol} />
                                    )}
                                    {widgetConfig.type === "POSITIONS" && <PositionsTable />}
                                    {widgetConfig.type === "ORDER_ENTRY" && (
                                        <OrderEntryPanel symbol={widgetConfig.symbol || "NIFTY 50"} />
                                    )}
                                    {widgetConfig.type === "STRATEGY_BUILDER" && <StrategyBuilder />}
                                    {widgetConfig.type === "PAYOFF_DIAGRAM" && <PayoffDiagram />}
                                    {widgetConfig.type === "OPTION_CHAIN" && (
                                        <NeuralOptionChain symbol={widgetConfig.symbol} />
                                    )}
                                    {widgetConfig.type === "PORTFOLIO_HEATMAP" && <PortfolioHeatmap />}
                                    {widgetConfig.type === "ALGO_RULES" && <AlgoRulesPanel />}
                                    {widgetConfig.type === "AUTOMATE_BUILDER" && <AutomateBuilder />}
                                    {widgetConfig.type === "WHALE_SONAR" && <WhaleSonarWidget />}
                                    {widgetConfig.type === "HYPER_CHART" && <HyperChartWidget symbol={widgetConfig.symbol || "NIFTY 50"} />}
                                </WidgetContainer>
                            </SortableWidget>
                        );
                    })}
                </SortableContext>
            </DndContext>
        </div>
    );
};
