/**
 * Kite Binary Packet Parser — relay server copy
 * Ported from lib/kite-ws-parser.ts (same logic, no Next.js dependency)
 */

export interface ParsedTick {
    instrument_token: number;
    last_price: number;
    last_quantity?: number;
    average_price?: number;
    volume?: number;
    buy_quantity?: number;
    sell_quantity?: number;
    ohlc?: { open: number; high: number; low: number; close: number };
    change?: number;
    oi?: number;
    oi_day_high?: number;
    oi_day_low?: number;
    timestamp?: number;
    last_trade_time?: number;
    depth?: {
        buy: Array<{ price: number; quantity: number; orders: number }>;
        sell: Array<{ price: number; quantity: number; orders: number }>;
    };
    mode?: "ltp" | "quote" | "full";
}

function safe(buffer: DataView, pos: number, bytes: number): boolean {
    return pos >= 0 && pos + bytes <= buffer.byteLength;
}

function parseSinglePacket(buffer: DataView, offset: number, size: number): ParsedTick | null {
    if (!safe(buffer, offset, 8)) return null;

    // Unsigned — some BSE/MCX tokens exceed 2^31
    const instrumentToken = buffer.getUint32(offset);
    const priceDivisor = 100;
    const segment = instrumentToken & 0xff;
    const isIndex = segment === 0;

    const tick: ParsedTick = {
        instrument_token: instrumentToken,
        last_price: buffer.getInt32(offset + 4) / priceDivisor,
    };

    if (size === 8) {
        tick.mode = "ltp";
        return tick;
    }

    if (size >= 28 && safe(buffer, offset, 44)) {
        tick.last_quantity = buffer.getInt32(offset + 8);
        tick.average_price = buffer.getInt32(offset + 12) / priceDivisor;
        tick.volume = buffer.getInt32(offset + 16);
        tick.buy_quantity = buffer.getInt32(offset + 20);
        tick.sell_quantity = buffer.getInt32(offset + 24);
        tick.ohlc = {
            open:  buffer.getInt32(offset + 28) / priceDivisor,
            high:  buffer.getInt32(offset + 32) / priceDivisor,
            low:   buffer.getInt32(offset + 36) / priceDivisor,
            close: buffer.getInt32(offset + 40) / priceDivisor,
        };
        tick.mode = "quote";
    }

    if (!isIndex && size >= 44 && safe(buffer, offset + 44, 4)) {
        tick.change = buffer.getInt32(offset + 44) / priceDivisor;
    }

    if (size >= 184 && safe(buffer, offset, 184)) {
        tick.mode = "full";
        tick.last_trade_time = buffer.getInt32(offset + 48);
        tick.oi = buffer.getInt32(offset + 52);
        tick.oi_day_high = buffer.getInt32(offset + 56);
        tick.oi_day_low = buffer.getInt32(offset + 60);
        tick.timestamp = buffer.getInt32(offset + 64);

        const depthOffset = offset + 68;
        tick.depth = { buy: [], sell: [] };

        for (let i = 0; i < 5; i++) {
            const o = depthOffset + i * 12;
            if (!safe(buffer, o, 10)) break;
            tick.depth.buy.push({
                quantity: buffer.getInt32(o),
                price:    buffer.getInt32(o + 4) / priceDivisor,
                orders:   buffer.getInt16(o + 8),
            });
        }
        for (let i = 0; i < 5; i++) {
            const o = depthOffset + 60 + i * 12;
            if (!safe(buffer, o, 10)) break;
            tick.depth.sell.push({
                quantity: buffer.getInt32(o),
                price:    buffer.getInt32(o + 4) / priceDivisor,
                orders:   buffer.getInt16(o + 8),
            });
        }
    }

    return tick;
}

export function parseBinaryMessage(data: Buffer | ArrayBuffer): ParsedTick[] {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
    if (buf.byteLength <= 1) return [];

    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    if (!safe(view, 0, 2)) return [];

    const numPackets = view.getInt16(0);
    if (numPackets <= 0 || numPackets > 500) return [];

    const ticks: ParsedTick[] = [];
    let offset = 2;

    for (let i = 0; i < numPackets; i++) {
        if (!safe(view, offset, 2)) break;
        const packetSize = view.getInt16(offset);
        offset += 2;
        if (packetSize > 0 && safe(view, offset, packetSize)) {
            const tick = parseSinglePacket(view, offset, packetSize);
            if (tick) ticks.push(tick);
        }
        offset += packetSize;
    }

    return ticks;
}
