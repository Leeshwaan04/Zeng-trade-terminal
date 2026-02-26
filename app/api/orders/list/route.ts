/**
 * GET /api/orders/list
 * Fetches all orders for the day
 */
import { NextResponse } from "next/server";
import { getAuthCredentials } from "@/lib/auth-utils";
import { getOrders, KiteError } from "@/lib/kite-client";

export async function GET() {
    const auth = await getAuthCredentials();
    if (!auth) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        if (auth.broker === "GROWW") {
            const { getGrowwOrders } = await import("@/lib/groww-client");
            const orders = await getGrowwOrders(auth.accessToken);
            return NextResponse.json({ status: "success", data: orders });
        } else {
            const orders = await getOrders(auth.apiKey!, auth.accessToken);
            return NextResponse.json({ status: "success", data: orders });
        }
    } catch (error: any) {
        if (error instanceof KiteError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.httpStatus }
            );
        }
        return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }
}
