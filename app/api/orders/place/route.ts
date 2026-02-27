/**
 * POST /api/orders/place
 * Places a real order via Kite Connect
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthCredentials } from "@/lib/auth-utils";
import { placeOrder, KiteError } from "@/lib/kite-client";
import { z } from "zod";

const placeOrderSchema = z.object({
    tradingsymbol: z.string().min(1, "Trading symbol is required"),
    exchange: z.enum(["NSE", "BSE", "NFO", "CDS", "BFO", "MCX"]),
    transaction_type: z.enum(["BUY", "SELL"]),
    order_type: z.enum(["MARKET", "LIMIT", "SL", "SL-M"]),
    quantity: z.number().int().positive("Quantity must be a positive integer"),
    product: z.enum(["CNC", "NRML", "MIS"]),
    validity: z.enum(["DAY", "IOC", "TTL"]).optional().default("DAY"),
    price: z.number().nonnegative("Price cannot be negative").optional(),
    trigger_price: z.number().nonnegative("Trigger price cannot be negative").optional(),
    disclosed_quantity: z.number().int().nonnegative().optional(),
    squareoff: z.number().nonnegative().optional(),
    stoploss: z.number().nonnegative().optional(),
    trailing_stoploss: z.number().nonnegative().optional(),
    tag: z.string().max(20).optional()
});

export async function POST(req: NextRequest) {
    const auth = await getAuthCredentials();
    if (!auth) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        const body = await req.json();

        // Strict Zod Validation
        const validation = placeOrderSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Invalid order payload", details: validation.error.format() },
                { status: 400 }
            );
        }

        const saneBody = validation.data;

        if (auth.broker === "GROWW") {
            const { placeGrowwOrder } = await import("@/lib/groww-client");
            // Map Kite-style body to Groww params
            const growwParams: any = {
                trading_symbol: saneBody.tradingsymbol,
                exchange: saneBody.exchange,
                transaction_type: saneBody.transaction_type,
                order_type: saneBody.order_type,
                quantity: saneBody.quantity,
                price: saneBody.price || 0,
                product: saneBody.product === "CNC" ? "CNC" : saneBody.product === "MIS" ? "MIS" : "NRML",
                segment: saneBody.exchange === "NFO" || saneBody.exchange === "BFO" ? "FNO" : "CASH",
                validity: saneBody.validity
            };
            const result = await placeGrowwOrder(auth.accessToken, growwParams);
            return NextResponse.json({ status: "success", data: result });
        } else {
            const result = await placeOrder(auth.apiKey!, auth.accessToken, saneBody);
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
