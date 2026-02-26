// Angel One Login Route (Placeholder for SmartAPI)
// Typically requires POST with { clientcode, password, totp }
// Since we don't have a UI form for this yet, we just redirect or show error.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
    return NextResponse.json({
        message: "Angel One requires TOPT-based login. Please implement client-side form to POST credentials to /api/angel/auth/login."
    });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { clientCode, password, totp } = body;

        if (!clientCode || !password || !totp) {
            return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
        }

        const apiKey = process.env.ANGEL_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "Angel API Key not configured" }, { status: 500 });
        }

        // 1. Login with Password & TOTP
        // Endpoint: https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword
        const loginRes = await fetch("https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "X-UserType": "USER",
                "X-SourceID": "WEB",
                "X-ClientLocalIP": "127.0.0.1", // Needed?
                "X-ClientPublicIP": "127.0.0.1",
                "X-MACAddress": "mac_address",
                "X-PrivateKey": apiKey,
            },
            body: JSON.stringify({
                clientcode: clientCode,
                password: password,
                totp: totp,
            }),
        });

        const data = await loginRes.json();

        if (!data.status || !data.data) {
            console.error("Angel Login Error", data);
            return NextResponse.json({ error: data.message || "Angel Login Failed" }, { status: 401 });
        }

        const { jwtToken, feedToken, refreshToken } = data.data;

        // 2. Set Cookies securely
        const cookieStore = await cookies();

        cookieStore.set("angel_jwt_token", jwtToken, {
            httpOnly: true, // Secure logic, feed needs it? Usually API needs it.
            secure: process.env.NODE_ENV === "production",
            maxAge: 86400,
            path: "/"
        });

        cookieStore.set("angel_feed_token", feedToken, {
            httpOnly: false, // SmartAPI WebSocket might need this? Or we proxy.
            secure: process.env.NODE_ENV === "production",
            maxAge: 86400,
            path: "/"
        });

        cookieStore.set("angel_client_code", clientCode, {
            httpOnly: false,
            secure: process.env.NODE_ENV === "production",
            maxAge: 86400,
            path: "/"
        });

        return NextResponse.json({ success: true, message: "Logged in to Angel One" });

    } catch (error) {
        console.error("Angel Auth Exception", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
