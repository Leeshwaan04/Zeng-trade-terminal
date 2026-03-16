import { blackScholes, BSResult } from "../lib/black-scholes";

// Listen for messages from the main thread
self.addEventListener("message", (event: MessageEvent) => {
    const { id, type, payload } = event.data;

    if (type === "COMPUTE_CHAIN_GREEKS") {
        const { strikes, spotPrice, timeToExpiry, riskFreeRate, impliedVol } = payload;

        try {
            const results: Record<string, { ce: BSResult, pe: BSResult }> = {};

            for (const strike of strikes) {
                const ceGreeks = blackScholes(spotPrice, strike, Math.max(0.001, timeToExpiry), riskFreeRate, impliedVol, "CE");
                const peGreeks = blackScholes(spotPrice, strike, Math.max(0.001, timeToExpiry), riskFreeRate, impliedVol, "PE");

                results[strike] = { ce: ceGreeks, pe: peGreeks };
            }

            self.postMessage({
                id,
                type: "CHAIN_GREEKS_RESULT",
                success: true,
                payload: results
            });
        } catch (error: any) {
            self.postMessage({
                id,
                type: "CHAIN_GREEKS_RESULT",
                success: false,
                error: error.message
            });
        }
    }
});
