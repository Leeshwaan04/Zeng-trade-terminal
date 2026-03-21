import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { cookies } from "next/headers";

const redis = Redis.fromEnv();

async function getUserId(): Promise<string | null> {
    const cookieStore = await cookies();
    const payload = cookieStore.get("kite_auth_payload")?.value;
    if (!payload) return null;
    try {
        const parsed = JSON.parse(payload);
        return parsed.user_id || null;
    } catch {
        return null;
    }
}

// POST — subscribe to a strategy
export async function POST(req: NextRequest) {
    const userId = await getUserId();
    if (!userId) {
        return NextResponse.json({ status: "error", error: "Not authenticated" }, { status: 401 });
    }

    const { strategyId } = await req.json();
    if (!strategyId) {
        return NextResponse.json({ status: "error", error: "strategyId required" }, { status: 400 });
    }

    try {
        await redis.sadd(`marketplace:subscriptions:${userId}`, strategyId);
        // Increment subscriber count
        await redis.hincrby("marketplace:subscriber_counts", strategyId, 1);

        return NextResponse.json({ status: "success", message: "Subscribed successfully" });
    } catch (error: any) {
        console.error("[Marketplace] Subscribe failed:", error);
        return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
    }
}

// DELETE — unsubscribe from a strategy
export async function DELETE(req: NextRequest) {
    const userId = await getUserId();
    if (!userId) {
        return NextResponse.json({ status: "error", error: "Not authenticated" }, { status: 401 });
    }

    const strategyId = req.nextUrl.searchParams.get("strategyId");
    if (!strategyId) {
        return NextResponse.json({ status: "error", error: "strategyId required" }, { status: 400 });
    }

    try {
        await redis.srem(`marketplace:subscriptions:${userId}`, strategyId);
        await redis.hincrby("marketplace:subscriber_counts", strategyId, -1);

        return NextResponse.json({ status: "success", message: "Unsubscribed successfully" });
    } catch (error: any) {
        console.error("[Marketplace] Unsubscribe failed:", error);
        return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
    }
}

// GET — list subscribed strategies for current user
export async function GET() {
    const userId = await getUserId();
    if (!userId) {
        return NextResponse.json({ status: "error", error: "Not authenticated" }, { status: 401 });
    }

    try {
        const subscriptions = await redis.smembers(`marketplace:subscriptions:${userId}`);
        return NextResponse.json({ status: "success", data: subscriptions || [] });
    } catch (error: any) {
        return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
    }
}
