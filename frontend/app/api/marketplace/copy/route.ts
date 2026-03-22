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

interface CopyTrader {
    traderId: string;
    traderName: string;
    followedAt: string;
    allocationPercent: number;
    isActive: boolean;
}

export async function GET(req: NextRequest) {
    try {
        const userId = getUserId();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const redis = getRedis();
        if (!redis) return NextResponse.json({ status: "ok", following: [] });

        const raw = await redis.hgetall(`copy:following:${userId}`);
        const following: CopyTrader[] = raw
            ? Object.values(raw).map(v => (typeof v === "string" ? JSON.parse(v) : v as CopyTrader))
            : [];

        return NextResponse.json({ status: "ok", following });
    } catch (err) {
        console.error("[marketplace/copy] GET error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const userId = getUserId();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { traderId, traderName, allocationPercent } = body;
        if (!traderId || !traderName) return NextResponse.json({ error: "Missing traderId or traderName" }, { status: 400 });

        const allocation = Math.min(100, Math.max(1, Number(allocationPercent) || 10));
        const entry: CopyTrader = {
            traderId,
            traderName,
            followedAt: new Date().toISOString(),
            allocationPercent: allocation,
            isActive: true,
        };

        const redis = getRedis();
        if (redis) {
            await redis.hset(`copy:following:${userId}`, { [traderId]: JSON.stringify(entry) });
            await redis.hincrby("copy:follower_counts", traderId, 1);
        }

        return NextResponse.json({ status: "ok", following: entry });
    } catch (err) {
        console.error("[marketplace/copy] POST error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const userId = getUserId();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const traderId = req.nextUrl.searchParams.get("traderId");
        if (!traderId) return NextResponse.json({ error: "Missing traderId" }, { status: 400 });

        const redis = getRedis();
        if (redis) {
            await redis.hdel(`copy:following:${userId}`, traderId);
            await redis.hincrby("copy:follower_counts", traderId, -1);
        }

        return NextResponse.json({ status: "ok", unfollowed: true });
    } catch (err) {
        console.error("[marketplace/copy] DELETE error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
