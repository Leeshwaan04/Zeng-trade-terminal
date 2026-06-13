import { create } from "zustand";
import { persist } from "zustand/middleware";
import { WorkspaceConfig, PRESET_LAYOUTS, WidgetConfig, WidgetType, WidgetColorGroup, MultiChartConfig, MultiChartViewMode } from "@/types/layout";

interface LayoutState {
    activeWorkspaceId: string;
    workspaces: Record<string, WorkspaceConfig>;
    setActiveWorkspace: (id: string) => void;
    // Actions to manipulate widgets
    setActiveWidget: (areaId: string, widgetId: string) => void;
    updateWidgetSymbol: (widgetId: string, symbol: string) => void;
    setWorkspaceSymbol: (symbol: string) => void;
    // Widget Color Grouping
    setWidgetColorGroup: (widgetId: string, colorGroup: WidgetColorGroup | undefined) => void;
    setColorGroupSymbol: (colorGroup: WidgetColorGroup, symbol: string) => void;
    // Multiview (Grid) Config
    updateMultiChartConfig: (widgetId: string, config: Partial<MultiChartConfig>) => void;

    addWorkspace: (workspace: WorkspaceConfig) => void;
    deleteWorkspace: (id: string) => void;
    renameWorkspace: (id: string, name: string) => void;
    cycleLayout: (direction: 'next' | 'prev') => void;
    resizeGrid: (id: string, type: 'cols' | 'rows', index: number, newSize: string) => void;
    reorderWidgets: (workspaceId: string, activeId: string, overId: string) => void;
    addWidget: (type: WidgetType, areaId?: string) => void;

    // Maximize State
    maximizedWidgetId: string | null;
    toggleMaximize: (widgetId: string) => void;

    // PiP Mode State
    pipWidgetId: string | null;
    togglePiP: (widgetId: string | null) => void;

    // Theater Mode State
    theaterModeWidgetId: string | null;
    toggleTheaterMode: (widgetId: string | null) => void;

    // Popout State
    poppedOutWidgets: Record<string, boolean>;
    setPoppedOut: (widgetId: string, isPopped: boolean) => void;
    // Global UI State
    commandCenterOpen: boolean;
    setCommandCenterOpen: (open: boolean) => void;
    settingsOpen: boolean;
    setSettingsOpen: (open: boolean) => void;
    indicatorsOpen: boolean;
    setIndicatorsOpen: (open: boolean) => void;
    // Sync States
    syncCrosshair: boolean;
    setSyncCrosshair: (sync: boolean) => void;
    syncSymbol: boolean;
    setSyncSymbol: (sync: boolean) => void;
    syncInterval: boolean;
    setSyncInterval: (sync: boolean) => void;
    syncedMousePos: { x: number, y: number } | null;
    setSyncedMousePos: (pos: { x: number, y: number } | null) => void;
    syncedInterval: string;
    setSyncedInterval: (interval: string) => void;

    // Bottom Panel (Account Manager)
    accountManagerHeight: number;
    setAccountManagerHeight: (height: number) => void;
    isAccountManagerOpen: boolean;
    toggleAccountManager: () => void;
}

