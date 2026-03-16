import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol") || "NIFTY"; // Default NIFTY

    const snapshots = global.oiSnapshots?.[symbol] || [];

    if (snapshots.length === 0) {
        // Return a mock dataset if the cron hasn't run yet so the UI has something to render
        const mockSnapshots = [];
        let baseCE = 12000000;
        let basePE = 10000000;
        const now = new Date();
        now.setHours(9, 15, 0, 0); // Start at 9:15 AM

        for (let i = 0; i < 30; i++) { // 30 data points (~1.5 hours)
            mockSnapshots.push({
                time: now.toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' }),
                ce_total: baseCE,
                pe_total: basePE,
                strikes: {} // Ignored for high-level aggregate
            });
            baseCE += Math.floor(Math.random() * 500000) - 100000;
            basePE += Math.floor(Math.random() * 550000) - 50000;
            now.setMinutes(now.getMinutes() + 3);
        }

        return NextResponse.json({ status: "success", data: mockSnapshots, isMock: true });
    }

    return NextResponse.json({ status: "success", data: snapshots, isMock: false });
}
