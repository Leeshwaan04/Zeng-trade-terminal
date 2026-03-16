/**
 * GET /api/auth/callback?request_token=xxx&status=success
 *
 * Kite redirects here after login. We exchange the request_token for
 * an access_token, set a secure httpOnly cookie, and redirect to the app.
 */
import { NextRequest, NextResponse } from "next/server";
import { exchangeToken } from "@/lib/kite-client";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
    const host = req.headers.get("host");
    const origin = req.nextUrl.origin;
    const searchParams = req.nextUrl.searchParams;
    const requestToken = searchParams.get("request_token");
    const status = searchParams.get("status");
    const stateParam = searchParams.get("state");

    const cookieStore = await cookies();
    const storedState = cookieStore.get("kite_oauth_state")?.value;
    const tempCreds = cookieStore.get("zeng_temp_creds")?.value;

    let apiKey = process.env.KITE_API_KEY;
    let apiSecret = process.env.KITE_API_SECRET;

    if (tempCreds) {
        try {
            const parsed = JSON.parse(tempCreds);
            if (parsed.broker === "KITE") {
                apiKey = parsed.apiKey;
                apiSecret = parsed.apiSecret;
            }
        } catch (e) {
            console.error("[AuthCallback] Failed to parse temp credentials:", e);
        }
    }

    const appOrigin = process.env.NEXTAUTH_URL || req.nextUrl.origin;

    if (!apiKey || !apiSecret) {
        console.error("[AuthCallback] Missing KITE API configuration (Env or Temp Cookie)");
        return NextResponse.redirect(new URL(`/terminal?auth_error=missing_config`, appOrigin));
    }

    try {
        // ─── Token Exchange ──────────────────────────────────
        const result = await exchangeToken(apiKey as string, apiSecret as string, requestToken as string);
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
        const response = NextResponse.redirect(new URL(`/terminal?auth_success=1`, appOrigin));

        const isProduction = process.env.NODE_ENV === "production";
        const cookieOptions = {
            secure: isProduction,
            sameSite: "lax" as const,
            maxAge: 60 * 60 * 8, // 8 hours (Kite tokens expire at 6 AM)
            path: "/",
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
            new URL(`/terminal?auth_error=${encodeURIComponent(error.message || "token_exchange_failed")}`, appOrigin)
        );
    }
}
