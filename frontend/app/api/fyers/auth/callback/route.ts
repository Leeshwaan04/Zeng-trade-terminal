import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("auth_code"); // Fyers uses 'auth_code' parameter? Or 'code'?

    // Fyers V3 Validation
    if (!code) {
        // Check for 'code' as fallback
        const standardCode = searchParams.get("code");
        if (!standardCode) {
            return NextResponse.json({ error: "No auth code returned" }, { status: 400 });
        }
    }

    const authCode = code || searchParams.get("code");

    const cookieStore = await cookies();
    const tempCreds = cookieStore.get("zeng_temp_creds")?.value;

    let appId = process.env.FYERS_APP_ID || "";
    let secretId = process.env.FYERS_SECRET_ID || "";

    if (tempCreds) {
        try {
            const parsed = JSON.parse(tempCreds);
            if (parsed.broker === "FYERS") {
                appId = parsed.apiKey;
                secretId = parsed.apiSecret;
            }
        } catch (e) {
            console.error("[FyersCallback] Failed to parse temp credentials:", e);
        }
    }

    if (!appId || !secretId) {
        console.error("[FyersCallback] Missing FYERS configuration");
        return NextResponse.redirect(new URL("/terminal?auth_error=missing_config", request.url));
    }

    try {
        const appIdHash = crypto.createHash('sha256').update(`${appId}:${secretId}`).digest('hex');

        const res = await fetch("https://api-v3.fyers.in/api/v3/validate-authcode", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                grant_type: "authorization_code",
                appIdHash: appIdHash,
                code: authCode,
            }),
        });

        // Wait, Fyers V3 hashing: sha256(client_id + ":" + secret_key)
        // I need 'crypto' module.

        const data = await res.json();

        if (data.s !== "ok") { // Fyers response format often uses { s: 'ok', ... }
            throw new Error(data.message || "Fyers Auth Failed");
        }

        const cookieStore = await cookies();
        cookieStore.set("fyers_access_token", data.access_token, {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            maxAge: 86400,
            path: "/"
        });

        return NextResponse.redirect(new URL("/terminal?auth_success=1", request.url));

    } catch (error) {
        return NextResponse.json({ error: "Fyers Auth Failed", details: String(error) }, { status: 500 });
    }
}
