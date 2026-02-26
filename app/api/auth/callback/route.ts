/**
 * GET /api/auth/callback?request_token=xxx&status=success
 *
 * Kite redirects here after login. We exchange the request_token for
 * an access_token, set a secure httpOnly cookie, and redirect to the app.
 */
import { NextRequest, NextResponse } from "next/server";
import { exchangeToken } from "@/lib/kite-client";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const requestToken = searchParams.get("request_token");
    const status = searchParams.get("status");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // ─── Error Cases ─────────────────────────────────────────
    if (status !== "success" || !requestToken) {
        return NextResponse.redirect(
            `${appUrl}?auth_error=login_failed`
        );
    }

    const apiKey = process.env.KITE_API_KEY;
    const apiSecret = process.env.KITE_API_SECRET;

    if (!apiKey || !apiSecret) {
        return NextResponse.redirect(
            `${appUrl}?auth_error=missing_config`
        );
    }

    try {
        // ─── Token Exchange ──────────────────────────────────
        const result = await exchangeToken(apiKey, apiSecret, requestToken);
        const data = result.data;

        // Build a payload for the client to consume
        const authPayload = JSON.stringify({
            user: {
                user_id: data.user_id,
                user_name: data.user_name,
                user_shortname: data.user_shortname,
                email: data.email,
                broker: data.broker,
                exchanges: data.exchanges,
                products: data.products,
                order_types: data.order_types,
                avatar_url: data.avatar_url,
                login_time: data.login_time,
            },
            access_token: data.access_token,
            public_token: data.public_token,
        });

        // ─── Set Cookies & Redirect ──────────────────────────
        const response = NextResponse.redirect(`${appUrl}?auth_success=1`);

        // httpOnly cookie for server-side API calls (secure)
        response.cookies.set("kite_access_token", data.access_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 8, // 8 hours (Kite tokens expire at 6 AM)
            path: "/",
        });

        // Non-httpOnly cookie for client-side auth state (readable by JS)
        response.cookies.set("kite_auth_payload", authPayload, {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 8,
            path: "/",
        });

        return response;
    } catch (error: any) {
        console.error("Kite token exchange failed:", error);
        return NextResponse.redirect(
            `${appUrl}?auth_error=${encodeURIComponent(error.message || "token_exchange_failed")}`
        );
    }
}
