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

        // ─── Kite Execution ─────────────────────────────────────────
        const primaryAuth = allAuth[0];
        
        // Safety check to ensure we only use Kite while in this stability phase
        if (primaryAuth.broker !== "KITE") {
            return NextResponse.json({ 
                error: `Broker ${primaryAuth.broker} is currently disabled for security audits. Use Kite.` 
            }, { status: 403 });
        }

        const result = await placeOrder(primaryAuth.apiKey!, primaryAuth.accessToken, saneBody);
        return NextResponse.json({ status: "success", data: result });
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
