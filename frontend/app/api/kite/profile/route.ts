import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getProfile } from "@/lib/kite-client";

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("kite_access_token")?.value;
    const apiKey = process.env.KITE_API_KEY;

    if (!accessToken || !apiKey) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        const profile = await getProfile(apiKey, accessToken);
        return NextResponse.json({ status: "success", data: profile });
    } catch (err: any) {
        console.error("[Profile] GET failed:", err.message);
        return NextResponse.json({ error: err.message }, { status: err.httpStatus ?? 500 });
    }
}
