/**
 * /api/kite/alerts
 *
 * Full CRUD proxy for Kite Connect v3 Alerts API.
 * Max 500 active alerts per user.
 *
 * GET  — list all alerts
 * POST — create a new alert
 *        Body: { name, lhs_exchange, lhs_tradingsymbol, lhs_attribute, operator, rhs_type, rhs_constant }
 * DELETE ?uuid=xxx — delete a specific alert
 *
 * lhs_attribute values: "last_price" | "volume" | "oi"
 * operator values:      ">" | ">=" | "<" | "<="
 * rhs_type:             "value"
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAlerts, createAlert, deleteAlert, getAlertHistory } from "@/lib/kite-client";

async function getAuth() {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("kite_access_token")?.value;
    const apiKey = process.env.KITE_API_KEY;
    return { accessToken, apiKey };
}

// ─── GET: list all alerts ─────────────────────────────────────
export async function GET(req: NextRequest) {
    const { accessToken, apiKey } = await getAuth();
    if (!accessToken || !apiKey) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const uuid = req.nextUrl.searchParams.get("uuid");
    const history = req.nextUrl.searchParams.get("history") === "true";

    try {
        if (uuid && history) {
            const data = await getAlertHistory(apiKey, accessToken, uuid);
            return NextResponse.json({ status: "success", data });
        }

        const data = await getAlerts(apiKey, accessToken);
        return NextResponse.json({ status: "success", data });
    } catch (err: any) {
        console.error("[Alerts] GET failed:", err.message);
        return NextResponse.json({ error: err.message }, { status: err.httpStatus ?? 500 });
    }
}

// ─── POST: create alert ───────────────────────────────────────
export async function POST(req: NextRequest) {
    const { accessToken, apiKey } = await getAuth();
    if (!accessToken || !apiKey) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { name, lhs_exchange, lhs_tradingsymbol, lhs_attribute, operator, rhs_type, rhs_constant } = body;
    if (!name || !lhs_exchange || !lhs_tradingsymbol || !lhs_attribute || !operator || !rhs_type || rhs_constant === undefined) {
        return NextResponse.json({ error: "Missing required alert fields" }, { status: 400 });
    }

    try {
        const data = await createAlert(apiKey, accessToken, {
            name,
            lhs_exchange,
            lhs_tradingsymbol,
            lhs_attribute,
            operator,
            rhs_type,
            rhs_constant: Number(rhs_constant),
        });
        return NextResponse.json({ status: "success", data });
    } catch (err: any) {
        console.error("[Alerts] POST failed:", err.message);
        return NextResponse.json({ error: err.message }, { status: err.httpStatus ?? 500 });
    }
}

// ─── DELETE: remove alert ─────────────────────────────────────
export async function DELETE(req: NextRequest) {
    const { accessToken, apiKey } = await getAuth();
    if (!accessToken || !apiKey) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const uuid = req.nextUrl.searchParams.get("uuid");
    if (!uuid) {
        return NextResponse.json({ error: "Missing uuid parameter" }, { status: 400 });
    }

    try {
        await deleteAlert(apiKey, accessToken, uuid);
        return NextResponse.json({ status: "success" });
    } catch (err: any) {
        console.error("[Alerts] DELETE failed:", err.message);
        return NextResponse.json({ error: err.message }, { status: err.httpStatus ?? 500 });
    }
}
