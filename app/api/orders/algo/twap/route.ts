import { NextRequest, NextResponse } from "next/server";
import { getAuthCredentials } from "@/lib/auth-utils";
import { placeOrder } from "@/lib/kite-client";
import { z } from "zod";

const twapSchema = z.object({
    tradingsymbol: z.string().min(1),
    exchange: z.enum(["NSE", "BSE", "NFO", "CDS", "BFO", "MCX"]),
    transaction_type: z.enum(["BUY", "SELL"]),
    order_type: z.enum(["MARKET", "LIMIT", "SL", "SL-M"]),
    total_quantity: z.number().int().positive(),
    duration_minutes: z.number().positive(),
    slices: z.number().int().positive().default(5),
    product: z.enum(["CNC", "NRML", "MIS"]),
    price: z.number().nonnegative().optional(),
    trigger_price: z.number().nonnegative().optional(),
});

// Reuse the same global active algos map
global.activeAlgos = global.activeAlgos || new Map();

export async function POST(req: NextRequest) {
    const auth = await getAuthCredentials();
    if (!auth) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const validation = twapSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: "Invalid payload", details: validation.error.format() }, { status: 400 });
        }

        const { total_quantity, duration_minutes, slices, ...orderParams } = validation.data;

        if (slices > total_quantity) {
            return NextResponse.json({ error: "Slices cannot be greater than total quantity." }, { status: 400 });
        }

        const algoId = `twap-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Start background TWAP execution
        executeTWAP(algoId, auth, total_quantity, duration_minutes, slices, orderParams);

        return NextResponse.json({
            status: "success",
            message: "TWAP execution started",
            algo_id: algoId
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to start TWAP" }, { status: 500 });
    }
}

async function executeTWAP(algoId: string, auth: any, totalQty: number, durationMinutes: number, slices: number, orderParams: any) {
    let executedQty = 0;
    let completedSlices = 0;

    global.activeAlgos.set(algoId, { status: 'running', type: 'twap', totalQty, executedQty });

    console.log(`[ALGO] Started TWAP ${algoId} for ${orderParams.tradingsymbol}. Total Qty: ${totalQty}, Slices: ${slices}, Duration: ${durationMinutes}m`);

    const intervalMs = (durationMinutes * 60 * 1000) / slices;
    const qtyPerSlice = Math.floor(totalQty / slices);
    const remainder = totalQty % slices;

    while (completedSlices < slices && executedQty < totalQty) {
        const state = global.activeAlgos.get(algoId);
        if (state?.status === 'cancelled') {
            console.log(`[ALGO] TWAP ${algoId} cancelled.`);
            break;
        }

        // Add the remainder to the very last slice
        const isLastSlice = completedSlices === slices - 1;
        const currentSliceQty = isLastSlice ? qtyPerSlice + remainder : qtyPerSlice;

        try {
            if (auth.broker === "GROWW") {
                const { placeGrowwOrder } = await import("@/lib/groww-client");
                await placeGrowwOrder(auth.accessToken, { ...orderParams, quantity: currentSliceQty, trading_symbol: orderParams.tradingsymbol, segment: "FNO" });
            } else {
                await placeOrder(auth.apiKey!, auth.accessToken, { ...orderParams, quantity: currentSliceQty });
            }

            executedQty += currentSliceQty;
            completedSlices++;
            global.activeAlgos.set(algoId, { status: 'running', type: 'twap', totalQty, executedQty, completedSlices });
            console.log(`[ALGO] TWAP ${algoId} slice ${completedSlices}/${slices} executed (${currentSliceQty} qty).`);

            if (completedSlices < slices) {
                // Wait for the TWAP interval
                console.log(`[ALGO] TWAP ${algoId} waiting ${intervalMs}ms for next slice...`);
                await new Promise(resolve => setTimeout(resolve, intervalMs));
            }

        } catch (error: any) {
            console.error(`[ALGO] TWAP ${algoId} failed on slice ${completedSlices + 1}. Aborting.`, error);
            global.activeAlgos.set(algoId, { status: 'error', error: error.message, executedQty });
            break;
        }
    }

    if (executedQty >= totalQty) {
        global.activeAlgos.set(algoId, { status: 'completed', totalQty, executedQty });
        console.log(`[ALGO] TWAP ${algoId} completed.`);
    }
}
