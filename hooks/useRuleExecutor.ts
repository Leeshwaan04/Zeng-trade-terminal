"use client";

import { useEffect, useRef } from "react";
import { useMarketStore } from "./useMarketStore";
import { useRuleEngineStore } from "./useRuleEngineStore";
import { useOrderStore } from "./useOrderStore";
import { useToast } from "@/hooks/use-toast";

export const useRuleExecutor = () => {
    const { rules } = useRuleEngineStore();
    const placeOrder = useOrderStore((s) => s.placeOrder);
    const { toast } = useToast();

    // We poll the market store directly instead of subscribing to state updates to avoid re-renders
    useEffect(() => {
        const interval = setInterval(() => {
            const tickers = useMarketStore.getState().tickers;
            const currentRules = useRuleEngineStore.getState().rules;

            currentRules.forEach(rule => {
                if (!rule.enabled) return;

                // Evaluate ALL conditions (Method: AND)
                let allConditionsMet = true;

                for (const condition of rule.conditions) {
                    let cv: number | undefined;

                    if (condition.type === 'PRICE') {
                        const sym = condition.indicator?.symbol;
                        if (!sym || !tickers[sym]) {
                            allConditionsMet = false;
                            break;
                        }
                        cv = tickers[sym].last_price;
                    }
                    else if (condition.type === 'EMA') {
                        const sym = condition.indicator?.symbol;
                        if (!sym || !tickers[sym]?.indicators?.ema20) {
                            allConditionsMet = false;
                            break;
                        }
                        cv = tickers[sym].indicators!.ema20!;
                    }
                    else if (condition.type === 'GAP') {
                        const sym = condition.indicator?.symbol;
                        if (!sym) {
                            allConditionsMet = false;
                            break;
                        }
                        const activePrice = tickers[sym]?.last_price;
                        const secTickers = useMarketStore.getState().secondaryTickers;
                        const secondaryPrice = secTickers[sym]?.last_price;

                        if (activePrice === undefined || secondaryPrice === undefined) {
                            allConditionsMet = false;
                            break;
                        }
                        // Gap is difference
                        cv = activePrice - secondaryPrice;
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
                        title: "Algo Triggered",
                        description: `Rule "${rule.name}" conditions met.`,
                    });

                    // Execute Actions
                    rule.actions.forEach(action => {
                        if (action.type === 'PLACE_ORDER') {
                            console.log(`[ALGO] Placing Order: ${action.params.symbol}`);
                            placeOrder({
                                symbol: action.params.symbol,
                                transactionType: action.params.side || 'BUY',
                                orderType: 'MARKET',
                                productType: 'MIS',
                                qty: action.params.quantity || 1,
                                price: 0
                            });
                        }
                    });

                    // Disable or Mark Executed?
                    // "enabled: false" effectively works as "executed once".
                    // Or we add cooldown.
                    useRuleEngineStore.getState().toggleRule(rule.id); // Check logic? toggleRule sets !enabled.
                }
            });
        }, 500); // Check every 500ms

        return () => clearInterval(interval);
    }, []); // Empty dependency array, we use getState() inside
};
