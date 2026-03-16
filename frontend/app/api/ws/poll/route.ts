/**
 * GET /api/ws/poll?tokens=256265,260105
 *
 * Lightweight REST endpoint that fetches quotes from Kite Connect API.
 * Designed to complete in <2s, works within Vercel Hobby plan limits.
 * Called repeatedly by the ticker worker as an SSE fallback.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const KITE_API_BASE = "https://api.kite.trade";

export async function GET(req: NextRequest) {
    const broker = req.nextUrl.searchParams.get("broker")?.toUpperCase() || "KITE";
    const cookieStore = await cookies();

    if (broker === "GROWW") {
        const growwAccessToken = cookieStore.get("groww_access_token")?.value;
        if (!growwAccessToken) {
            return NextResponse.json(
                { status: "error", message: "Not authenticated with Groww" },
                { status: 401 }
            );
        }
        // Groww REST Quote API not fully implemented in the backend yet.
        // Return an empty success array so the foreground worker doesn't throw errors 
        // while it aggressively tries to reconnect the WebSocket.
        return NextResponse.json({ status: "success", data: [], timestamp: Date.now() });
    }

    // Default to KITE
    const accessToken = cookieStore.get("kite_access_token")?.value;
    const apiKey = process.env.KITE_API_KEY;

    if (!apiKey || !accessToken) {
        return NextResponse.json(
            { status: "error", message: "Not authenticated" },
            { status: 401 }
        );
    }

    const tokensParam = req.nextUrl.searchParams.get("tokens");
    if (!tokensParam) {
        return NextResponse.json(
            { status: "error", message: "Missing tokens parameter" },
            { status: 400 }
        );
    }

    const instrumentTokens = tokensParam
        .split(",")
        .map((t) => parseInt(t.trim(), 10))
        .filter((t) => !isNaN(t));

    if (instrumentTokens.length === 0) {
        return NextResponse.json(
            { status: "error", message: "Invalid tokens" },
            { status: 400 }
        );
    }

    try {
        // Kite REST Quote API — returns full quote data including OHLC
        const params = instrumentTokens.map((t) => `i=${t}`).join("&");
        const res = await fetch(`${KITE_API_BASE}/quote?${params}`, {
            headers: {
                "X-Kite-Version": "3",
                Authorization: `token ${apiKey}:${accessToken}`,
            },
            // No caching — always fetch fresh quotes
            cache: "no-store",
        });

        const json = await res.json();

        if (json.status !== "success" || !json.data) {
            return NextResponse.json(
                { status: "error", message: json.message || "Quote fetch failed" },
                { status: res.status }
            );
        }

        // Normalize Kite quote response to our tick format
        const ticks = Object.values(json.data).map((q: any) => ({
            instrument_token: q.instrument_token,
            last_price: q.last_price,
            last_quantity: q.last_quantity || 0,
            average_price: q.average_price || 0,
            volume: q.volume || 0,
            buy_quantity: q.buy_quantity || 0,
            sell_quantity: q.sell_quantity || 0,
            ohlc: q.ohlc || { open: 0, high: 0, low: 0, close: 0 },
            oi: q.oi || 0,
            change: q.net_change || 0,
            change_percent: q.last_price && q.ohlc?.close
                ? ((q.last_price - q.ohlc.close) / q.ohlc.close) * 100
                : 0,
            depth: q.depth || { buy: [], sell: [] },
            mode: "quote",
        }));

        return NextResponse.json({
            status: "success",
            data: ticks,
            timestamp: Date.now(),
        });
    } catch (error: any) {
        console.error("[Poll] Error fetching quotes:", error);
        return NextResponse.json(
            { status: "error", message: error.message || "Fetch failed" },
            { status: 500 }
        );
    }
}
