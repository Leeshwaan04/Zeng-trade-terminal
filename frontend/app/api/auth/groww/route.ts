import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { accessToken, user } = body;

        if (!accessToken) {
            return NextResponse.json({ error: "Missing access token" }, { status: 400 });
        }

        const response = NextResponse.json({
            status: "SUCCESS",
            message: "Groww session established"
        });

        // httpOnly cookie for Groww API calls
        response.cookies.set("groww_access_token", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24, // Groww tokens expire daily
            path: "/",
        });

        return response;
    } catch (error) {
        console.error("Groww auth error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE() {
    const response = NextResponse.json({ status: "SUCCESS" });
    response.cookies.delete("groww_access_token");
    return response;
}
