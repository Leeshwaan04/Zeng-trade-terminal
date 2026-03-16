/**
 * GET /api/portfolio/unified
 * Fused Portfolio Aggregator: Fetches and normalizes holdings/positions
 * from all authenticated brokers.
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthCredentials } from "@/lib/auth-utils";
import * as kite from "@/lib/kite-client";
import {
    normalizeKiteHolding,
    normalizeKitePosition,
    NormalizedHolding,
    NormalizedPosition
} from "@/lib/portfolio-utils";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const isMock = searchParams.get("mock") === "true";

    const auth = await getAuthCredentials();

    if (!auth && !isMock) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        const holdings: NormalizedHolding[] = [];
        const positions: NormalizedPosition[] = [];

        const tasks = [];

        // 1. KITE
        if (auth?.apiKey && auth?.accessToken) {
            tasks.push((async () => {
                try {
                    const [kHoldings, kPositions] = await Promise.all([
                        kite.getHoldings(auth.apiKey!, auth.accessToken),
                        kite.getPositions(auth.apiKey!, auth.accessToken)
                    ]);
                    holdings.push(...kHoldings.map(normalizeKiteHolding));
                    positions.push(...kPositions.net.map(normalizeKitePosition));
                } catch (e) {
                    console.error("Kite portfolio fetch failed:", e);
                }
            })());
        }

        if (isMock) {
            // Seed some mock data
            holdings.push(
                normalizeKiteHolding({
                    tradingsymbol: "RELIANCE",
                    exchange: "NSE",
                    isin: "INE002A01018",
                    quantity: 10,
                    average_price: 2500,
                    last_price: 2650,
                    pnl: 1500
                })
            );
        }

        await Promise.all(tasks);

        return NextResponse.json({
            status: "success",
            timestamp: new Date().toISOString(),
            data: {
                holdings,
                positions,
                summary: {
                    total_holdings_count: holdings.length,
                    total_positions_count: positions.length,
                    brokers: Array.from(new Set([...holdings.map(h => h.broker), ...positions.map(p => p.broker)]))
                }
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: "Failed to aggregate portfolio", details: error.message }, { status: 500 });
    }
}
