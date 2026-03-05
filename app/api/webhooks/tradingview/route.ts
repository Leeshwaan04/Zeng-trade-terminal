"use client";

import { NextRequest, NextResponse } from "next/server";
import { getAllAuthCredentials } from "@/lib/auth-utils";
import { placeOrder } from "@/lib/kite-client";
import { z } from "zod";

/**
 * Expected TradingView Alert JSON Payload:
 * {
 *   "secret": "ZENG_PRO_XYZ",
 *   "symbol": "NIFTY24SEP25500CE",
 *   "exchange": "NFO",
 *   "side": "BUY",
 *   "qty": 50,
 *   "type": "MARKET"
 * }
 */

const tvWebhookSchema = z.object({
    secret: z.string(),
    symbol: z.string(),
    exchange: z.enum(["NSE", "BSE", "NFO", "CDS", "BFO"]),
    side: z.enum(["BUY", "SELL"]),
    qty: z.number().positive(),
    type: z.enum(["MARKET", "LIMIT"]).default("MARKET"),
    price: z.number().optional()
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = tvWebhookSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: "Invalid TV Payload" }, { status: 400 });
        }

        const { secret, symbol, exchange, side, qty, type, price } = validation.data;

        // Security Check
        const WEBHOOK_SECRET = process.env.TV_WEBHOOK_SECRET || "ZENG_SECURE_TOKEN";
        if (secret !== WEBHOOK_SECRET) {
            return NextResponse.json({ error: "Forbidden: Invalid Secret" }, { status: 403 });
        }

        const allAuth = await getAllAuthCredentials();
        if (allAuth.length === 0) {
            return NextResponse.json({ error: "Broker session expired" }, { status: 401 });
        }

        const primaryAuth = allAuth[0];

        // Trigger Execution
        const result = await placeOrder(primaryAuth.apiKey!, primaryAuth.accessToken, {
            tradingsymbol: symbol,
            exchange,
            transaction_type: side,
            order_type: type,
            quantity: qty,
            product: "MIS", // Default to intraday for webhooks
            validity: "DAY",
            price: price || 0,
            tag: "TV_BRIDGE"
        });

        return NextResponse.json({
            status: "success",
            message: "Signal processed",
            order_id: result.order_id
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
