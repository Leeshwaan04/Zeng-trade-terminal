/**
 * GET /api/portfolio/positions
 * Fetches net and day positions
 */
import { NextResponse } from "next/server";
import { getAuthCredentials } from "@/lib/auth-utils";
import { getPositions, KiteError } from "@/lib/kite-client";

export async function GET() {
    const auth = await getAuthCredentials();
    if (!auth) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        if (auth.broker === "GROWW") {
            const { getGrowwPositions } = await import("@/lib/groww-client");
            const positions = await getGrowwPositions(auth.accessToken);
            // Groww returns a flat array, Kite returns { net: [], day: [] }
            // We'll wrap Groww positions in a Kite-compatible structure for the UI
            return NextResponse.json({ status: "success", data: { net: positions, day: [] } });
        } else {
            const positions = await getPositions(auth.apiKey!, auth.accessToken);
            return NextResponse.json({ status: "success", data: positions });
        }
    } catch (error: any) {
        if (error instanceof KiteError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.httpStatus }
            );
        }
        return NextResponse.json({ error: "Failed to fetch positions" }, { status: 500 });
    }
}
