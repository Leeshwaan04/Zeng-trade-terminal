/**
 * DELETE /api/auth/logout
 *
 * Invalidates the Kite session and clears cookies.
 */
import { NextRequest, NextResponse } from "next/server";
import { invalidateSession } from "@/lib/kite-client";

export async function DELETE(req: NextRequest) {
    const accessToken = req.cookies.get("kite_access_token")?.value;
    const apiKey = process.env.KITE_API_KEY;

    // Best-effort Kite logout
    if (apiKey && accessToken) {
        await invalidateSession(apiKey, accessToken);
    }

    // Clear cookies
    const response = NextResponse.json({ status: "ok" });
    response.cookies.delete("kite_access_token");
    response.cookies.delete("kite_auth_payload");
    return response;
}
