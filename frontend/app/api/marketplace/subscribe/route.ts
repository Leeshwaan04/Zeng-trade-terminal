import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { cookies } from "next/headers";

function getRedis(): Redis | null {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
    try {
        return Redis.fromEnv();
    } catch {
        return null;
    }
}

function getUserId(): string | null {
    try {
        const cookieStore = cookies();
        const raw = cookieStore.get("kite_auth_payload")?.value;
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed.user_id || null;
    } catch {
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const userId = getUserId();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { strategyId } = body;
        if (!strategyId) return NextResponse.json({ error: "Missing strategyId" }, { status: 400 });

        const redis = getRedis();
        if (redis) {
            await redis.sadd(`marketplace:subscriptions:${userId}`, strategyId);
            await redis.hincrby("marketplace:subscriber_counts", strategyId, 1);
        }

        return NextResponse.json({ status: "ok", subscribed: true });
    } catch (err) {
        console.error("[marketplace/subscribe] POST error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const userId = getUserId();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const strategyId = req.nextUrl.searchParams.get("strategyId");
        if (!strategyId) return NextResponse.json({ error: "Missing strategyId" }, { status: 400 });

        const redis = getRedis();
        if (redis) {
            await redis.srem(`marketplace:subscriptions:${userId}`, strategyId);
            await redis.hincrby("marketplace:subscriber_counts", strategyId, -1);
        }

        return NextResponse.json({ status: "ok", unsubscribed: true });
    } catch (err) {
        console.error("[marketplace/subscribe] DELETE error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const userId = getUserId();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const redis = getRedis();
        let subscriptions: string[] = [];
        if (redis) {
            subscriptions = await redis.smembers(`marketplace:subscriptions:${userId}`);
        }

        return NextResponse.json({ status: "ok", subscriptions });
    } catch (err) {
        console.error("[marketplace/subscribe] GET error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
