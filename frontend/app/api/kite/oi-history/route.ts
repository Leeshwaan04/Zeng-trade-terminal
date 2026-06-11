import { NextRequest, NextResponse } from "next/server";
import { getSnapshots } from "@/lib/oi-store";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol") || "NIFTY";

    const snapshots = await getSnapshots(symbol);

    if (snapshots.length === 0) {
        // No real snapshots yet (cron not running / market not opened today) —
        // return a clearly-flagged mock series so the widget still renders.
        const mockSnapshots = [];
        let baseCE = 12_000_000;
        let basePE = 10_000_000;
        const now = new Date();
        now.setHours(9, 15, 0, 0);

        for (let i = 0; i < 30; i++) {
            mockSnapshots.push({
                time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
                ce_total: baseCE,
                pe_total: basePE,
                pcr: +(basePE / baseCE).toFixed(3),
                strikes: {},
            });
            baseCE += Math.floor(Math.random() * 500_000) - 100_000;
            basePE += Math.floor(Math.random() * 550_000) - 50_000;
            now.setMinutes(now.getMinutes() + 3);
        }
        return NextResponse.json({ status: "success", data: mockSnapshots, isMock: true });
    }

    return NextResponse.json({ status: "success", data: snapshots, isMock: false });
}
