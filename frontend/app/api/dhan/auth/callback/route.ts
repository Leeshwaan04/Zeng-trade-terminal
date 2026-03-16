import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
        return NextResponse.json({ error: "No auth code returned" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const tempCreds = cookieStore.get("zeng_temp_creds")?.value;

    let clientId = process.env.DHAN_CLIENT_ID;
    let clientSecret = process.env.DHAN_CLIENT_SECRET;

    if (tempCreds) {
        try {
            const parsed = JSON.parse(tempCreds);
            if (parsed.broker === "DHAN") {
                clientId = parsed.apiKey;
                clientSecret = parsed.apiSecret;
            }
        } catch (e) {
            console.error("[DhanCallback] Failed to parse temp credentials:", e);
        }
    }

    if (!clientId || !clientSecret) {
        console.error("[DhanCallback] Missing DHAN configuration");
        return NextResponse.redirect(new URL("/terminal?auth_error=missing_config", request.url));
    }

    try {
        // Exchange code for token
        const res = await fetch("https://auth.dhan.co/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: "authorization_code",
                code,
                redirect_uri: process.env.DHAN_REDIRECT_URI || `${new URL(request.url).origin}/api/dhan/auth/callback`,
            }),
        });

        const data = await res.json();

        if (!res.ok) {
            console.error("Dhan Token Exchange Error:", data);
            throw new Error(data.message || "Failed to exchange token with Dhan");
        }

        // Set Cookie securely
        const cookieStore = await cookies();

        // Access Token for Ticker/API
        cookieStore.set("dhan_access_token", data.access_token, {
            httpOnly: false, // Exposed to client for WebSocket (Dhan requires sending access token)
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24, // 1 day
            path: "/",
            sameSite: "lax",
        });

        // Store other details if available (e.g. user ID)
        if (data.userId) {
            cookieStore.set("dhan_user_id", data.userId, {
                httpOnly: false,
                secure: process.env.NODE_ENV === "production",
                maxAge: 60 * 60 * 24,
                path: "/",
            });
        }

        // Redirect to Dashboard
        return NextResponse.redirect(new URL("/terminal?auth_success=1", request.url));

    } catch (error) {
        return NextResponse.json({ error: "Dhan Auth Failed" }, { status: 500 });
    }
}
