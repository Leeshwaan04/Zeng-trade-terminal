import { NextRequest, NextResponse } from "next/server";
import { getAuthCredentials } from "@/lib/auth-utils";
import { placeOrder } from "@/lib/kite-client";

/**
 * Institutional Strategy Builder API
 * Handles execution of multiple order legs in a sequence.
 * Uses Promise.allSettled to ensure we report on every leg's result.
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getAuthCredentials();
        if (!auth || !auth.apiKey || !auth.accessToken) {
            return NextResponse.json({ status: "error", message: "Not authenticated" }, { status: 401 });
        }
        const { apiKey, accessToken } = auth;
        const body = await req.json();
        const { orders, tag } = body;

        if (!Array.isArray(orders) || orders.length === 0) {
            return NextResponse.json({
                status: "error",
                message: "Invalid orders array"
            }, { status: 400 });
        }

        console.info(`[STRATEGY] Executing sequence of ${orders.length} legs for tag: ${tag || 'UNTAGGED'}`);

        // We execute sequentially to respect potential margin releases from closing legs 
        // that enable opening new ones, and to avoid rate-limit bursts if the array is large.
        const results = [];
        for (const orderParams of orders) {
            try {
                // Attach tag to each order if provided
                const paramsWithTag = { ...orderParams, tag };
                const result = await placeOrder(apiKey, accessToken, paramsWithTag);
                results.push({
                    status: "success",
                    data: result,
                    params: orderParams
                });
            } catch (error: any) {
                console.error(`[STRATEGY] Leg failed: ${orderParams.tradingsymbol}`, error);
                results.push({
                    status: "error",
                    message: error.message,
                    params: orderParams
                });
            }
        }

        const failureCount = results.filter(r => r.status === "error").length;
        const status = failureCount === 0 ? "success" : failureCount === orders.length ? "error" : "partial";

        return NextResponse.json({
            status,
            data: {
                results,
                summary: {
                    total: orders.length,
                    success: orders.length - failureCount,
                    failed: failureCount
                }
            },
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error("Multi-leg execution failed:", error);
        return NextResponse.json({
            status: "error",
            message: error.message || "Execution engine failure"
        }, { status: 500 });
    }
}
