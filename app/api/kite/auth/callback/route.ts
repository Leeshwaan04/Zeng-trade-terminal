import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

const KITE_API_BASE = "https://api.kite.trade";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const requestToken = searchParams.get("request_token");
    const status = searchParams.get("status");
    const apiKey = process.env.KITE_API_KEY;
    const apiSecret = process.env.KITE_API_SECRET;

    if (status !== "success" || !requestToken) {
        const url = new URL("/", req.url);
        if (status) url.searchParams.set("error", "kite_login_failed");
        return NextResponse.redirect(url);
    }

    if (!apiKey || !apiSecret) {
        return NextResponse.json(
            { error: "KITE_API_KEY or KITE_API_SECRET is missing" },
            { status: 500 }
        );
    }

    try {
        // Exchange request_token for access_token
        const checksum = crypto
            .createHash("sha256")
            .update(`${apiKey}${requestToken}${apiSecret}`)
            .digest("hex");

        const response = await fetch(`${KITE_API_BASE}/session/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "X-Kite-Version": "3"
            },
            body: new URLSearchParams({
                api_key: apiKey,
                request_token: requestToken,
                checksum: checksum
            })
        });

        const data = await response.json();

        if (data.status === "success" && data.data) {
            const { access_token, public_token, user_id, user_name, email } = data.data;

            // Set cookies
            const cookieStore = await cookies();
            cookieStore.set("kite_access_token", access_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                path: "/"
            });
            cookieStore.set("active_broker", "KITE", { path: "/" });

            // Redirect to dashboard
            const url = new URL("/", req.url);
            return NextResponse.redirect(url);
        } else {
            const url = new URL("/", req.url);
            url.searchParams.set("error", data.message || "auth_failed");
            return NextResponse.redirect(url);
        }

    } catch (error) {
        console.error("Kite Auth Error:", error);
        return NextResponse.redirect(new URL("/?error=auth_exception", req.url));
    }
}
