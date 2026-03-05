/**
 * Black-Scholes Mathematical Model
 * Used for option pricing, Greeks calculation, and Implied Volatility.
 */

// Cumulative Standard Normal Distribution
function cnd(x: number): number {
    const a1 = 0.31938153, a2 = -0.356563782, a3 = 1.781477937, a4 = -1.821255978, a5 = 1.330274429;
    const L = Math.abs(x);
    const K = 1.0 / (1.0 + 0.2316419 * L);
    let w = 1.0 - 1.0 / Math.sqrt(2 * Math.PI) * Math.exp(-L * L / 2) * (a1 * K + a2 * K * K + a3 * Math.pow(K, 3) + a4 * Math.pow(K, 4) + a5 * Math.pow(K, 5));
    if (x < 0) w = 1.0 - w;
    return w;
}

// Probability Density Function of the Standard Normal Distribution
function ndf(x: number): number {
    return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
}

export interface BSResult {
    price: number;
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    rho: number;
}

/**
 * Calculates option price and Greeks
 * @param S Current Spot Price
 * @param K Strike Price
 * @param T Time to Expiration (in years)
 * @param r Risk-free Interest Rate (decimal, e.g. 0.07 for 7%)
 * @param v Volatility (decimal, e.g. 0.2 for 20%)
 * @param type 'CE' | 'PE'
 */
export function blackScholes(S: number, K: number, T: number, r: number, v: number, type: 'CE' | 'PE'): BSResult {
    if (T <= 0) return { price: Math.max(0, type === 'CE' ? S - K : K - S), delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };

    const d1 = (Math.log(S / K) + (r + v * v / 2) * T) / (v * Math.sqrt(T));
    const d2 = d1 - v * Math.sqrt(T);

    let price, delta, theta, rho;
    const gamma = ndf(d1) / (S * v * Math.sqrt(T));
    const vega = S * Math.sqrt(T) * ndf(d1) / 100; // Divided by 100 to show value per 1% change

    if (type === 'CE') {
        price = S * cnd(d1) - K * Math.exp(-r * T) * cnd(d2);
        delta = cnd(d1);
        theta = (-(S * ndf(d1) * v) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * cnd(d2)) / 365;
        rho = (K * T * Math.exp(-r * T) * cnd(d2)) / 100;
    } else {
        price = K * Math.exp(-r * T) * cnd(-d2) - S * cnd(-d1);
        delta = cnd(d1) - 1;
        theta = (-(S * ndf(d1) * v) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * cnd(-d2)) / 365;
        rho = (-K * T * Math.exp(-r * T) * cnd(-d2)) / 100;
    }

    return { price, delta, gamma, theta, vega, rho };
}

/**
 * Calculates Implied Volatility using Newton-Raphson method
 * @param marketPrice Current option premium in market
 * @param S Spot Price
 * @param K Strike Price
 * @param T Time to Expiration
 * @param r Interest Rate
 * @param type 'CE' | 'PE'
 */
export function calculateIV(marketPrice: number, S: number, K: number, T: number, r: number, type: 'CE' | 'PE'): number {
    let v = 0.3; // Initial guess (30% vol)
    const MAX_ITERATIONS = 100;
    const PRECISION = 1e-5;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
        const result = blackScholes(S, K, T, r, v, type);
        const diff = result.price - marketPrice;
        if (Math.abs(diff) < PRECISION) return v;

        // v = v - f(v)/f'(v) where f'(v) is Vega
        // Vega in blackScholes is per 1%, so multiply by 100 to get raw derivative
        const vegaRaw = result.vega * 100;
        if (vegaRaw < 0.0001) break; // Avoid division by zero
        v = v - diff / vegaRaw;

        if (v <= 0) v = 0.0001; // Floor at near zero
    }
    return v;
}
