/**
 * POST /api/orders/gtt
 * Places a Good Till Triggered (GTT) order
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthCredentials } from "@/lib/auth-utils";
import { placeGTTOrder, KiteError, KiteGTTParams } from "@/lib/kite-client";
import { z } from "zod";

const gttOrderSchema = z.object({
    type: z.enum(["single", "two-leg"]),
    condition: z.object({
        exchange: z.enum(["NSE", "BSE", "NFO", "CDS", "BFO", "MCX"]),
        tradingsymbol: z.string().min(1),
        trigger_values: z.array(z.number().nonnegative()),
        last_price: z.number().nonnegative()
    }),
    orders: z.array(z.object({
        exchange: z.enum(["NSE", "BSE", "NFO", "CDS", "BFO", "MCX"]),
        tradingsymbol: z.string().min(1),
        transaction_type: z.enum(["BUY", "SELL"]),
        quantity: z.number().int().positive(),
        order_type: z.enum(["LIMIT"]),
        product: z.enum(["CNC", "NRML", "MIS"]),
        price: z.number().nonnegative()
    })).min(1).max(2)
});

export async function POST(req: NextRequest) {
    const auth = await getAuthCredentials();
    if (!auth) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        const body = await req.json();

        // Strict Zod Validation
        const validation = gttOrderSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "Invalid GTT payload", details: validation.error.format() },
                { status: 400 }
            );
        }

        const saneBody = validation.data;

        const gttParams: KiteGTTParams = {
            type: saneBody.type,
            condition: saneBody.condition,
            orders: saneBody.orders
        };

        const result = await placeGTTOrder(auth.apiKey!, auth.accessToken, gttParams);
        return NextResponse.json({ status: "success", data: result });
    } catch (error: any) {
        if (error instanceof KiteError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.httpStatus }
            );
        }
        return NextResponse.json({ error: "Failed to place GTT order" }, { status: 500 });
    }
}
