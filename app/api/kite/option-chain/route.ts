import { NextRequest, NextResponse } from "next/server";
import { getOptionChain } from "@/lib/kite-instruments";

const mapSymbolToKiteName = (symbol: string) => {
    if (symbol === "NIFTY 50") return "NIFTY";
    if (symbol === "NIFTY BANK" || symbol === "BANKNIFTY") return "BANKNIFTY";
    if (symbol === "FINNIFTY") return "FINNIFTY";
    if (symbol === "MIDCPNIFTY") return "MIDCPNIFTY";
    return symbol.replace(/\s+/g, ""); // fallback
};

export async function GET(req: NextRequest) {
    try {
        const symbolParam = req.nextUrl.searchParams.get("symbol") || "NIFTY 50";
        const expiryParam = req.nextUrl.searchParams.get("expiry");
        const kiteName = mapSymbolToKiteName(symbolParam);

        // Fetch instruments for the specific expiry or default
        const instruments = await getOptionChain(kiteName, expiryParam || undefined);

        if (!instruments || instruments.length === 0) {
            return NextResponse.json({ success: false, error: "No instruments found for " + kiteName }, { status: 404 });
        }

        const activeExpiry = instruments[0].expiry;

        // Group by strike
        const strikesMap = new Map<number, any>();

        instruments.forEach(inst => {
            if (!strikesMap.has(inst.strike)) {
                strikesMap.set(inst.strike, { strike: inst.strike, ce: null, pe: null });
            }

            const group = strikesMap.get(inst.strike);
            if (inst.instrument_type === "CE") {
                group.ce = inst;
            } else if (inst.instrument_type === "PE") {
                group.pe = inst;
            }
        });

        // Convert to sorted array
        const strikes = Array.from(strikesMap.values()).sort((a, b) => a.strike - b.strike);

        // Also fetch all available expiries for this symbol to populate the selector
        const { getExpiries } = await import("@/lib/kite-instruments");
        const allExpiries = await getExpiries(kiteName);

        return NextResponse.json({
            success: true,
            symbol: kiteName,
            activeExpiry,
            allExpiries,
            strikes
        });

    } catch (error: any) {
        console.error("Option Chain API Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
