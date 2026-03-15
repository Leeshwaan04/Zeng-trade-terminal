import { AdvancedRule, Condition, Action } from "@/hooks/useRuleEngineStore";
import { calculateSMA, calculateEMA, calculateRSI } from "./indicators";

export interface Trade {
    type: 'BUY' | 'SELL';
    price: number;           // actual execution price (with slippage applied)
    signalPrice: number;     // close price that triggered the signal
    slippage: number;        // rupee slippage paid per unit
    time: string;
    quantity: number;
    pnl: number;
}

export interface BacktestResult {
    totalProfit: number;
    winRate: number;
    maxDrawdown: number;
    sharpeRatio: number;
    trades: Trade[];
    equityCurve: number[];
    totalSlippage: number;   // total rupees lost to slippage across all trades
}

/**
 * Institutional slippage model.
 *
 * Instead of filling at the candle's close (which is unrealistic), we simulate
 * execution at the mid-price of the candle: (high + low) / 2.
 *
 * A spread penalty (half the high-low range as a fraction of close) is then
 * applied directionally:
 *   - BUY:  executed slightly above mid (market takes the ask side)
 *   - SELL: executed slightly below mid (market takes the bid side)
 *
 * Wide candles → larger penalty. This naturally penalises strategies that
 * "chase" entries into high-volatility candles.
 */
function slippagePrice(
    side: 'BUY' | 'SELL',
    open: number,
    high: number,
    low: number,
    close: number,
): { execPrice: number; slippageAmt: number } {
    const mid = (high + low) / 2;
    // Half-spread as fraction of close (capped at 0.5% to stay realistic)
    const halfSpread = Math.min((high - low) / close / 2, 0.005);
    const execPrice = side === 'BUY'
        ? mid * (1 + halfSpread)   // pay slightly above mid
        : mid * (1 - halfSpread);  // receive slightly below mid

    return {
        execPrice,
        slippageAmt: Math.abs(execPrice - close),
    };
}

export async function runBacktest(
    rule: AdvancedRule,
    candles: any[],
    initialCapital: number = 100000,
    enableSlippage: boolean = true,
): Promise<BacktestResult> {
    const prices = candles.map(c => c.close);
    const times  = candles.map(c => c.timestamp);

    // Pre-calculate indicators once (avoids recomputing on every candle)
    const indicators: Record<string, (number | null)[]> = {};

    rule.conditions.forEach(c => {
        if (!c.indicator) return;
        const key = `${c.type}_${c.indicator.period || 14}`;
        if (indicators[key]) return;

        if (c.type === 'SMA') {
            indicators[key] = calculateSMA(prices, c.indicator.period || 14);
        } else if (c.type === 'EMA') {
            indicators[key] = calculateEMA(prices, c.indicator.period || 14);
        } else if (c.type === 'RSI') {
            indicators[key] = calculateRSI(prices, c.indicator.period || 14);
        }
    });

    let balance = initialCapital;
    let position = 0;
    let totalSlippage = 0;
    const trades: Trade[] = [];
    const equityCurve: number[] = [initialCapital];
    let maxBalance = initialCapital;
    let maxDD = 0;

    for (let i = 1; i < candles.length; i++) {
        const currentPrice = prices[i];
        const currentTime  = times[i];
        const candle       = candles[i];

        // Evaluate all conditions against the current candle
        const allMet = rule.conditions.every(cond => {
            let valToCompare: number | null = null;
            if (cond.type === 'PRICE') {
                valToCompare = currentPrice;
            } else if (cond.indicator) {
                const key = `${cond.type}_${cond.indicator.period || 14}`;
                valToCompare = indicators[key][i];
            }

            if (valToCompare === null) return false;

            const target = typeof cond.value === 'string' ? parseFloat(cond.value) : cond.value;

            switch (cond.operator) {
                case '>':  return valToCompare >  target;
                case '<':  return valToCompare <  target;
                case '>=': return valToCompare >= target;
                case '<=': return valToCompare <= target;
                case '==': return valToCompare === target;
                default:   return false;
            }
        });

        if (allMet) {
            const action = rule.actions[0];
            if (action?.type === 'PLACE_ORDER') {
                const side = action.params.side as 'BUY' | 'SELL';
                const qty  = action.params.quantity || 1;

                // Determine execution price
                let execPrice: number;
                let slippageAmt = 0;

                if (enableSlippage && candle.high !== undefined && candle.low !== undefined) {
                    const result = slippagePrice(side, candle.open, candle.high, candle.low, currentPrice);
                    execPrice   = result.execPrice;
                    slippageAmt = result.slippageAmt * qty;
                } else {
                    execPrice = currentPrice;
                }

                if (side === 'BUY' && position <= 0) {
                    const cost = qty * execPrice;
                    if (balance >= cost) {
                        position  += qty;
                        balance   -= cost;
                        totalSlippage += slippageAmt;
                        trades.push({
                            type: 'BUY',
                            price: execPrice,
                            signalPrice: currentPrice,
                            slippage: slippageAmt,
                            time: currentTime,
                            quantity: qty,
                            pnl: 0,
                        });
                    }
                } else if (side === 'SELL' && position >= 0) {
                    position  -= qty;
                    balance   += qty * execPrice;
                    totalSlippage += slippageAmt;
                    trades.push({
                        type: 'SELL',
                        price: execPrice,
                        signalPrice: currentPrice,
                        slippage: slippageAmt,
                        time: currentTime,
                        quantity: qty,
                        pnl: 0,
                    });
                }
            }
        }

        const currentEquity = balance + position * currentPrice;
        equityCurve.push(currentEquity);

        maxBalance = Math.max(maxBalance, currentEquity);
        maxDD      = Math.max(maxDD, (maxBalance - currentEquity) / maxBalance);
    }

    const totalProfit = equityCurve[equityCurve.length - 1] - initialCapital;
    const winRate     = trades.length > 0
        ? trades.filter(t => t.pnl > 0).length / trades.length
        : 0;

    return {
        totalProfit,
        winRate,
        maxDrawdown: maxDD * 100,
        sharpeRatio: totalProfit / (maxDD || 1),
        trades,
        equityCurve,
        totalSlippage,
    };
}
