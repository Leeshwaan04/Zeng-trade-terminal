import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

// Seed strategies if Redis is empty
const SEED_STRATEGIES = [
    {
        id: "strat-001",
        name: "Iron Condor Monthly",
        author: "AlphaTrader",
        authorId: "user-001",
        description: "Sell OTM calls and puts on NIFTY monthly expiry. Target 2-3% monthly premium with defined risk.",
        tags: ["options", "neutral", "monthly", "nifty"],
        metrics: { cagr: 28.4, sharpe: 1.82, maxDrawdown: -12.3, winRate: 73, totalTrades: 48 },
        subscribers: 1247,
        price: 999,
        pricePeriod: "monthly",
        category: "Options",
        risk: "LOW",
        createdAt: "2025-08-01",
        isVerified: true,
    },
    {
        id: "strat-002",
        name: "BANKNIFTY Straddle Sell",
        author: "OptionsKing",
        authorId: "user-002",
        description: "Sell ATM straddle on BANKNIFTY weekly expiry with dynamic stop loss. Works best in low volatility regimes.",
        tags: ["banknifty", "straddle", "weekly", "premium"],
        metrics: { cagr: 42.1, sharpe: 1.45, maxDrawdown: -18.7, winRate: 68, totalTrades: 156 },
        subscribers: 892,
        price: 1499,
        pricePeriod: "monthly",
        category: "Options",
        risk: "MEDIUM",
        createdAt: "2025-06-15",
        isVerified: true,
    },
    {
        id: "strat-003",
        name: "Momentum Breakout Equity",
        author: "TrendRider",
        authorId: "user-003",
        description: "Buy breakout stocks above 52-week high with volume confirmation. Uses RSI and SMA crossover signals.",
        tags: ["equity", "momentum", "breakout", "intraday"],
        metrics: { cagr: 35.6, sharpe: 1.23, maxDrawdown: -22.1, winRate: 58, totalTrades: 310 },
        subscribers: 634,
        price: 799,
        pricePeriod: "monthly",
        category: "Equity",
        risk: "MEDIUM",
        createdAt: "2025-09-01",
        isVerified: false,
    },
    {
        id: "strat-004",
        name: "Expiry Day Bull Put Spread",
        author: "WeeklyWinner",
        authorId: "user-004",
        description: "Sell ATM put and buy OTM put on expiry day morning. Targets 1-2% with strict risk management.",
        tags: ["options", "bullish", "expiry", "spreads"],
        metrics: { cagr: 51.2, sharpe: 2.01, maxDrawdown: -8.9, winRate: 81, totalTrades: 52 },
        subscribers: 2103,
        price: 1999,
        pricePeriod: "monthly",
        category: "Options",
        risk: "LOW",
        createdAt: "2025-04-20",
        isVerified: true,
    },
    {
        id: "strat-005",
        name: "Scalping Micro Algo",
        author: "ScalpMaster",
        authorId: "user-005",
        description: "High-frequency 1-min chart scalping on NIFTY futures using EMA crossover and VWAP. 20-30 trades per day.",
        tags: ["futures", "scalping", "intraday", "high-frequency"],
        metrics: { cagr: 68.3, sharpe: 1.67, maxDrawdown: -31.2, winRate: 52, totalTrades: 4200 },
        subscribers: 445,
        price: 2499,
        pricePeriod: "monthly",
        category: "Futures",
        risk: "HIGH",
        createdAt: "2025-10-01",
        isVerified: false,
    },
    {
        id: "strat-006",
        name: "Theta Decay Harvester",
        author: "ThetaGang",
        authorId: "user-006",
        description: "Systematic daily theta collection via cash-secured puts and covered calls on large-cap stocks.",
        tags: ["equity", "theta", "covered-calls", "puts"],
        metrics: { cagr: 22.1, sharpe: 2.34, maxDrawdown: -6.2, winRate: 89, totalTrades: 380 },
        subscribers: 3871,
        price: 499,
        pricePeriod: "monthly",
        category: "Options",
        risk: "LOW",
        createdAt: "2025-01-15",
        isVerified: true,
    },
];

export async function GET(req: NextRequest) {
    try {
        const category = req.nextUrl.searchParams.get("category");
        const risk = req.nextUrl.searchParams.get("risk");
        const search = req.nextUrl.searchParams.get("q")?.toLowerCase();
        const userId = req.nextUrl.searchParams.get("userId");

        // Try to get strategies from Redis; fall back to seeds
        let strategies = SEED_STRATEGIES;
        try {
            const stored = await redis.get<typeof SEED_STRATEGIES>("marketplace:strategies");
            if (!stored || stored.length === 0) {
                await redis.set("marketplace:strategies", SEED_STRATEGIES);
            } else {
                strategies = stored;
            }
        } catch {
            // Redis not configured — use seeds directly
        }

        // Get subscriptions for user
        let subscriptions: string[] = [];
        if (userId) {
            try {
                const subs = await redis.smembers(`marketplace:subscriptions:${userId}`);
                subscriptions = subs || [];
            } catch { /* ignore */ }
        }

        // Filter
        let filtered = strategies.filter(s => {
            if (category && category !== "All" && s.category !== category) return false;
            if (risk && risk !== "All" && s.risk !== risk) return false;
            if (search && !s.name.toLowerCase().includes(search) && !s.author.toLowerCase().includes(search) && !s.tags.some(t => t.includes(search))) return false;
            return true;
        });

        return NextResponse.json({
            status: "success",
            data: filtered.map(s => ({ ...s, isSubscribed: subscriptions.includes(s.id) })),
            total: filtered.length,
        });
    } catch (error: any) {
        console.error("[Marketplace] GET failed:", error);
        return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
    }
}
