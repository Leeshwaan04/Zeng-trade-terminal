import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Operator = '>' | '<' | '>=' | '<=' | '==';
export type IndicatorType = 'PRICE' | 'RSI' | 'SMA' | 'EMA' | 'TIME' | 'PNL' | 'GAP';

export interface IndicatorConfig {
    name: IndicatorType;
    period?: number;
    source?: 'CLOSE' | 'OPEN' | 'HIGH' | 'LOW';
    symbol?: string; // If different from main
}

export interface Condition {
    id: string;
    type: IndicatorType;
    indicator?: IndicatorConfig; // For RSI/SMA etc
    operator: Operator;
    value: number | string; // value or another indicator? keeping simple for now
}

export type ActionType = 'PLACE_ORDER' | 'EXIT_ALL' | 'NOTIFICATION';
export interface Action {
    id: string;
    type: ActionType;
    params: any; // Flexible params
}

export interface AdvancedRule {
    id: string;
    name: string;
    enabled: boolean;
    conditions: Condition[]; // Implicit AND
    actions: Action[];
    lastExecuted?: number;
    cooldown?: number; // Seconds
}

interface RuleEngineState {
    rules: AdvancedRule[];
    addRule: (rule: Omit<AdvancedRule, 'id'>) => void;
    updateRule: (id: string, rule: Partial<AdvancedRule>) => void;
    deleteRule: (id: string) => void;
    toggleRule: (id: string) => void;
}

export const useRuleEngineStore = create<RuleEngineState>()(
    persist(
        (set) => ({
            rules: [],
            addRule: (rule) => set((state) => ({
                rules: [...state.rules, {
                    ...rule,
                    id: Math.random().toString(36).substr(2, 9),
                    enabled: true
                }]
            })),
            updateRule: (id, updates) => set((state) => ({
                rules: state.rules.map(r => r.id === id ? { ...r, ...updates } : r)
            })),
            deleteRule: (id) => set((state) => ({
                rules: state.rules.filter(r => r.id !== id)
            })),
            toggleRule: (id) => set((state) => ({
                rules: state.rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
            }))
        }),
        {
            name: 'cyber-automate-store'
        }
    )
);
