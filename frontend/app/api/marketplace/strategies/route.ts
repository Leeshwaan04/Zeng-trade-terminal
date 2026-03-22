import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// Lazy Redis init — avoids module-level throw when env vars are not set
function getRedis(): Redis | null {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
    try {
        return Redis.fromEnv();
    } catch {
        return null;
    }
}

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
        isActive: true,
    },
    {
        id: "strat-002",
        name: "BANKNIFTY Straddle",
        author: "OptionsGuru",
        authorId: "user-002",
        description: "Short ATM straddle on BANKNIFTY weekly expiry. Capture theta decay in range-bound markets.",
        tags: ["options", "theta", "weekly", "banknifty"],
        metrics: { cagr: 42.1, sharpe: 2.1, maxDrawdown: -18.7, winRate: 65, totalTrades: 156 },
        subscribers: 892,
        price: 1499,
        pricePeriod: "monthly",
        category: "Options",
        risk: "MEDIUM",
        isActive: true,
    },
    {
        id: "strat-003",
        name: "Momentum Breakout",
        author: "TrendFollower",
        authorId: "user-003",
        description: "Long equity positions on 52-week breakouts with volume confirmation. Runs on NSE large caps.",
        tags: ["equity", "momentum", "breakout"],
        metrics: { cagr: 34.8, sharpe: 1.45, maxDrawdown: -22.1, winRate: 54, totalTrades: 312 },
        subscribers: 543,
        price: 799,
        pricePeriod: "monthly",
        category: "Equity",
        risk: "MEDIUM",
        isActive: true,
    },
    {
        id: "strat-004",
        name: "Bull Put Spread",
        author: "RiskReward",
        authorId: "user-004",
        description: "Defined-risk bullish options strategy selling put spreads on index. Max loss is known upfront.",
        tags: ["options", "bullish", "defined-risk"],
        metrics: { cagr: 22.3, sharpe: 2.4, maxDrawdown: -8.5, winRate: 78, totalTrades: 84 },
        subscribers: 2103,
        price: 599,
        pricePeriod: "monthly",
        category: "Options",
        risk: "LOW",
        isActive: true,
    },
    {
        id: "strat-005",
        name: "Scalping Micro Algo",
        author: "HFTLite",
        authorId: "user-005",
        description: "High frequency intraday scalping on NIFTY futures. 50-100 trades/day with tight stops.",
        tags: ["futures", "intraday", "scalping"],
        metrics: { cagr: 68.4, sharpe: 1.2, maxDrawdown: -35.2, winRate: 58, totalTrades: 14200 },
        subscribers: 318,
        price: 2499,
        pricePeriod: "monthly",
        category: "Futures",
        risk: "HIGH",
        isActive: true,
    },
    {
        id: "strat-006",
        name: "Theta Decay Harvester",
        author: "ThetagangIN",
        authorId: "user-006",
        description: "Multi-leg options portfolio selling premium across strikes and expiries to harvest theta.",
        tags: ["options", "theta", "portfolio", "neutral"],
        metrics: { cagr: 31.2, sharpe: 2.8, maxDrawdown: -10.1, winRate: 71, totalTrades: 620 },
        subscribers: 1876,
        price: 1999,
        pricePeriod: "monthly",
        category: "Options",
        risk: "LOW",
        isActive: true,
    },
];

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const category = searchParams.get("category");
        const risk = searchParams.get("risk");
        const q = searchParams.get("q");
        const userId = searchParams.get("userId") || "";

        let strategies = [...SEED_STRATEGIES];

        // Try to load from Redis, fall back to seeds
        const redis = getRedis();
        if (redis) {
            try {
                const cached = await redis.get<typeof SEED_STRATEGIES>("marketplace:strategies");
                if (cached && Array.isArray(cached) && cached.length > 0) {
                    strategies = cached;
                }
            } catch {
                // Redis unavailable — use seeds
            }
        }

        // Get user subscriptions
        let subscribedIds: string[] = [];
        if (redis && userId) {
            try {
                subscribedIds = await redis.smembers(`marketplace:subscriptions:${userId}`);
            } catch {
                // ignore
            }
        }

        // Filter
        if (category && category !== "all") {
            strategies = strategies.filter(s => s.category.toLowerCase() === category.toLowerCase());
        }
        if (risk && risk !== "all") {
            strategies = strategies.filter(s => s.risk === risk.toUpperCase());
        }
        if (q) {
            const lower = q.toLowerCase();
            strategies = strategies.filter(
                s =>
                    s.name.toLowerCase().includes(lower) ||
                    s.author.toLowerCase().includes(lower) ||
                    s.tags.some(t => t.includes(lower))
            );
        }

        const result = strategies.map(s => ({
            ...s,
            isSubscribed: subscribedIds.includes(s.id),
        }));

        return NextResponse.json({ status: "ok", strategies: result, total: result.length });
    } catch (err) {
        console.error("[marketplace/strategies] GET error:", err);
        return NextResponse.json({ status: "error", message: "Internal server error" }, { status: 500 });
    }
}
