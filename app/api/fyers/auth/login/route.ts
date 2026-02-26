import { NextResponse } from "next/server";

export async function GET() {
    const appId = process.env.FYERS_APP_ID; // App ID
    const redirectUri = process.env.FYERS_REDIRECT_URI || "http://localhost:3000/api/fyers/auth/callback";

    if (!appId) {
        return NextResponse.json({ error: "Fyers App ID not configured" }, { status: 500 });
    }

    // Fyers API V3 Auth URL
    const authUrl = `https://api-v3.fyers.in/api/v3/generate-authcode?client_id=${appId}&redirect_uri=${redirectUri}&response_type=code&state=sample_state`;

    return NextResponse.redirect(authUrl);
}
