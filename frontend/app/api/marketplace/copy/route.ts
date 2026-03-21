import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { cookies } from "next/headers";

const redis = Redis.fromEnv();

async function getUserId(): Promise<string | null> {
    const cookieStore = await cookies();
    const payload = cookieStore.get("kite_auth_payload")?.value;
    if (!payload) return null;
    try {
        return JSON.parse(payload).user_id || null;
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

// GET — list traders being copied
export async function GET() {
    const userId = await getUserId();
    if (!userId) {
        return NextResponse.json({ status: "error", error: "Not authenticated" }, { status: 401 });
    }

    try {
        const following = await redis.hgetall(`copy:following:${userId}`);
        const traders: CopyTrader[] = following
            ? Object.values(following).map(v => typeof v === 'string' ? JSON.parse(v) : v as CopyTrader)
            : [];
        return NextResponse.json({ status: "success", data: traders });
    } catch (error: any) {
        return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
    }
}

// POST — follow a trader
export async function POST(req: NextRequest) {
    const userId = await getUserId();
    if (!userId) {
        return NextResponse.json({ status: "error", error: "Not authenticated" }, { status: 401 });
    }

    const { traderId, traderName, allocationPercent = 10 } = await req.json();
    if (!traderId || !traderName) {
        return NextResponse.json({ status: "error", error: "traderId and traderName required" }, { status: 400 });
    }

    const entry: CopyTrader = {
        traderId,
        traderName,
        followedAt: new Date().toISOString(),
        allocationPercent: Math.min(100, Math.max(1, allocationPercent)),
        isActive: true,
    };

    try {
        await redis.hset(`copy:following:${userId}`, { [traderId]: JSON.stringify(entry) });
        await redis.hincrby("copy:follower_counts", traderId, 1);
        return NextResponse.json({ status: "success", data: entry });
    } catch (error: any) {
        return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
    }
}

// DELETE — unfollow a trader
export async function DELETE(req: NextRequest) {
    const userId = await getUserId();
    if (!userId) {
        return NextResponse.json({ status: "error", error: "Not authenticated" }, { status: 401 });
    }

    const traderId = req.nextUrl.searchParams.get("traderId");
    if (!traderId) {
        return NextResponse.json({ status: "error", error: "traderId required" }, { status: 400 });
    }

    try {
        await redis.hdel(`copy:following:${userId}`, traderId);
        await redis.hincrby("copy:follower_counts", traderId, -1);
        return NextResponse.json({ status: "success" });
    } catch (error: any) {
        return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
    }
}
