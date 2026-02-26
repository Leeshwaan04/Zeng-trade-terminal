import { NextRequest, NextResponse } from "next/server";

const KITE_LOGIN_URL = "https://kite.trade/connect/login";

export async function GET(req: NextRequest) {
    const apiKey = process.env.KITE_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: "KITE_API_KEY is not configured" },
            { status: 500 }
        );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
    const callbackUrl = `${appUrl}/api/auth/callback`;
    const redirectUrl = `${KITE_LOGIN_URL}?api_key=${apiKey}&v=3&redirect_url=${encodeURIComponent(callbackUrl)}`;
    return NextResponse.redirect(redirectUrl);
}
