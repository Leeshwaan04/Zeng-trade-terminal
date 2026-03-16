/**
 * POST /api/orders/place
 * Places a real order via Kite Connect
 */
import { NextRequest, NextResponse } from "next/server";
import { getAllAuthCredentials } from "@/lib/auth-utils";
import { placeOrder, KiteError, getPositions, getHoldings } from "@/lib/kite-client";
import { RiskGuard } from "@/lib/risk-guard";
import { normalizeKitePosition } from "@/lib/portfolio-utils";
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
    const allAuth = await getAllAuthCredentials();
    if (allAuth.length === 0) {
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

        // ─── RISK GUARD VALIDATION ──────────────────────────────────
        try {
            // Fetch current state for risk check
            // Fetch current state for risk check using primary broker
            const primaryAuth = allAuth[0];
            const kitePositions = await getPositions(primaryAuth.apiKey!, primaryAuth.accessToken);
            // Kite returns { net: [], day: [] }
            const allKitePositions = [...(kitePositions.net || []), ...(kitePositions.day || [])];
            const normalizedPositions = allKitePositions.map((p: any) => normalizeKitePosition(p));
            const dailyPnL = normalizedPositions.reduce((acc: number, p: any) => acc + (p.pnl || 0), 0);

            await RiskGuard.validateOrder(saneBody, normalizedPositions, dailyPnL);
        } catch (riskError: any) {
            console.warn(`[RISK_GUARD] Blocked Order: ${riskError.message}`);
            return NextResponse.json({
                status: "error",
                error: riskError.message,
                risk_violation: true
            }, { status: 403 }); // Forbidden due to risk
        }
        // ────────────────────────────────────────────────────────────

        // ─── SMART ORDER ROUTING (SOR) ──────────────────────────────
        // If multiple brokers are connected, intelligently splinter 
        // the required margin payload across all available gateways.
        // ────────────────────────────────────────────────────────────
        if (allAuth.length > 1 && saneBody.quantity >= allAuth.length) {
            console.log(`[SOR] Splitting order of ${saneBody.quantity} across ${allAuth.length} gateways.`);

            const baseQty = Math.floor(saneBody.quantity / allAuth.length);
            let remainder = saneBody.quantity % allAuth.length;

            const sorResults = await Promise.allSettled(allAuth.map(async (auth) => {
                const sliceQty = baseQty + (remainder > 0 ? 1 : 0);
                remainder = Math.max(0, remainder - 1);

                if (sliceQty === 0) return null;

                const sliceBody = { ...saneBody, quantity: sliceQty };

                if (auth.broker === "GROWW") {
                    const { placeGrowwOrder } = await import("@/lib/groww-client");
                    const growwParams: any = {
                        trading_symbol: sliceBody.tradingsymbol,
                        exchange: sliceBody.exchange,
                        transaction_type: sliceBody.transaction_type,
                        order_type: sliceBody.order_type,
                        quantity: sliceBody.quantity,
                        price: sliceBody.price || 0,
                        product: sliceBody.product === "CNC" ? "CNC" : sliceBody.product === "MIS" ? "MIS" : "NRML",
                        segment: sliceBody.exchange === "NFO" || sliceBody.exchange === "BFO" ? "FNO" : "CASH",
                        validity: sliceBody.validity
                    };
                    return await placeGrowwOrder(auth.accessToken, growwParams);
                } else if (auth.broker === "DHAN") {
                    const { placeDhanOrder } = await import("@/lib/dhan-client");
                    return await placeDhanOrder(auth.accessToken, sliceBody);
                } else if (auth.broker === "FYERS") {
                    const { placeFyersOrder } = await import("@/lib/fyers-client");
                    return await placeFyersOrder(auth.accessToken, sliceBody);
                } else {
                    return await placeOrder(auth.apiKey!, auth.accessToken, sliceBody);
                }
            }));

            const successful = sorResults.filter((r) => r.status === 'fulfilled');
            if (successful.length === 0) {
                throw new Error("SOR completely failed across all brokers.");
            }
            return NextResponse.json({ status: "success", sor_routed: true, shards: successful.length, data: successful.map((r: any) => r.value) });
        }

        // Single Broker Fallback
        const primaryAuth = allAuth[0];
        if (primaryAuth.broker === "GROWW") {
            const { placeGrowwOrder } = await import("@/lib/groww-client");
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
            const result = await placeGrowwOrder(primaryAuth.accessToken, growwParams);
            return NextResponse.json({ status: "success", data: result });
        } else if (primaryAuth.broker === "DHAN") {
            const { placeDhanOrder } = await import("@/lib/dhan-client");
            const result = await placeDhanOrder(primaryAuth.accessToken, saneBody);
            return NextResponse.json({ status: "success", data: result });
        } else if (primaryAuth.broker === "FYERS") {
            const { placeFyersOrder } = await import("@/lib/fyers-client");
            const result = await placeFyersOrder(primaryAuth.accessToken, saneBody);
            return NextResponse.json({ status: "success", data: result });
        } else {
            const result = await placeOrder(primaryAuth.apiKey!, primaryAuth.accessToken, saneBody);
            return NextResponse.json({ status: "success", data: result });
        }
    } catch (error: any) {
        if (error instanceof KiteError) {
            return NextResponse.json(
                { error: error.message, error_type: error.errorType },
                { status: error.httpStatus }
            );
        }
        return NextResponse.json({ error: error.message || "Order placement failed" }, { status: 500 });
    }
}
