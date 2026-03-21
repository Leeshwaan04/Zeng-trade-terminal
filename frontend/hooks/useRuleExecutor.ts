"use client";

import { useEffect, useRef } from "react";
import { useMarketStore } from "./useMarketStore";
import { useRuleEngineStore } from "./useRuleEngineStore";
import { useOrderStore } from "./useOrderStore";
import { useToast } from "@/hooks/use-toast";

/** Compute a simple moving average over the last `period` ticks. */
function computeSMA(ticks: number[], period: number): number | undefined {
    if (ticks.length < period) return undefined;
    const slice = ticks.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
}

/** Compute RSI over the last `period + 1` ticks. */
function computeRSI(ticks: number[], period: number): number | undefined {
    if (ticks.length < period + 1) return undefined;
    const slice = ticks.slice(-(period + 1));
    let gains = 0;
    let losses = 0;
    for (let i = 1; i < slice.length; i++) {
        const diff = slice[i] - slice[i - 1];
        if (diff >= 0) gains += diff;
        else losses += Math.abs(diff);
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
}

export const useRuleExecutor = () => {
    const { rules } = useRuleEngineStore();
    const placeOrder = useOrderStore((s) => s.placeOrder);
    const { toast } = useToast();

    // Rolling price history per symbol — used for SMA / RSI computation
    const priceHistoryRef = useRef<Record<string, number[]>>({});

    useEffect(() => {
        const interval = setInterval(() => {
            const tickers = useMarketStore.getState().tickers;
            const currentRules = useRuleEngineStore.getState().rules;

            // Update rolling price history for every tracked symbol
            currentRules.forEach(rule => {
                rule.conditions.forEach(condition => {
                    const sym = condition.indicator?.symbol;
                    if (!sym || !tickers[sym]) return;
                    if (!priceHistoryRef.current[sym]) {
                        priceHistoryRef.current[sym] = [];
                    }
                    const history = priceHistoryRef.current[sym];
                    const ltp = tickers[sym].last_price;
                    if (history[history.length - 1] !== ltp) {
                        history.push(ltp);
                        if (history.length > 200) history.shift();
                    }
                });
            });

            currentRules.forEach(rule => {
                if (!rule.enabled) return;

                let allConditionsMet = true;

                for (const condition of rule.conditions) {
                    let cv: number | undefined;
                    const sym = condition.indicator?.symbol;
                    const period = condition.indicator?.period || 14;

                    switch (condition.type) {
                        case 'PRICE': {
                            if (!sym || !tickers[sym]) { allConditionsMet = false; break; }
                            cv = tickers[sym].last_price;
                            break;
                        }
                        case 'EMA': {
                            if (!sym || !tickers[sym]?.indicators?.ema20) { allConditionsMet = false; break; }
                            cv = tickers[sym].indicators!.ema20!;
                            break;
                        }
                        case 'SMA': {
                            if (!sym) { allConditionsMet = false; break; }
                            const smaTicks = priceHistoryRef.current[sym] || [];
                            cv = computeSMA(smaTicks, period);
                            if (cv === undefined) { allConditionsMet = false; break; }
                            break;
                        }
                        case 'RSI': {
                            if (!sym) { allConditionsMet = false; break; }
                            const rsiTicks = priceHistoryRef.current[sym] || [];
                            cv = computeRSI(rsiTicks, period);
                            if (cv === undefined) { allConditionsMet = false; break; }
                            break;
                        }
                        case 'TIME': {
                            // Value format: "HH:MM" — triggers at or after the specified time
                            const now = new Date();
                            const parts = String(condition.value).split(':').map(Number);
                            const hours = parts[0] || 0;
                            const minutes = parts[1] || 0;
                            const nowMinutes = now.getHours() * 60 + now.getMinutes();
                            const targetMinutes = hours * 60 + minutes;
                            let timeMet = false;
                            switch (condition.operator) {
                                case '>': timeMet = nowMinutes > targetMinutes; break;
                                case '>=':
                                case '==': timeMet = nowMinutes >= targetMinutes; break;
                                case '<': timeMet = nowMinutes < targetMinutes; break;
                                case '<=': timeMet = nowMinutes <= targetMinutes; break;
                            }
                            if (!timeMet) allConditionsMet = false;
                            continue;
                        }
                        case 'PNL': {
                            const positions = useOrderStore.getState().positions;
                            cv = positions.reduce((sum, pos) => sum + (pos.pnl || 0), 0);
                            break;
                        }
                        case 'GAP': {
                            if (!sym) { allConditionsMet = false; break; }
                            const activePrice = tickers[sym]?.last_price;
                            const secTickers = useMarketStore.getState().secondaryTickers;
                            const secondaryPrice = secTickers[sym]?.last_price;
                            if (activePrice === undefined || secondaryPrice === undefined) { allConditionsMet = false; break; }
                            cv = activePrice - secondaryPrice;
                            break;
                        }
                        default:
                            allConditionsMet = false;
                    }

                    if (cv === undefined) {
                        allConditionsMet = false;
                        break;
                    }

                    const target = Number(condition.value);
                    let conditionMet = false;
                    switch (condition.operator) {
                        case '>': conditionMet = cv > target; break;
                        case '<': conditionMet = cv < target; break;
                        case '>=': conditionMet = cv >= target; break;
                        case '<=': conditionMet = cv <= target; break;
                        case '==': conditionMet = cv === target; break;
                    }

                    if (!conditionMet) {
                        allConditionsMet = false;
                        break;
                    }
                }

                if (allConditionsMet) {
                    console.log(`[ALGO] Triggered Rule: ${rule.name}`);
                    toast({
                        title: "⚡ Algo Triggered",
                        description: `Rule "${rule.name}" conditions met — executing actions.`,
                    });

                    rule.actions.forEach(action => {
                        if (action.type === 'PLACE_ORDER') {
                            placeOrder({
                                symbol: action.params.symbol,
                                transactionType: action.params.side || 'BUY',
                                orderType: 'MARKET',
                                productType: 'MIS',
                                qty: action.params.quantity || 1,
                                price: 0
                            });
                        } else if (action.type === 'EXIT_ALL') {
                            fetch('/api/portfolio/close', { method: 'POST' })
                                .then(r => r.json())
                                .then(() => toast({ title: "Positions Closed", description: `Rule "${rule.name}" triggered exit.` }))
                                .catch(err => console.error('[ALGO] Exit all failed:', err));
                        } else if (action.type === 'NOTIFICATION') {
                            toast({
                                title: "Strategy Alert",
                                description: action.params?.message || `Rule "${rule.name}" triggered.`,
                            });
                        }
                    });

                    // Disable rule after firing to prevent re-trigger spam
                    useRuleEngineStore.getState().toggleRule(rule.id);
                }
            });
        }, 500);

        return () => clearInterval(interval);
    }, []);
};
