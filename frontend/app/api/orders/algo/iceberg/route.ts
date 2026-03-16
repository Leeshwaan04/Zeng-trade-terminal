import { NextRequest, NextResponse } from "next/server";
import { getAuthCredentials } from "@/lib/auth-utils";
import { placeOrder } from "@/lib/kite-client";
import { z } from "zod";

const icebergSchema = z.object({
    tradingsymbol: z.string().min(1),
    exchange: z.enum(["NSE", "BSE", "NFO", "CDS", "BFO", "MCX"]),
    transaction_type: z.enum(["BUY", "SELL"]),
    order_type: z.enum(["MARKET", "LIMIT", "SL", "SL-M"]),
    total_quantity: z.number().int().positive(),
    leg_quantity: z.number().int().positive(),
    product: z.enum(["CNC", "NRML", "MIS"]),
    price: z.number().nonnegative().optional(),
    trigger_price: z.number().nonnegative().optional(),
});

// In-memory store for active algos (For production, use Redis or DB)
global.activeAlgos = global.activeAlgos || new Map();

export async function POST(req: NextRequest) {
    const auth = await getAuthCredentials();
    if (!auth) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const validation = icebergSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: "Invalid payload", details: validation.error.format() }, { status: 400 });
        }

        const { total_quantity, leg_quantity, ...orderParams } = validation.data;

        if (leg_quantity >= total_quantity) {
            return NextResponse.json({ error: "Leg quantity must be smaller than total quantity for Iceberg orders" }, { status: 400 });
        }

        const algoId = `iceberg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Start the background execution
        executeIceberg(algoId, auth, total_quantity, leg_quantity, orderParams);

        return NextResponse.json({
            status: "success",
            message: "Iceberg execution started",
            algo_id: algoId
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to start Iceberg" }, { status: 500 });
    }
}

async function executeIceberg(algoId: string, auth: any, totalQty: number, legQty: number, orderParams: any) {
    let executedQty = 0;

    global.activeAlgos.set(algoId, { status: 'running', totalQty, executedQty });

    console.log(`[ALGO] Started Iceberg ${algoId} for ${orderParams.tradingsymbol}`);

    while (executedQty < totalQty) {
        // Check if algo was cancelled
        const state = global.activeAlgos.get(algoId);
        if (state?.status === 'cancelled') {
            console.log(`[ALGO] Iceberg ${algoId} cancelled.`);
            break;
        }

        const remainingQty = totalQty - executedQty;
        const currentSliceQty = Math.min(legQty, remainingQty);

        try {
            // Place the child order
            if (auth.broker === "GROWW") {
                const { placeGrowwOrder } = await import("@/lib/groww-client");
                await placeGrowwOrder(auth.accessToken, { ...orderParams, quantity: currentSliceQty, trading_symbol: orderParams.tradingsymbol, segment: "FNO" });
            } else {
                await placeOrder(auth.apiKey!, auth.accessToken, { ...orderParams, quantity: currentSliceQty });
            }

            executedQty += currentSliceQty;
            global.activeAlgos.set(algoId, { status: 'running', totalQty, executedQty });
            console.log(`[ALGO] Iceberg ${algoId} sliced ${currentSliceQty}. Progress: ${executedQty}/${totalQty}`);

            // Wait before placing next leg (e.g. random delay between 500ms and 2000ms to avoid detection, or static delay)
            const delayMs = Math.floor(Math.random() * 1500) + 500;
            await new Promise(resolve => setTimeout(resolve, delayMs));

        } catch (error: any) {
            console.error(`[ALGO] Iceberg ${algoId} failed on slice. Pausing/Aborting.`, error);
            global.activeAlgos.set(algoId, { status: 'error', error: error.message, executedQty });
            break;
        }
    }

    if (executedQty >= totalQty) {
        global.activeAlgos.set(algoId, { status: 'completed', totalQty, executedQty });
        console.log(`[ALGO] Iceberg ${algoId} completed.`);
    }
}
