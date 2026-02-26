/**
 * GET /api/user/margins
 * Fetches user funds and margins
 */
import { NextRequest, NextResponse } from "next/server";
import { getAuthCredentials } from "@/lib/auth-utils";
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

    const auth = await getAuthCredentials();
    if (!auth) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        const margins = await getMargins(auth.apiKey!, auth.accessToken!);

        // Cyber-Infinity Aggregation Logic
        const equity = margins.equity?.available?.live_balance || 0;
        const commodity = margins.commodity?.available?.live_balance || 0;
        const totalAvailable = equity + commodity;

        const equityUsed = margins.equity?.utilised?.debits || 0;
        const commodityUsed = margins.commodity?.utilised?.debits || 0;
        const netUsed = equityUsed + commodityUsed;

        const util_percent = totalAvailable > 0 ? (netUsed / (totalAvailable + netUsed)) * 100 : 0;

        return NextResponse.json({
            status: "success",
            data: {
                ...margins,
                totalAvailable,
                netUsed,
                util_percent
            }
        });
    } catch (error: any) {
        if (error instanceof KiteError) {
            return NextResponse.json(
                { error: error.message },
                { status: error.httpStatus }
            );
        }
        return NextResponse.json({ error: "Failed to fetch margins" }, { status: 500 });
    }
}
