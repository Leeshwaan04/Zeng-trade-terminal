/**
 * DELETE /api/orders/cancel
 * Cancels an order via Kite Connect
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthCredentials } from "@/lib/auth-utils";
import { cancelOrder, KiteError } from "@/lib/kite-client";
import { z } from "zod";

const cancelOrderSchema = z.object({
    order_id: z.string().min(1, "order_id is required"),
    variety: z.enum(["regular", "amo", "co", "iceberg", "auction"]).optional().default("regular")
});

export async function DELETE(req: NextRequest) {
    const auth = await getAuthCredentials();
    if (!auth) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const validation = cancelOrderSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Invalid cancel payload", details: validation.error.format() },
                { status: 400 }
            );
        }

        const { order_id, variety } = validation.data;
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
