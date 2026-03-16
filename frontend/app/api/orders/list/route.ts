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

    try {
        const results = await Promise.allSettled(allAuth.map(async (auth: AuthCredentials) => {
            if (auth.broker === "GROWW") {
                const { getGrowwOrders } = await import("@/lib/groww-client");
                const orders = await getGrowwOrders(auth.accessToken);
                return (orders || []).map((o: any) => ({ ...o, broker: "GROWW" }));
            } else if (auth.broker === "DHAN") {
                const { getDhanOrders } = await import("@/lib/dhan-client");
                return await getDhanOrders(auth.accessToken);
            } else if (auth.broker === "FYERS") {
                const { getFyersOrders } = await import("@/lib/fyers-client");
                return await getFyersOrders(auth.accessToken);
            } else {
                const orders = await getOrders(auth.apiKey!, auth.accessToken);
                return orders.map((o: any) => ({ ...o, broker: "KITE" }));
            }
        }));

        const combinedOrders = results.reduce((acc: any[], res) => {
            if (res.status === "fulfilled") {
                return [...acc, ...res.value];
            }
            return acc;
        }, []);

        return NextResponse.json({ status: "success", data: combinedOrders });
    } catch (error: any) {
        console.error("[OrdersAggregation] Failed:", error);
        return NextResponse.json({ error: "Failed to fetch aggregated orders" }, { status: 500 });
    }
}
