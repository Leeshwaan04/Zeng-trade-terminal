/**
 * POST /api/orders/place
 * Places a real order via Kite Connect
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthCredentials } from "@/lib/auth-utils";
import { placeOrder, KiteError } from "@/lib/kite-client";

export async function POST(req: NextRequest) {
    const auth = await getAuthCredentials();
    if (!auth) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        const body = await req.json();

        // Validate required fields
        const required = ["tradingsymbol", "exchange", "transaction_type", "order_type", "quantity", "product"];
        for (const field of required) {
            if (!body[field]) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        if (auth.broker === "GROWW") {
            const { placeGrowwOrder } = await import("@/lib/groww-client");
            // Map Kite-style body to Groww params
            const growwParams: any = {
                trading_symbol: body.tradingsymbol,
                exchange: body.exchange,
                transaction_type: body.transaction_type,
                order_type: body.order_type,
                quantity: Number(body.quantity),
                price: Number(body.price || 0),
                product: body.product === "CNC" ? "CNC" : body.product === "MIS" ? "MIS" : "NRML",
                segment: body.exchange === "NFO" || body.exchange === "BFO" ? "FNO" : "CASH",
                validity: body.validity || "DAY"
            };
            const result = await placeGrowwOrder(auth.accessToken, growwParams);
            return NextResponse.json({ status: "success", data: result });
        } else {
            const result = await placeOrder(auth.apiKey!, auth.accessToken, body);
            return NextResponse.json({ status: "success", data: result });
        }
    } catch (error: any) {
        if (error instanceof KiteError) {
            return NextResponse.json(
                { error: error.message, error_type: error.errorType },
                { status: error.httpStatus }
            );
        }
        return NextResponse.json({ error: "Order placement failed" }, { status: 500 });
    }
}
