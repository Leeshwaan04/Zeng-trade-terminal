/**
 * GET /api/cron/oi-snapshot   (scheduled job — see infra/oi-snapshot/)
 *
 * Captures a REAL option-chain OI snapshot for NIFTY & BANKNIFTY and stores it
 * in the durable OI store (Upstash Redis). Triggered every few minutes by a
 * systemd timer on the EC2 box (localhost / docker exec — no internet hop).
 *
 * Auth: Bearer CRON_SECRET. Uses a server-side Kite token (KITE_SERVER_TOKEN)
 * since a cron has no user session. Skips cheaply outside market hours.
 */
import { NextRequest, NextResponse } from "next/server";
import { getQuote } from "@/lib/kite-client";
import { getOptionChain } from "@/lib/kite-instruments";
import { saveSnapshot, isMarketOpen, isRedisConfigured, nowIST, type OISnapshot } from "@/lib/oi-store";

const STRIKES_AROUND_ATM = 10; // ±10 strikes → ~21 strikes, ~42 instruments, 1 quote call

const INDICES = [
    { key: "NIFTY", spotInstrument: "NSE:NIFTY 50" },
    { key: "BANKNIFTY", spotInstrument: "NSE:NIFTY BANK" },
];

export async function GET(req: NextRequest) {
    if (process.env.CRON_SECRET) {
        if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 });
        }
    }

    if (!isMarketOpen()) {
        return NextResponse.json({ status: "skipped", reason: "market closed", ist: nowIST().hhmm });
    }

    const apiKey = process.env.KITE_API_KEY;
    const token = process.env.KITE_SERVER_TOKEN;
    if (!apiKey || !token) {
        // No garbage written — just report the missing config clearly.
        return NextResponse.json(
            { error: "Missing KITE_API_KEY / KITE_SERVER_TOKEN — cannot capture real OI" },
            { status: 503 }
        );
    }

    const results: Record<string, unknown> = {};

    for (const { key, spotInstrument } of INDICES) {
        try {
            // 1) Spot → ATM
            const spotQuote = await getQuote(apiKey, token, [spotInstrument]);
            const spot = spotQuote?.[spotInstrument]?.last_price || 0;
            if (!spot) { results[key] = { skipped: "no spot" }; continue; }

            // 2) Nearest-expiry chain, strikes nearest to spot
            const chain = await getOptionChain(key);
            if (!chain.length) { results[key] = { skipped: "no instruments" }; continue; }

            const expiry = chain[0].expiry;
            const uniqueStrikes = Array.from(new Set(chain.map(i => i.strike))).sort((a, b) => a - b);
            const atmIdx = uniqueStrikes.reduce(
                (best, s, i) => Math.abs(s - spot) < Math.abs(uniqueStrikes[best] - spot) ? i : best, 0
            );
            const selected = new Set(
                uniqueStrikes.slice(
                    Math.max(0, atmIdx - STRIKES_AROUND_ATM),
                    atmIdx + STRIKES_AROUND_ATM + 1
                )
            );

            // 3) One batched quote call for all CE+PE legs of the selected strikes
            const legs = chain.filter(i => selected.has(i.strike));
            const ids = legs.map(i => `NFO:${i.tradingsymbol}`);
            const quotes = await getQuote(apiKey, token, ids);

            // 4) Aggregate real OI per strike
            const strikes: OISnapshot["strikes"] = {};
            let ceTotal = 0, peTotal = 0;
            for (const leg of legs) {
                const oi = quotes?.[`NFO:${leg.tradingsymbol}`]?.oi || 0;
                strikes[leg.strike] = strikes[leg.strike] || { ce_oi: 0, pe_oi: 0 };
                if (leg.instrument_type === "CE") { strikes[leg.strike].ce_oi = oi; ceTotal += oi; }
                else if (leg.instrument_type === "PE") { strikes[leg.strike].pe_oi = oi; peTotal += oi; }
            }

            const snap: OISnapshot = {
                time: nowIST().hhmm,
                ts: Date.now(),
                spot,
                expiry,
                ce_total: ceTotal,
                pe_total: peTotal,
                pcr: ceTotal > 0 ? +(peTotal / ceTotal).toFixed(3) : 0,
                strikes,
            };
            await saveSnapshot(key, snap);
            results[key] = { captured: true, spot, expiry, pcr: snap.pcr, strikes: Object.keys(strikes).length };
        } catch (e: any) {
            console.error(`[CRON] OI snapshot failed for ${key}:`, e?.message);
            results[key] = { error: e?.message || "failed" };
        }
    }

    return NextResponse.json({
        status: "ok",
        durable: isRedisConfigured(),
        ist: nowIST().hhmm,
        results,
    });
}
