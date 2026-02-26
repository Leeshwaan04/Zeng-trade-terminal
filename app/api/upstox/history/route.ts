
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const UPSTOX_API_URL = "https://api.upstox.com/v2/historical-candle";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const instrumentKey = searchParams.get("instrument_key");
    const intervalParam = searchParams.get("interval"); // "1m", "1D", etc. from frontend
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    if (!instrumentKey || !intervalParam || !fromDate || !toDate) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // MOCK MODE: Bypass Auth
    if (searchParams.get("mock") === "true") {
        return NextResponse.json(generateMockData(fromDate, toDate, intervalParam || "day", 24050));
    }

    // 1. Get Access Token
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("upstox_access_token")?.value;

    if (!accessToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Map Interval
    let interval = "day";
    switch (intervalParam) {
        case "1m": interval = "1minute"; break;
        case "3m": interval = "3minute"; break; // Check if supported
        case "5m": interval = "5minute"; break;
        case "15m": interval = "15minute"; break;
        case "30m": interval = "30minute"; break;
        case "1H": interval = "60minute"; break;
        // Upstox might not support 2H/3H natively in v2 historical
        case "1D": interval = "day"; break;
        case "1W": interval = "week"; break;
        default: interval = "day"; break;
    }

    // 3. Fetch from Upstox
    // URL format: /historical-candle/{instrumentKey}/{interval}/{to_date}/{from_date}
    // Dates should be YYYY-MM-DD
    const url = `${UPSTOX_API_URL}/${instrumentKey}/${interval}/${toDate}/${fromDate}`;

    try {
        const res = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Accept": "application/json"
            }
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("Upstox History Error:", err);
            return NextResponse.json({ error: "Upstox API Error", details: err }, { status: res.status });
        }

        const json = await res.json();
        const candles = json.data?.candles || [];

        if (candles.length > 1) {
            const t1 = new Date(candles[0][0]).getTime();
            const t2 = new Date(candles[1][0]).getTime();
            if (t1 > t2) {
                candles.reverse();
            }
        }

        return NextResponse.json({
            status: "success",
            data: { candles }
        });

    } catch (error: any) {
        console.error("Upstox Proxy Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function generateMockData(fromStr: string, toStr: string, interval: string, basePrice: number) {
    const candles = [];
    const from = new Date(fromStr).getTime();
    const to = new Date(toStr).getTime();
    let current = from;
    const step = interval === "day" ? 86400000 : interval === "1H" ? 3600000 : 300000;

    let price = basePrice;

    while (current <= to) {
        const volatility = basePrice * 0.006; // Different volatility
        const change = (Math.random() - 0.5) * volatility;
        const open = price;
        const close = price + change;
        const high = Math.max(open, close) + Math.random() * volatility * 0.4;
        const low = Math.min(open, close) - Math.random() * volatility * 0.4;
        const volume = Math.floor(Math.random() * 80000);

        const timeStr = new Date(current).toISOString();
        candles.push([timeStr, open, high, low, close, volume]);

        price = close;
        current += step;
    }

    return { status: "success", data: { candles } };
}
