/**
 * GET /api/auth/callback?request_token=xxx&status=success
 *
 * Kite redirects here after login. We exchange the request_token for
 * an access_token, set a secure httpOnly cookie, and redirect to the app.
 */
import { NextRequest, NextResponse } from "next/server";
import { exchangeToken } from "@/lib/kite-client";

export async function GET(req: NextRequest) {
    const host = req.headers.get("host");
    const origin = req.nextUrl.origin;
    const searchParams = req.nextUrl.searchParams;
    const requestToken = searchParams.get("request_token");
    const status = searchParams.get("status");

    console.log(`[AuthCallback] DEBUG INFO:`);
    console.log(` - URL: ${req.url}`);
    console.log(` - Host Header: ${host}`);
    console.log(` - Detected Origin: ${origin}`);
    console.log(` - Process Env URL: ${process.env.NEXT_PUBLIC_APP_URL}`);
    console.log(` - Status: ${status}, Token: ${requestToken?.substring(0, 5)}...`);

    // ─── Error Cases ─────────────────────────────────────────
    if (status !== "success" || !requestToken) {
        return NextResponse.redirect(`${origin}/terminal?auth_error=login_failed`);
    }

    const apiKey = process.env.KITE_API_KEY;
    const apiSecret = process.env.KITE_API_SECRET;

    if (!apiKey || !apiSecret) {
        return NextResponse.redirect(`${origin}/terminal?auth_error=missing_config`);
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
        // Redirect back to the same origin (terminal)
        const response = NextResponse.redirect(`${origin}/terminal?auth_success=1`);

        const cookieOptions = {
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax" as const,
            maxAge: 60 * 60 * 8, // 8 hours (Kite tokens expire at 6 AM)
            path: "/",
            // If on a custom domain, we might want to set domain to .zengtrade.in 
            // but for now, allowing standard path behavior is safer for localhost compatibility.
        };

        // httpOnly cookie for server-side API calls (secure)
        response.cookies.set("kite_access_token", data.access_token, {
            ...cookieOptions,
            httpOnly: true,
        });

        // Non-httpOnly cookie for client-side auth state (readable by JS)
        response.cookies.set("kite_auth_payload", authPayload, {
            ...cookieOptions,
            httpOnly: false,
        });

        return response;
    } catch (error: any) {
        console.error("Kite token exchange failed:", error);
        return NextResponse.redirect(
            `${origin}/terminal?auth_error=${encodeURIComponent(error.message || "token_exchange_failed")}`
        );
    }
}
