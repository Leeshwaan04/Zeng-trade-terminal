/**
 * GET /api/kite/snapshot?tokens=256265,260105
 *
 * Returns current-day OHLC + LTP for a list of instrument tokens via
 * Kite's /quote/ohlc endpoint (max 1000 instruments per call).
 *
 * Called once on login to pre-fill the market store with real prices
 * BEFORE the WebSocket connection is established, eliminating the
 * "blank watchlist" flash users see during WS handshake (~500ms).
 *
 * Response shape matches the ParsedTick / TickerData interface so
 * it can be fed directly into updateTickers().
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOHLC } from "@/lib/kite-client";
import { MARKET_INSTRUMENTS } from "@/lib/market-config";

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("kite_access_token")?.value;
    const apiKey = process.env.KITE_API_KEY;

    if (!accessToken || !apiKey) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tokensParam = req.nextUrl.searchParams.get("tokens");
    if (!tokensParam) {
        return NextResponse.json({ error: "Missing tokens parameter" }, { status: 400 });
    }

    // Accept token numbers — convert to "NSE:SYMBOL" or "BSE:SYMBOL" strings Kite expects
    const requestedTokens = tokensParam
        .split(",")
        .map(t => parseInt(t.trim(), 10))
        .filter(t => !isNaN(t) && t > 0);

    if (requestedTokens.length === 0) {
        return NextResponse.json({ error: "No valid tokens" }, { status: 400 });
    }

    // Build "EXCHANGE:SYMBOL" identifiers Kite expects for /quote/ohlc
    const instruments: string[] = [];
    const tokenToInst: Record<number, any> = {};
    for (const token of requestedTokens) {
        const inst = MARKET_INSTRUMENTS.find(i => i.token === token);
        if (inst) {
            // Kite wants "NSE:NIFTY 50" or "BSE:SENSEX"
            const exchange = inst.exchange || "NSE";
            instruments.push(`${exchange}:${inst.symbol}`);
            tokenToInst[token] = inst;
        }
    }

    if (instruments.length === 0) {
        return NextResponse.json({ status: "success", data: [] });
    }

    try {
        // /quote/ohlc supports up to 1000 instruments
        const ohlcData = await getOHLC(apiKey, accessToken, instruments);

        // Normalize to TickerData shape for direct updateTickers() consumption
        const ticks = Object.entries(ohlcData).map(([key, q]: [string, any]) => {
            const token = q.instrument_token;
            const inst = tokenToInst[token] || MARKET_INSTRUMENTS.find(i => i.token === token);
            return {
                instrument_token: token,
                symbol: inst?.symbol || key.split(":")[1] || key,
                last_price: q.last_price ?? 0,
                ohlc: {
                    open: q.ohlc?.open ?? 0,
                    high: q.ohlc?.high ?? 0,
                    low: q.ohlc?.low ?? 0,
                    close: q.ohlc?.close ?? 0,
                },
                // Compute net_change vs previous close
                net_change: q.last_price && q.ohlc?.close
                    ? q.last_price - q.ohlc.close
                    : 0,
                change_percent: q.last_price && q.ohlc?.close && q.ohlc.close > 0
                    ? ((q.last_price - q.ohlc.close) / q.ohlc.close) * 100
                    : 0,
                volume: 0,
                last_quantity: 0,
                average_price: 0,
                oi: 0,
                depth: { buy: [], sell: [] },
                timestamp: Date.now(),
            };
        });

        return NextResponse.json({ status: "success", data: ticks });
    } catch (err: any) {
        console.error("[Snapshot] Failed:", err.message);
        return NextResponse.json({ error: err.message }, { status: err.httpStatus ?? 500 });
    }
}
