import { NextResponse } from "next/server";

export async function GET() {
    const clientId = process.env.DHAN_CLIENT_ID;
    const redirectUri = process.env.DHAN_REDIRECT_URI || "http://localhost:3000/api/dhan/auth/callback";

    if (!clientId) {
        return NextResponse.json({ error: "Dhan Client ID not configured" }, { status: 500 });
    }

    // Dhan OAuth2 URL (Hypothetical, as API docs vary, usually: https://auth.dhan.co/v2/login)
    // Standard Dhan Connect URL
    const authUrl = `https://auth.dhan.co/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=orders,read`;

    return NextResponse.redirect(authUrl);
}
