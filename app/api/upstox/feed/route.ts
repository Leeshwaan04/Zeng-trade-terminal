/**
 * GET /api/upstox/feed?keys=NSE_EQ|INE848E01016,NSE_INDEX|Nifty 50
 *
 * REST market quote proxy — fallback when WebSocket is unavailable.
 */
import { NextRequest, NextResponse } from "next/server";
import { fetchMarketQuotes, UpstoxError } from "@/lib/upstox-client";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("upstox_access_token")?.value
        || process.env.UPSTOX_ACCESS_TOKEN;

    if (!accessToken || accessToken === "your_access_token_here") {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const keysParam = req.nextUrl.searchParams.get("keys");
    if (!keysParam) {
        return NextResponse.json(
            { error: "Missing keys parameter. Format: NSE_EQ|INE848E01016,NSE_INDEX|Nifty 50" },
            { status: 400 }
        );
    }

    const instrumentKeys = keysParam.split(",").map((k) => k.trim()).filter(Boolean);

    try {
        const data = await fetchMarketQuotes(accessToken, instrumentKeys);
        return NextResponse.json({ status: "success", data });
    } catch (error: any) {
        if (error instanceof UpstoxError) {
            return NextResponse.json({ error: error.message }, { status: error.statusCode || 500 });
        }
        return NextResponse.json({ error: "Market quote failed" }, { status: 500 });
    }
}
