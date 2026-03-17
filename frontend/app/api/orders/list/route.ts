/**
 * GET /api/orders/list
 * Fetches all orders for the day
 */
import { NextResponse } from "next/server";
import { getAllAuthCredentials, AuthCredentials } from "@/lib/auth-utils";
import { getOrders, KiteError } from "@/lib/kite-client";

export async function GET() {
    const allAuth = await getAllAuthCredentials();
    if (allAuth.length === 0) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const primaryAuth = allAuth[0];
    if (primaryAuth.broker !== "KITE") {
        return NextResponse.json({ error: "Only Kite is supported in this phase" }, { status: 403 });
    }

    try {
        const orders = await getOrders(primaryAuth.apiKey!, primaryAuth.accessToken!);
        const kiteOrders = orders.map((o: any) => ({ ...o, broker: "KITE" }));
        
        return NextResponse.json({ status: "success", data: kiteOrders });
    } catch (error: any) {
        console.error("[OrdersAggregation] Failed:", error);
        return NextResponse.json({ error: "Failed to fetch aggregated orders" }, { status: 500 });
    }
}
