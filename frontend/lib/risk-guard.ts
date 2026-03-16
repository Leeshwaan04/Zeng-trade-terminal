import { NormalizedPosition } from "./portfolio-utils";

export interface RiskLimits {
    maxOrderValue: number; // Max value for a single order
    maxTotalPositions: number; // Max number of open positions
    dailyLossLimit: number; // Stop trading if daily loss exceeds this
    maxQtyPerInstrument: Record<string, number>; // Specific Qty limits
}

const DEFAULT_LIMITS: RiskLimits = {
    maxOrderValue: 2000000, // 20 Lakhs
    maxTotalPositions: 50,
    dailyLossLimit: 100000, // 1 Lakh
    maxQtyPerInstrument: {
        "NIFTY": 1800, // Approximately 36 lots
        "BANKNIFTY": 900 // Approximately 60 lots
    }
};

/**
 * Institutional Risk Guard
 * Validates orders against pre-defined safety limits before they reach the broker.
 */
export class RiskGuard {
    static async validateOrder(
        orderParams: any,
        currentPositions: NormalizedPosition[],
        dailyPnL: number,
        limits: RiskLimits = DEFAULT_LIMITS
    ) {
        // 1. Daily Loss Limit Check
        if (dailyPnL <= -limits.dailyLossLimit) {
            throw new Error(`RISK_VIOLATION: Daily Loss Limit Reached (₹${Math.abs(dailyPnL)} >= ₹${limits.dailyLossLimit})`);
        }

        // 2. Max Order Value Check
        const estimatedValue = (orderParams.price || 1) * orderParams.quantity;
        if (estimatedValue > limits.maxOrderValue) {
            throw new Error(`RISK_VIOLATION: Order value ₹${estimatedValue} exceeds limit ₹${limits.maxOrderValue}`);
        }

        // 3. Max Total Positions
        if (currentPositions.length >= limits.maxTotalPositions) {
            // Only block if opening a NEW symbol
            const isExisting = currentPositions.find(p => p.tradingsymbol === orderParams.tradingsymbol);
            if (!isExisting) {
                throw new Error(`RISK_VIOLATION: Maximum allowed positions (${limits.maxTotalPositions}) reached.`);
            }
        }

        // 4. Instrument Specific Qty Check
        for (const [symbolPart, limit] of Object.entries(limits.maxQtyPerInstrument)) {
            if (orderParams.tradingsymbol.includes(symbolPart)) {
                if (orderParams.quantity > limit) {
                    throw new Error(`RISK_VIOLATION: Quantity ${orderParams.quantity} for ${orderParams.tradingsymbol} exceeds symbol limit of ${limit}`);
                }
            }
        }

        return true;
    }
}
