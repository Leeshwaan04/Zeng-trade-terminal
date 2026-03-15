/**
 * POST /api/kite/pretrade
 *
 * Calculates required margin AND brokerage/tax charges for a proposed order
 * in a single round-trip. Called from OrderConfirmDialog before the user
 * commits to a live trade.
 *
 * Body (JSON):
 * {
 *   exchange: string;
 *   tradingsymbol: string;
 *   transaction_type: "BUY" | "SELL";
 *   order_type: "MARKET" | "LIMIT" | "SL" | "SL-M";
 *   product: "CNC" | "NRML" | "MIS";
 *   quantity: number;
 *   price?: number;
 *   trigger_price?: number;
 *   variety?: string;
 * }
 *
 * Response:
 * {
 *   margin: { total, span, exposure, option_premium, additional, cash, var, pnl }
 *   charges: { brokerage, transaction_tax, exchange_turnover_charge, sebi_turnover_fee, stamp_duty, gst, total }
 *   available_margin: number  // from /user/margins for comparison
 *   sufficient: boolean
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getOrderMargins, getOrderCharges, getMargins, KiteMarginOrder } from "@/lib/kite-client";

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("kite_access_token")?.value;
    const apiKey = process.env.KITE_API_KEY;

    if (!accessToken || !apiKey) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { exchange, tradingsymbol, transaction_type, order_type, product, quantity, price, trigger_price } = body;
    if (!exchange || !tradingsymbol || !transaction_type || !order_type || !product || !quantity) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const orderSpec: KiteMarginOrder = {
        exchange,
        tradingsymbol,
        transaction_type,
        variety: body.variety || "regular",
        product,
        order_type,
        quantity: Number(quantity),
        ...(price ? { price: Number(price) } : {}),
        ...(trigger_price ? { trigger_price: Number(trigger_price) } : {}),
    };

    // Fire margin calc + charges calc + available margin in parallel
    const [marginResult, chargesResult, marginsResult] = await Promise.allSettled([
        getOrderMargins(apiKey, accessToken, [orderSpec]),
        getOrderCharges(apiKey, accessToken, [orderSpec]),
        getMargins(apiKey, accessToken, "equity"),
    ]);

    // Parse margin
    let margin: any = null;
    if (marginResult.status === "fulfilled" && marginResult.value?.length > 0) {
        const m = marginResult.value[0];
        margin = {
            total: m.total ?? 0,
            span: m.span ?? 0,
            exposure: m.exposure ?? 0,
            option_premium: m.option_premium ?? 0,
            additional: m.additional ?? 0,
            cash: m.cash ?? 0,
            var: m.var ?? 0,
            pnl: m.pnl ?? {},
        };
    }

    // Parse charges
    let charges: any = null;
    if (chargesResult.status === "fulfilled" && chargesResult.value?.length > 0) {
        const c = chargesResult.value[0];
        const total =
            (c.brokerage ?? 0) +
            (c.transaction_tax ?? 0) +
            (c.exchange_turnover_charge ?? 0) +
            (c.sebi_turnover_fee ?? 0) +
            (c.stamp_duty ?? 0) +
            ((c.gst?.total ?? c.gst) ?? 0);
        charges = {
            brokerage: c.brokerage ?? 0,
            transaction_tax: c.transaction_tax ?? 0,
            exchange_turnover_charge: c.exchange_turnover_charge ?? 0,
            sebi_turnover_fee: c.sebi_turnover_fee ?? 0,
            stamp_duty: c.stamp_duty ?? 0,
            gst: c.gst?.total ?? c.gst ?? 0,
            total: Number(total.toFixed(2)),
        };
    }

    // Parse available margin
    let availableMargin = 0;
    if (marginsResult.status === "fulfilled") {
        availableMargin = marginsResult.value?.equity?.available?.live_balance ?? 0;
    }

    const sufficient = margin ? availableMargin >= (margin.total ?? 0) : null;

    return NextResponse.json({
        status: "success",
        data: {
            margin,
            charges,
            available_margin: availableMargin,
            sufficient,
        },
    });
}
