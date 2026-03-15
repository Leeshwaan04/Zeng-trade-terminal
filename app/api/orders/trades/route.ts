/**
 * GET /api/orders/trades?order_id=xxx
 *
 * Returns actual fill-level data for a placed order via Kite's
 * GET /orders/{order_id}/trades endpoint.
 *
 * Unlike /orders which returns average_price (approximation),
 * this returns each individual fill with:
 *   - fill_timestamp (exchange time, not order time)
 *   - quantity (partial fills visible)
 *   - price (actual execution price)
 *   - exchange_order_id, exchange_trade_id
 *
 * Used by: Post-Trade Attribution engine, Order book trade detail view.
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOrderTrades } from "@/lib/kite-client";

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("kite_access_token")?.value;
    const apiKey = process.env.KITE_API_KEY;

    if (!accessToken || !apiKey) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const orderId = req.nextUrl.searchParams.get("order_id");
    if (!orderId) {
        return NextResponse.json({ error: "Missing order_id parameter" }, { status: 400 });
    }

    try {
        const trades = await getOrderTrades(apiKey, accessToken, orderId);
        return NextResponse.json({ status: "success", data: trades });
    } catch (err: any) {
        console.error("[OrderTrades] Failed:", err.message);
        return NextResponse.json({ error: err.message }, { status: err.httpStatus ?? 500 });
    }
}
