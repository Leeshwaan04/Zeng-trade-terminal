import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { broker, apiKey, apiSecret } = await req.json();

        if (!broker || !apiKey || !apiSecret) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Create payload
        const creds = JSON.stringify({ broker, apiKey, apiSecret });

        // 2. Set secure httpOnly cookie (valid for 5 mins - enough for OAuth redirect)
        const response = NextResponse.json({ success: true });

        const isProduction = process.env.NODE_ENV === "production";

        response.cookies.set("zeng_temp_creds", creds, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            maxAge: 300,
            path: "/",
        });

        // Also set a state cookie for CSRF
        const state = Math.random().toString(36).substring(7);
        response.cookies.set("kite_oauth_state", state, {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax",
            maxAge: 300,
            path: "/",
        });

        return response;
    } catch (e) {
        console.error("[PreAuth] Error:", e);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
