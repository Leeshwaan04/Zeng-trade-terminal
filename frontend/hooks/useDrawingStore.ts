import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Point {
    time: number;
    price: number;
}

export interface Drawing {
    id: string;
    symbol: string;
    type: string; // 'trendline' | 'rect' | 'hline'
    p1: Point;
    p2: Point;
    color: string;
    hidden?: boolean;
    locked?: boolean;
    label?: string;
}

export interface IndicatorConfig {
    id: string;
    type: 'SMA' | 'EMA' | 'RSI' | 'VWAP';
    period: number;
    color: string;
    visible: boolean;
    settings?: {
        overbought?: number;
        oversold?: number;
        source?: 'close' | 'open' | 'high' | 'low';
    };
}

interface DrawingState {
    drawings: Drawing[];
    indicators: IndicatorConfig[];
    activeTool: string;

    // Actions
    setActiveTool: (tool: string) => void;
    addDrawing: (drawing: Drawing) => void;
    removeDrawing: (id: string) => void;
    clearDrawings: (symbol?: string) => void;
    toggleDrawingVisibility: (id: string) => void;
    toggleDrawingLock: (id: string) => void;
    renameDrawing: (id: string, label: string) => void;

    addIndicator: (indicator: Omit<IndicatorConfig, 'id'>) => void;
    removeIndicator: (id: string) => void;
    toggleIndicator: (id: string) => void;
    updateIndicator: (id: string, updates: Partial<IndicatorConfig>) => void;
}

export const useDrawingStore = create<DrawingState>()(
    persist(
        (set) => ({
            drawings: [],
            indicators: [
                { id: 'default-sma-20', type: 'SMA', period: 20, color: '#3b82f6', visible: true },
                { id: 'default-ema-9', type: 'EMA', period: 9, color: '#ec4899', visible: true },
                { id: 'default-rsi-14', type: 'RSI', period: 14, color: '#a855f7', visible: true, settings: { overbought: 70, oversold: 30 } }
            ],
            activeTool: 'CURSOR',

            setActiveTool: (activeTool) => set({ activeTool }),

            addDrawing: (drawing) => set((state) => ({
                drawings: [...state.drawings, drawing]
            })),

            removeDrawing: (id) => set((state) => ({
                drawings: state.drawings.filter(d => d.id !== id)
            })),

            clearDrawings: (symbol) => set((state) => ({
                drawings: symbol ? state.drawings.filter(d => d.symbol !== symbol) : []
            })),

            toggleDrawingVisibility: (id) => set((state) => ({
                drawings: state.drawings.map(d => d.id === id ? { ...d, hidden: !d.hidden } : d)
            })),

            toggleDrawingLock: (id) => set((state) => ({
                drawings: state.drawings.map(d => d.id === id ? { ...d, locked: !d.locked } : d)
            })),

            renameDrawing: (id, label) => set((state) => ({
                drawings: state.drawings.map(d => d.id === id ? { ...d, label } : d)
            })),

            addIndicator: (ind) => set((state) => ({
                indicators: [...state.indicators, { ...ind, id: Math.random().toString(36).substring(7) }]
            })),

            removeIndicator: (id) => set((state) => ({
                indicators: state.indicators.filter(i => i.id !== id)
            })),

            toggleIndicator: (id) => set((state) => ({
                indicators: state.indicators.map(i => i.id === id ? { ...i, visible: !i.visible } : i)
            })),

            updateIndicator: (id, updates) => set((state) => ({
                indicators: state.indicators.map(i => i.id === id ? { ...i, ...updates } : i)
            })),
        }),
        {
            name: 'pro-terminal-drawings',
        }
    )
);
