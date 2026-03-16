/**
 * GET /api/user/margins
 * Fetches user funds and margins
 */
import { NextRequest, NextResponse } from "next/server";
import { getAllAuthCredentials, AuthCredentials } from "@/lib/auth-utils";
import { getMargins, KiteError } from "@/lib/kite-client";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    // MOCK MODE: Bypass Auth
    if (searchParams.get("mock") === "true") {
        return NextResponse.json({
            status: "success",
            data: {
                equity: {
                    enabled: true,
                    net: 1000000,
                    available: {
                        cash: 500000,
                        opening_balance: 500000,
                        live_balance: 1000000,
                        intraday_payin: 0,
                        overnight_inward_limit: 0,
                        pledged_collateral: 0,
                        collateral: 0
                    },
                    utilised: {
                        debits: 0,
                        exposure: 0,
                        m2m_realised: 0,
                        m2m_unrealised: 0,
                        option_premium: 0,
                        payout: 0,
                        span: 0,
                        holding_sales: 0,
                        turnover: 0
                    }
                },
                commodity: {
                    enabled: true,
                    net: 0,
                    available: {
                        cash: 0,
                        opening_balance: 0,
                        live_balance: 0,
                        intraday_payin: 0,
                        overnight_inward_limit: 0,
                        pledged_collateral: 0,
                        collateral: 0
                    },
                    utilised: {
                        debits: 0,
                        exposure: 0,
                        m2m_realised: 0,
                        m2m_unrealised: 0,
                        option_premium: 0,
                        payout: 0,
                        span: 0,
                        holding_sales: 0,
                        turnover: 0
                    }
                },
                totalAvailable: 1000000,
                netUsed: 0,
                util_percent: 0
            }
        });
    }

    const allAuth = await getAllAuthCredentials();
    if (allAuth.length === 0) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        const brokerMargins: Record<string, any> = {};

        const results = await Promise.allSettled(allAuth.map(async (auth: AuthCredentials) => {
            let marginData: any;
            if (auth.broker === "GROWW") {
                // Groww margins mock for now as client is external
                marginData = { equity: { available: { live_balance: 500000 }, utilised: { debits: 0 } } };
            } else if (auth.broker === "DHAN") {
                const { getDhanMargins } = await import("@/lib/dhan-client");
                marginData = await getDhanMargins(auth.accessToken);
            } else if (auth.broker === "FYERS") {
                const { getFyersMargins } = await import("@/lib/fyers-client");
                marginData = await getFyersMargins(auth.accessToken);
            } else {
                const margins = await getMargins(auth.apiKey!, auth.accessToken!);
                marginData = {
                    equity: margins.equity,
                    commodity: margins.commodity,
                    totalAvailable: (margins.equity?.available?.live_balance || 0) + (margins.commodity?.available?.live_balance || 0),
                    netUsed: (margins.equity?.utilised?.debits || 0) + (margins.commodity?.utilised?.debits || 0)
                };
            }
            return { broker: auth.broker, data: marginData };
        }));

        let totalAvailable = 0;
        let totalUsed = 0;

        results.forEach((res: PromiseSettledResult<{ broker: string, data: any }>) => {
            if (res.status === "fulfilled") {
                const { broker, data } = res.value;
                brokerMargins[broker] = {
                    available: data.totalAvailable || data.equity?.available?.live_balance || 0,
                    used: data.netUsed || data.equity?.utilised?.debits || 0,
                };
                totalAvailable += brokerMargins[broker].available;
                totalUsed += brokerMargins[broker].used;
            }
        });

        const util_percent = totalAvailable > 0 ? (totalUsed / (totalAvailable + totalUsed)) * 100 : 0;

        return NextResponse.json({
            status: "success",
            data: {
                brokers: brokerMargins,
                totalAvailable,
                netUsed: totalUsed,
                util_percent
            }
        });
    } catch (error: any) {
        console.error("[MarginsAggregation] Failed:", error);
        return NextResponse.json({ error: "Failed to fetch aggregated margins" }, { status: 500 });
    }
}
