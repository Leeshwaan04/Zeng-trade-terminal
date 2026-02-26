/**
 * GET /api/upstox/instruments?exchange=NSE&search=RELIANCE&limit=50
 *
 * Downloads Upstox instrument JSON from CDN, caches in memory,
 * and supports search by symbol or name.
 */
import { NextRequest, NextResponse } from "next/server";
import { fetchInstruments, UpstoxError } from "@/lib/upstox-client";

export async function GET(req: NextRequest) {
    const exchange = (req.nextUrl.searchParams.get("exchange") || "NSE") as any;
    const search = req.nextUrl.searchParams.get("search")?.toUpperCase() || "";
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);

    const validExchanges = ["complete", "NSE", "BSE", "MCX"];
    if (!validExchanges.includes(exchange)) {
        return NextResponse.json(
            { error: `Invalid exchange. Valid: ${validExchanges.join(", ")}` },
            { status: 400 }
        );
    }

    try {
        let instruments = await fetchInstruments(exchange);

        // Filter by search query
        if (search) {
            instruments = instruments.filter(
                (i) =>
                    (i.tradingsymbol && i.tradingsymbol.toUpperCase().includes(search)) ||
                    (i.name && i.name.toUpperCase().includes(search))
            );
        }

        const results = instruments.slice(0, Math.min(limit, 200));

        return NextResponse.json({
            status: "success",
            total: instruments.length,
            count: results.length,
            data: results,
        });
    } catch (error: any) {
        if (error instanceof UpstoxError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
        }
        return NextResponse.json({ error: "Instrument fetch failed" }, { status: 500 });
    }
}
