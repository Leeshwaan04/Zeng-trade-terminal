import { NextResponse } from "next/server";
import { buildLoginUrl } from "@/lib/upstox-client";

export async function GET() {
    try {
        const loginUrl = buildLoginUrl();
        return NextResponse.redirect(loginUrl);
    } catch (error) {
        return NextResponse.json(
            { error: "Failed to generate Upstox login URL" },
            { status: 500 }
        );
    }
}
