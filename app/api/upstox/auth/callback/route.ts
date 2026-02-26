/**
 * GET /api/upstox/auth/callback?code=xxx
 *
 * Upstox OAuth callback — exchanges auth code for access token,
 * stores it in cookies, and redirects to the app.
 */
import { NextRequest, NextResponse } from "next/server";
import { exchangeToken, UpstoxError } from "@/lib/upstox-client";

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get("code");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!code) {
        return NextResponse.redirect(`${appUrl}/?auth_error=no_code`);
    }

    try {
        const result = await exchangeToken(code);
        const response = NextResponse.redirect(`${appUrl}/?auth_success=upstox`);

        // httpOnly cookie for server-side API calls
        response.cookies.set("upstox_access_token", result.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 86400, // 24h — Upstox tokens expire daily
            path: "/",
        });

        // Readable cookie for client-side state
        const authPayload = JSON.stringify({
            user_id: result.user_id,
            user_name: result.user_name,
            email: result.email,
            provider: "upstox",
        });
        response.cookies.set("upstox_auth_payload", authPayload, {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 86400,
            path: "/",
        });

        return response;
    } catch (error: any) {
        const msg = error instanceof UpstoxError ? error.message : "auth_failed";
        return NextResponse.redirect(`${appUrl}/?auth_error=${encodeURIComponent(msg)}`);
    }
}
