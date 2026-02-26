import { Root } from "protobufjs";
import { UPSTOX_PROTO_JSON } from "./upstox-feed-schema";

let root: Root | null = null;
let FeedResponse: any = null;

export function initProtobuf() {
    if (root) return;
    try {
        root = Root.fromJSON(UPSTOX_PROTO_JSON);
        FeedResponse = root.lookupType("com.upstox.marketdatafeeder.rpc.proto.FeedResponse");
    } catch (error) {
        console.error("Failed to initialize Upstox Protobuf Root:", error);
    }
}

export interface DecodedFeed {
    feeds: Record<string, {
        ltpc?: { ltp: number; ltt: number; lt: number; cp: number; vol?: number };
        ff?: {
            ltpc?: { ltp: number; ltt: number; lt: number; cp: number; vol?: number };
            marketOHLC?: {
                ohlc: { open: number; high: number; low: number; close: number; ts: number; vol?: number };
                averagePrice?: number;
                yearHigh?: number;
                yearLow?: number;
            };
            marketDepth?: {
                bids: { quantity: number; price: number; orders: number }[];
                asks: { quantity: number; price: number; orders: number }[];
            };
        };
    }>;
}

export function decodeUpstoxFeed(buffer: ArrayBuffer): DecodedFeed | null {
    if (!root) initProtobuf();
    if (!FeedResponse) return null;

    try {
        const uint8Array = new Uint8Array(buffer);
        const message = FeedResponse.decode(uint8Array);
        return FeedResponse.toObject(message, {
            longs: Number,
            enums: String,
            bytes: String,
            defaults: true,
            arrays: true,
        });
    } catch (error) {
        console.error("Upstox Protobuf Decode Error:", error);
        return null;
    }
}
