import { NextRequest, NextResponse } from "next/server";
import { getOptionChain } from "@/lib/kite-instruments";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");
    const expiry = searchParams.get("expiry");

    if (!symbol) {
        return NextResponse.json({ error: "Symbol is required (e.g., NIFTY)" }, { status: 400 });
    }

    try {
        const chain = await getOptionChain(symbol, expiry || undefined);

        // Group by strike price for easier UI consumption?
        // Or send flat list and let UI handle it. 
        // Sending flat list is more flexible.

        // Optimization: Sort by strike price
        const sortedChain = chain.sort((a, b) => a.strike - b.strike);

        return NextResponse.json({
            status: "success",
            count: sortedChain.length,
            data: sortedChain
        });
    } catch (error) {
        console.error("API Error fetching option chain:", error);
        return NextResponse.json({ error: "Failed to fetch option chain" }, { status: 500 });
    }
}