export const useLayoutStore = create<LayoutState>()(
    persist(
        (set) => ({
            // First-run users land on a fully populated "standard" desk (watchlist +
            // chart + order entry + depth + positions) instead of an empty slate —
            // this is the activation moment. Returning users keep their persisted id.
            activeWorkspaceId: "standard",
            // Seed all preset layouts so activating one always finds a workspace.
            // (Previously {} — selecting a preset or adding a widget silently
            // no-op'd because workspaces[activeWorkspaceId] was undefined.)
            workspaces: { ...PRESET_LAYOUTS },

            setActiveWorkspace: (id) => set((state) => {
                // Self-heal: if the id isn't in the store but is a known preset
                // (e.g. stale persisted state from before presets were seeded),
                // copy the preset in before activating it.
                if (!state.workspaces[id] && PRESET_LAYOUTS[id]) {
                    return {
                        activeWorkspaceId: id,
                        workspaces: { ...state.workspaces, [id]: PRESET_LAYOUTS[id] },
                    };
                }
                return { activeWorkspaceId: id };
            }),

            setActiveWidget: (areaId, widgetId) => set((state) => {
                const workspace = state.workspaces[state.activeWorkspaceId];
                const areaIndex = workspace.areas.findIndex(a => a.id === areaId);
                if (areaIndex === -1) return state;

                const newAreas = [...workspace.areas];
                newAreas[areaIndex] = { ...newAreas[areaIndex], activeWidgetId: widgetId };

                return {
                    workspaces: {
                        ...state.workspaces,
                        [state.activeWorkspaceId]: {
                            ...workspace,
                            areas: newAreas
                        }
                    }
                };
            }),

            updateWidgetSymbol: (widgetId, symbol) => set((state) => {
                const workspace = state.workspaces[state.activeWorkspaceId];
                const newAreas = workspace.areas.map(area => ({
                    ...area,
                    widgets: area.widgets.map(w => w.id === widgetId ? { ...w, symbol } : w)
                }));

                return {
                    workspaces: {
                        ...state.workspaces,
                        [state.activeWorkspaceId]: { ...workspace, areas: newAreas }
                    }
                }
            }),

            setWorkspaceSymbol: (symbol: string) => set((state) => {
                const workspace = state.workspaces[state.activeWorkspaceId];
                // Update all widgets that support 'symbol' property
                const newAreas = workspace.areas.map(area => ({
                    ...area,
                    widgets: area.widgets.map(w => {
                        if (['CHART', 'ORDER_ENTRY', 'ORDER_BOOK', 'OPTION_CHAIN', 'STRADDLE'].includes(w.type)) {
                            return { ...w, symbol };
                        }
                        return w;
                    })
                }));

                return {
                    workspaces: {
                        ...state.workspaces,
                        [state.activeWorkspaceId]: { ...workspace, areas: newAreas }
                    }
                };
            }),

            setWidgetColorGroup: (widgetId, colorGroup) => set((state) => {
                const workspace = state.workspaces[state.activeWorkspaceId];
                const newAreas = workspace.areas.map(area => ({
                    ...area,
                    widgets: area.widgets.map(w => w.id === widgetId ? { ...w, colorGroup } : w)
                }));

                return {
                    workspaces: {
                        ...state.workspaces,
                        [state.activeWorkspaceId]: { ...workspace, areas: newAreas }
                    }
                };
            }),

            setColorGroupSymbol: (colorGroup, symbol) => set((state) => {
                const workspace = state.workspaces[state.activeWorkspaceId];
                const newAreas = workspace.areas.map(area => ({
                    ...area,
                    widgets: area.widgets.map(w =>
                        w.colorGroup === colorGroup && ['CHART', 'ORDER_ENTRY', 'ORDER_BOOK', 'OPTION_CHAIN', 'STRADDLE'].includes(w.type)
                            ? { ...w, symbol }
                            : w
                    )
                }));

                return {
                    workspaces: {
                        ...state.workspaces,
                        [state.activeWorkspaceId]: { ...workspace, areas: newAreas }
                    }
                };
            }),

            updateMultiChartConfig: (widgetId, config) => set((state) => {
                const workspace = state.workspaces[state.activeWorkspaceId];
                const newAreas = workspace.areas.map(area => ({
                    ...area,
                    widgets: area.widgets.map(w => {
                        if (w.id === widgetId) {
                            return {
                                ...w,
                                multiChartConfig: {
                                    ...(w.multiChartConfig || { viewMode: "1x1", symbols: [w.symbol || "NIFTY 50"] }),
                                    ...config
                                }
                            };
                        }
                        return w;
                    })
                }));

                return {
                    workspaces: {
                        ...state.workspaces,
                        [state.activeWorkspaceId]: { ...workspace, areas: newAreas }
                    }
                };
            }),

            addWorkspace: (workspace) => set((state) => ({
                workspaces: {
                    ...state.workspaces,
                    [workspace.id]: workspace,
                },
                activeWorkspaceId: workspace.id,
            })),

            deleteWorkspace: (id) => set((state) => {
                const isPreset = ['standard', 'scalping', 'analysis', 'options', 'groww-classic'].includes(id);
                if (isPreset) return state;

                const { [id]: removed, ...remainingWorkspaces } = state.workspaces;

                // If deleting active, fallback to standard
                const nextActive = state.activeWorkspaceId === id ? "standard" : state.activeWorkspaceId;

                return {
                    workspaces: remainingWorkspaces,
                    activeWorkspaceId: nextActive
                };
            }),

            renameWorkspace: (id, name) => set((state) => {
                const workspace = state.workspaces[id];
                if (!workspace || ['standard', 'scalping', 'analysis', 'options', 'groww-classic'].includes(id)) return state;

                return {
                    workspaces: {
                        ...state.workspaces,
                        [id]: { ...workspace, name }
                    }
                };
            }),

            cycleLayout: (direction) => set((state) => {
                const layoutIds = Object.keys(state.workspaces);
                const currentIndex = layoutIds.indexOf(state.activeWorkspaceId);
                let nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

                if (nextIndex >= layoutIds.length) nextIndex = 0;
                if (nextIndex < 0) nextIndex = layoutIds.length - 1;

                return { activeWorkspaceId: layoutIds[nextIndex] };
            }),

            resizeGrid: (id, type, index, newSize) => set((state) => {
                const workspace = state.workspaces[id];
                if (!workspace) return state;

                const property = type === 'cols' ? 'gridTemplateColumns' : 'gridTemplateRows';
                const sizes = workspace[property].split(' ');
                sizes[index] = newSize;

                return {
                    workspaces: {
                        ...state.workspaces,
                        [id]: {
                            ...workspace,
                            [property]: sizes.join(' ')
                        }
                    }
                };
            }),

            reorderWidgets: (workspaceId, activeId, overId) => set((state) => {
                const workspace = state.workspaces[workspaceId];
                if (!workspace) return state;

                const oldIndex = workspace.areas.findIndex(a => a.id === activeId);
                const newIndex = workspace.areas.findIndex(a => a.id === overId);

                if (oldIndex === -1 || newIndex === -1) return state;

                const newAreas = [...workspace.areas];
                // Swap gridArea properties to effectively move the content
                // BUT wait. If we just swap array positions, the mapped elements will change order.
                // However, their 'gridArea' CSS property is what determines position visually in CSS Grid.
                // So we actually need to SWAP THE GRID AREA STRINGS between the two objects.

                const tempArea = newAreas[oldIndex].gridArea;
                newAreas[oldIndex] = { ...newAreas[oldIndex], gridArea: newAreas[newIndex].gridArea };
                newAreas[newIndex] = { ...newAreas[newIndex], gridArea: tempArea };

                return {
                    workspaces: {
                        ...state.workspaces,
                        [workspaceId]: {
                            ...workspace,
                            areas: newAreas
                        }
                    }
                };
            }),

            maximizedWidgetId: null,
            toggleMaximize: (widgetId) => set((state) => ({
                maximizedWidgetId: state.maximizedWidgetId === widgetId ? null : widgetId
            })),

            pipWidgetId: null,
            togglePiP: (widgetId) => set((state) => ({
                pipWidgetId: state.pipWidgetId === widgetId ? null : widgetId,
                // Ensure Theater and Maximize are cleared if entering PiP
                theaterModeWidgetId: null,
                maximizedWidgetId: null
            })),

            theaterModeWidgetId: null,
            toggleTheaterMode: (widgetId) => set((state) => ({
                theaterModeWidgetId: state.theaterModeWidgetId === widgetId ? null : widgetId,
                // Ensure PiP and Maximize are cleared if entering Theater
                pipWidgetId: null,
                maximizedWidgetId: null
            })),

            poppedOutWidgets: {},
            setPoppedOut: (widgetId: string, isPopped: boolean) => set((state) => ({
                poppedOutWidgets: {
                    ...state.poppedOutWidgets,
                    [widgetId]: isPopped
                }
            })),

            commandCenterOpen: false,
            setCommandCenterOpen: (open) => set({ commandCenterOpen: open }),
            settingsOpen: false,
            setSettingsOpen: (open: boolean) => set({ settingsOpen: open }),
            indicatorsOpen: false,
            setIndicatorsOpen: (open: boolean) => set({ indicatorsOpen: open }),

            syncCrosshair: false,
            setSyncCrosshair: (sync) => set({ syncCrosshair: sync }),
            syncSymbol: false,
            setSyncSymbol: (sync) => set({ syncSymbol: sync }),
            syncInterval: false,
            setSyncInterval: (sync) => set({ syncInterval: sync }),
            syncedMousePos: null,
            setSyncedMousePos: (pos) => set({ syncedMousePos: pos }),
            syncedInterval: "1D",
            setSyncedInterval: (interval) => set({ syncedInterval: interval }),

            accountManagerHeight: 250,
            setAccountManagerHeight: (height) => set({ accountManagerHeight: height }),
            isAccountManagerOpen: true,
            toggleAccountManager: () => set((state) => ({ isAccountManagerOpen: !state.isAccountManagerOpen })),

            addWidget: (type, areaId) => set((state) => {
                let workspace = state.workspaces[state.activeWorkspaceId];
                let workspaceId = state.activeWorkspaceId;

                // No active workspace (fresh empty desk): create one on the fly
                // instead of silently dropping the user's action.
                if (!workspace) {
                    workspaceId = `custom-${Date.now()}`;
                    workspace = {
                        id: workspaceId,
                        name: "My Desk",
                        category: "Standard",
                        gridTemplateColumns: "1fr",
                        gridTemplateRows: "1fr",
                        icon: "LayoutGrid",
                        areas: [{
                            id: `${workspaceId}-main`,
                            gridArea: "1 / 1 / 2 / 2",
                            widgets: [],
                            activeWidgetId: ""
                        }]
                    };
                    state = {
                        ...state,
                        activeWorkspaceId: workspaceId,
                        workspaces: { ...state.workspaces, [workspaceId]: workspace },
                    };
                }

                // Use provided areaId or default to the first area
                const targetAreaId = areaId || workspace.areas[0].id;
                const areaIndex = workspace.areas.findIndex(a => a.id === targetAreaId);
                if (areaIndex === -1) return state;

                const area = workspace.areas[areaIndex];

                // Avoid duplicates of the same type in the same area if needed
                // But for charts/chains, we might want multiple. 
                // For specialized widgets like Strategy Builder, maybe just one.
                const isUniqueType = ["STRATEGY_BUILDER", "BUILDUP_SCANNER", "OI_HEATMAP", "POSITIONS", "FII_DII"].includes(type);
                if (isUniqueType && area.widgets.some((w: WidgetConfig) => w.type === type)) return state;

                const newWidget: WidgetConfig = {
                    id: `${type.toLowerCase()}-${Date.now()}`,
                    type,
                    title: type.replace('_', ' ').split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
                    symbol: workspace.areas.find(a => a.widgets.some(w => w.symbol))?.widgets.find(w => w.symbol)?.symbol || "NIFTY 50"
                };

                const newAreas = [...workspace.areas];
                newAreas[areaIndex] = {
                    ...area,
                    widgets: [...area.widgets, newWidget],
                    activeWidgetId: newWidget.id
                };

                return {
                    activeWorkspaceId: workspaceId,
                    workspaces: {
                        ...state.workspaces,
                        [workspaceId]: { ...workspace, areas: newAreas }
                    }
                };
            }),
        }),
        {
            // v11: presets are seeded into `workspaces` — older persisted state
            // had an empty workspaces map that made preset/widget actions no-op.
            name: "pro-terminal-layout-v11",
            merge: (persisted, current) => {
                const p = (persisted ?? {}) as Partial<LayoutState>;
                return {
                    ...current,
                    ...p,
                    // Presets always present; user workspaces layered on top.
                    workspaces: { ...PRESET_LAYOUTS, ...(p.workspaces || {}) },
                };
            },
        }
    )
);
