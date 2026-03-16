/**
 * GET /api/auth/login
 * Redirects user to Kite Connect login page
 */
import { NextResponse } from "next/server";

export async function GET(req: any) {
    const apiKey = process.env.KITE_API_KEY;
    if (!apiKey) {
        return NextResponse.json(
            { error: "KITE_API_KEY not configured" },
            { status: 500 }
        );
    }

    const origin = req.nextUrl.origin;
    const redirectUri = encodeURIComponent(`${origin}/api/auth/callback`);
    const loginUrl = `https://kite.zerodha.com/connect/login?v=3&api_key=${apiKey}&redirect_uri=${redirectUri}`;

    return NextResponse.redirect(loginUrl);
}
