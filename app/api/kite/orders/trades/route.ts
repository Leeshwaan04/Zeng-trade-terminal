import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOrderTrades } from "@/lib/kite-client";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("order_id");

    if (!orderId) {
        return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const accessToken = cookieStore.get("kite_access_token")?.value;
    const apiKey = process.env.KITE_API_KEY;

    if (!accessToken || !apiKey) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        const trades = await getOrderTrades(apiKey, accessToken, orderId);
        return NextResponse.json({ status: "success", data: trades });
    } catch (err: any) {
        console.error("[Trades] GET failed:", err.message);
        return NextResponse.json({ error: err.message }, { status: err.httpStatus ?? 500 });
    }
}
