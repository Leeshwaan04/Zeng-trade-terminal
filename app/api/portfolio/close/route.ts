/**
 * POST /api/portfolio/close
 * Forces an exact market close of a specific net position
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthCredentials } from "@/lib/auth-utils";
import { placeOrder, getPositions, KiteError } from "@/lib/kite-client";
import { z } from "zod";

const closePositionSchema = z.object({
    tradingsymbol: z.string().min(1),
    exchange: z.enum(["NSE", "BSE", "NFO", "CDS", "BFO", "MCX"]),
    product: z.enum(["CNC", "NRML", "MIS"]),
});

export async function POST(req: NextRequest) {
    const auth = await getAuthCredentials();
    if (!auth) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        const body = await req.json();

        const validation = closePositionSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                { error: "Invalid close payload", details: validation.error.format() },
                { status: 400 }
            );
        }

        const { tradingsymbol, exchange, product } = validation.data;

        // 1. Fetch live true positions directly from broker to avoid UI race conditions
        const portfolio = await getPositions(auth.apiKey!, auth.accessToken!);
        const netPositions = portfolio.net || [];

        // 2. Find the exact matching position
        const targetPos = netPositions.find((p: any) =>
            p.tradingsymbol === tradingsymbol &&
            p.product === product &&
            p.exchange === exchange
        );

        if (!targetPos) {
            return NextResponse.json({ error: "Position not found on broker" }, { status: 404 });
        }

        const quantity = targetPos.quantity;

        // 3. Prevent zero-quantity closures
        if (quantity === 0) {
            return NextResponse.json({ error: "Position is already flat (0 qty)" }, { status: 400 });
        }

        // 4. Calculate exact opposing transaction type
        const exitAction = quantity > 0 ? "SELL" : "BUY";
        const exitQuantity = Math.abs(quantity);

        // 5. Fire exact market order to flatten
        const result = await placeOrder(auth.apiKey!, auth.accessToken!, {
            tradingsymbol,
            exchange,
            transaction_type: exitAction,
            order_type: "MARKET",
            quantity: exitQuantity,
            product: product as any,
            validity: "DAY"
        });

        return NextResponse.json({
            status: "success",
            message: `Flattened ${exitQuantity}x ${tradingsymbol}`,
            data: result
        });

    } catch (error: any) {
        if (error instanceof KiteError) {
            return NextResponse.json(
                { error: error.message, error_type: error.errorType },
                { status: error.httpStatus }
            );
        }
        return NextResponse.json({ error: "Failed to close position" }, { status: 500 });
    }
}
