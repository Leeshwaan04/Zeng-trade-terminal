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

    try {
        const results = await Promise.allSettled(allAuth.map(async (auth: AuthCredentials) => {
            if (auth.broker === "GROWW") {
                const { getGrowwPositions } = await import("@/lib/groww-client");
                const positions = await getGrowwPositions(auth.accessToken);
                return (positions || []).map((p: any) => ({ ...p, broker: "GROWW" }));
            } else if (auth.broker === "DHAN") {
                const { getDhanPositions } = await import("@/lib/dhan-client");
                const positions = await getDhanPositions(auth.accessToken);
                return positions.net; // Dhan net positions
            } else if (auth.broker === "FYERS") {
                const { getFyersPositions } = await import("@/lib/fyers-client");
                const positions = await getFyersPositions(auth.accessToken);
                return positions.net; // Fyers net positions
            } else {
                const positions = await getPositions(auth.apiKey!, auth.accessToken);
                return positions.net.map((p: any) => ({ ...p, broker: "KITE" }));
            }
        }));

        const combinedPositions = results.reduce((acc: any[], res) => {
            if (res.status === "fulfilled") {
                return [...acc, ...res.value];
            }
            return acc;
        }, []);

        return NextResponse.json({ status: "success", data: { net: combinedPositions, day: [] } });
    } catch (error: any) {
        console.error("[PositionsAggregation] Failed:", error);
        return NextResponse.json({ error: "Failed to fetch aggregated positions" }, { status: 500 });
    }
}
