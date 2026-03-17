/**
 * GET /api/portfolio/positions
 * Fetches net and day positions
 */
import { NextResponse } from "next/server";
import { getAllAuthCredentials, AuthCredentials } from "@/lib/auth-utils";
import { getPositions, KiteError } from "@/lib/kite-client";

export async function GET() {
    const allAuth = await getAllAuthCredentials();
    if (allAuth.length === 0) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const primaryAuth = allAuth[0];
    if (primaryAuth.broker !== "KITE") {
        return NextResponse.json({ error: "Only Kite is supported in this phase" }, { status: 403 });
    }

    try {
        const positions = await getPositions(primaryAuth.apiKey!, primaryAuth.accessToken!);
        const netPositions = positions.net.map((p: any) => ({ ...p, broker: "KITE" }));
        
        return NextResponse.json({ 
            status: "success", 
            data: { 
                net: netPositions, 
                day: positions.day.map((p: any) => ({ ...p, broker: "KITE" })) 
            } 
        });
    } catch (error: any) {
        console.error("[PositionsAggregation] Failed:", error);
        return NextResponse.json({ error: "Failed to fetch aggregated positions" }, { status: 500 });
    }
}
