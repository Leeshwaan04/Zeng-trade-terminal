import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const appId = process.env.FYERS_APP_ID; // App ID
    const origin = req.nextUrl.origin;
    const redirectUri = process.env.FYERS_REDIRECT_URI || `${origin}/api/fyers/auth/callback`;

    if (!appId) {
        return NextResponse.json({ error: "Fyers App ID not configured" }, { status: 500 });
    }

    // Fyers API V3 Auth URL
    const authUrl = `https://api-v3.fyers.in/api/v3/generate-authcode?client_id=${appId}&redirect_uri=${redirectUri}&response_type=code&state=sample_state`;

    return NextResponse.redirect(authUrl);
}
