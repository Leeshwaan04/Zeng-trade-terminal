/**
 * GET /api/portfolio/holdings
 * Fetches equity holdings
 */
import { NextResponse } from "next/server";
import { getAuthCredentials } from "@/lib/auth-utils";
import { getHoldings, KiteError } from "@/lib/kite-client";

export async function GET() {
    const auth = await getAuthCredentials();
    if (!auth) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        if (auth.broker === "GROWW") {
            const { getGrowwHoldings } = await import("@/lib/groww-client");
            const holdings = await getGrowwHoldings(auth.accessToken);
            return NextResponse.json({ status: "success", data: holdings });
        } else {
            const holdings = await getHoldings(auth.apiKey!, auth.accessToken);
            return NextResponse.json({ status: "success", data: holdings });
        }
    } catch (error: any) {
        if (error instanceof KiteError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.httpStatus }
            );
        }
        return NextResponse.json({ error: "Failed to fetch holdings" }, { status: 500 });
    }
}
