import { NextRequest, NextResponse } from "next/server";
import { getAuthCredentials } from "@/lib/auth-utils";
import { placeOrder } from "@/lib/kite-client";
import { z } from "zod";

const bracketSchema = z.object({
    tradingsymbol: z.string().min(1),
    exchange: z.enum(["NSE", "BSE", "NFO", "CDS", "BFO", "MCX"]),
    transaction_type: z.enum(["BUY", "SELL"]),
    quantity: z.number().int().positive(),
    product: z.enum(["CNC", "NRML", "MIS"]),
    entry_price: z.number().nonnegative().optional(), // 0 for market
    target_price: z.number().positive(),
    stoploss_price: z.number().positive(),
});

// Reuse the global store for algos
global.activeAlgos = global.activeAlgos || new Map();

export async function POST(req: NextRequest) {
    const auth = await getAuthCredentials();
    if (!auth) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        const body = await req.json();
        const validation = bracketSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: "Invalid payload", details: validation.error.format() }, { status: 400 });
        }

        const saneBody = validation.data;
        const algoId = `oco-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // 1. Fire Entry Order
        let entryResponse: any = null;
        try {
            const orderType = saneBody.entry_price ? "LIMIT" : "MARKET";
            const entryParams = {
                tradingsymbol: saneBody.tradingsymbol,
                exchange: saneBody.exchange,
                transaction_type: saneBody.transaction_type,
                order_type: orderType as "LIMIT" | "MARKET" | "SL" | "SL-M",
                quantity: saneBody.quantity,
                product: saneBody.product,
                validity: "DAY" as "DAY" | "IOC",
                ...(saneBody.entry_price && { price: saneBody.entry_price })
            };

            if (auth.broker === "GROWW") {
                const { placeGrowwOrder } = await import("@/lib/groww-client");
                entryResponse = await placeGrowwOrder(auth.accessToken, {
                    ...entryParams,
                    segment: "FNO",
                    trading_symbol: saneBody.tradingsymbol,
                    price: saneBody.entry_price || 0
                });
            } else {
                entryResponse = await placeOrder(auth.apiKey!, auth.accessToken, entryParams);
            }
        } catch (e: any) {
            return NextResponse.json({ error: `Bracket entry failed: ${e.message}` }, { status: 400 });
        }

        // 2. Start OCO Monitoring Loop
        monitorOCO(algoId, auth, saneBody);

        return NextResponse.json({
            status: "success",
            message: "Bracket Entry Placed. Server-side OCO Engine monitoring exits.",
            algo_id: algoId,
            entry_data: entryResponse
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to start Bracket/OCO" }, { status: 500 });
    }
}

async function monitorOCO(algoId: string, auth: any, params: any) {
    global.activeAlgos.set(algoId, { status: 'running', type: 'bracket', params });
    console.log(`[ALGO] Starting Synthetic OCO Engine for ${params.tradingsymbol}. Target: ${params.target_price}, SL: ${params.stoploss_price}`);

    const isBuy = params.transaction_type === "BUY";
    let exitTriggered = false;

    // Simulated Poll loop - in production this connects to Kite Ticker WebSocket
    while (!exitTriggered) {
        const state = global.activeAlgos.get(algoId);
        if (state?.status === 'cancelled') {
            console.log(`[ALGO] OCO ${algoId} cancelled locally.`);
            break;
        }

        // Simulate fetching LTP
        // let ltp = await getQuote(params.tradingsymbol);
        // For testing we will simulate price movement towards TP or SL randomly
        await new Promise(r => setTimeout(r, 2000));

        // Mock a 10% chance to hit TP, 10% chance to hit SL
        const rand = Math.random();

        let triggerReason = "";
        let exitPrice = 0;

        if (rand > 0.90) { // Hit TP
            exitPrice = params.target_price;
            triggerReason = "TARGET HIT";
        } else if (rand < 0.10) { // Hit SL
            exitPrice = params.stoploss_price;
            triggerReason = "STOPLOSS HIT";
        }

        if (triggerReason !== "") {
            exitTriggered = true;
            console.log(`[ALGO] OCO ${algoId} TRIGGERED: ${triggerReason} @ ${exitPrice}`);

            // Fire Exit Order
            const exitOrderType = "MARKET" as const;
            const exitTransactionType = isBuy ? "SELL" : "BUY";

            const exitParams = {
                tradingsymbol: params.tradingsymbol,
                exchange: params.exchange,
                transaction_type: exitTransactionType as "BUY" | "SELL",
                order_type: exitOrderType,
                quantity: params.quantity,
                product: params.product,
                validity: "DAY" as "DAY" | "IOC"
            };

            try {
                if (auth.broker === "GROWW") {
                    const { placeGrowwOrder } = await import("@/lib/groww-client");
                    await placeGrowwOrder(auth.accessToken, {
                        ...exitParams,
                        segment: "FNO",
                        trading_symbol: params.tradingsymbol,
                        price: 0
                    });
                } else {
                    await placeOrder(auth.apiKey!, auth.accessToken, exitParams);
                }
                global.activeAlgos.set(algoId, { status: 'completed', triggerReason, exitPrice });
                console.log(`[ALGO] OCO Exit Order Placed for ${algoId}`);
            } catch (e) {
                console.error(`[ALGO] CRITICAL ERROR: OCO Exit failed for ${algoId}. User is uncovered!`, e);
                global.activeAlgos.set(algoId, { status: 'error_exit_failed', error: String(e) });
            }
        }
    }
}
