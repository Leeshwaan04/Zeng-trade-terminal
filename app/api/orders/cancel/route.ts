/**
 * DELETE /api/orders/cancel
 * Cancels an order via Kite Connect
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthCredentials } from "@/lib/auth-utils";
import { cancelOrder, KiteError } from "@/lib/kite-client";

export async function DELETE(req: NextRequest) {
    const auth = await getAuthCredentials();
    if (!auth) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        const { order_id, variety } = await req.json();
        if (!order_id) {
            return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
        }

        const result = await cancelOrder(auth.apiKey!, auth.accessToken!, order_id, variety);
        return NextResponse.json({ status: "success", data: result });
    } catch (error: any) {
        if (error instanceof KiteError) {
            return NextResponse.json(
                { error: error.message, error_type: error.errorType },
                { status: error.httpStatus }
            );
        }
        return NextResponse.json({ error: "Cancel failed" }, { status: 500 });
    }
}
