/**
 * Kite WebSocket Binary Packet Parser
 *
 * The Kite Connect WebSocket streams market data as binary packets.
 * This parser decodes those packets into structured TickerData objects.
 *
 * Packet Structure:
 * - Header: 2 bytes (number of packets)
 * - Each packet starts with 2 bytes (packet size)
 * - LTP mode: 8 bytes (token: 4 + ltp: 4)
 * - Quote mode: 44 bytes (token + ohlc + volume + etc)
 * - Full mode: 184 bytes (quote + depth data)
 */

export interface ParsedTick {
    instrument_token: number;
    last_price: number;
    last_quantity?: number;
    average_price?: number;
    volume?: number;
    buy_quantity?: number;
    sell_quantity?: number;
    ohlc?: {
        open: number;
        high: number;
        low: number;
        close: number;
    };
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

/** Inline bounds guard — returns true if [pos, pos+bytes) is within the DataView */
function safe(buffer: DataView, pos: number, bytes: number): boolean {
    return pos >= 0 && pos + bytes <= buffer.byteLength;
}

/**
 * Parse a single binary packet from the Kite WebSocket.
 * Returns null if the buffer is too short for any mandatory field.
 */
function parseSinglePacket(buffer: DataView, offset: number, size: number): ParsedTick | null {
    // Minimum packet is 8 bytes (token + ltp)
    if (!safe(buffer, offset, 8)) return null;

    // Kite instrument tokens are unsigned 32-bit big-endian.
    // getInt32 would sign-extend tokens above 2^31 (certain BSE/MCX tokens)
    // causing negative values and silently routing ticks to the wrong instrument.
    const instrumentToken = buffer.getUint32(offset);

    // Segment detection (for indices, divisor is different)
    const segment = instrumentToken & 0xff;
    const isIndex = segment === 0; // NSE Indices

    const priceDivisor = 100; // Prices are in paisa (×100)

    const tick: ParsedTick = {
        instrument_token: instrumentToken,
        last_price: buffer.getInt32(offset + 4) / priceDivisor,
    };

    // LTP mode (8 bytes per packet)
    if (size === 8) {
        tick.mode = "ltp";
        return tick;
    }

    // Quote mode (44 bytes for non-index, 28 bytes for index)
    if (size >= 28 && safe(buffer, offset, 44)) {
        tick.last_quantity = buffer.getInt32(offset + 8);
        tick.average_price = buffer.getInt32(offset + 12) / priceDivisor;
        tick.volume = buffer.getInt32(offset + 16);
        tick.buy_quantity = buffer.getInt32(offset + 20);
        tick.sell_quantity = buffer.getInt32(offset + 24);

        tick.ohlc = {
            open: buffer.getInt32(offset + 28) / priceDivisor,
            high: buffer.getInt32(offset + 32) / priceDivisor,
            low: buffer.getInt32(offset + 36) / priceDivisor,
            close: buffer.getInt32(offset + 40) / priceDivisor,
        };

        tick.mode = "quote";
    }

    // Additional fields for non-index instruments
    if (!isIndex && size >= 44 && safe(buffer, offset + 44, 4)) {
        tick.change = buffer.getInt32(offset + 44) / priceDivisor;
    }

    // Full mode — includes market depth (184 bytes total)
    if (size >= 184 && safe(buffer, offset, 184)) {
        tick.mode = "full";

        // Exchange timestamp
        tick.last_trade_time = buffer.getInt32(offset + 48);
        tick.oi = buffer.getInt32(offset + 52);
        tick.oi_day_high = buffer.getInt32(offset + 56);
        tick.oi_day_low = buffer.getInt32(offset + 60);
        tick.timestamp = buffer.getInt32(offset + 64);

        // Market depth — 5 levels of buy + 5 levels of sell
        const depthOffset = offset + 68;
        tick.depth = { buy: [], sell: [] };

        for (let i = 0; i < 5; i++) {
            const buyOffset = depthOffset + i * 12;
            if (!safe(buffer, buyOffset, 10)) break;
            tick.depth.buy.push({
                quantity: buffer.getInt32(buyOffset),
                price: buffer.getInt32(buyOffset + 4) / priceDivisor,
                orders: buffer.getInt16(buyOffset + 8),
            });
        }

        for (let i = 0; i < 5; i++) {
            const sellOffset = depthOffset + 60 + i * 12;
            if (!safe(buffer, sellOffset, 10)) break;
            tick.depth.sell.push({
                quantity: buffer.getInt32(sellOffset),
                price: buffer.getInt32(sellOffset + 4) / priceDivisor,
                orders: buffer.getInt16(sellOffset + 8),
            });
        }
    }

    return tick;
}

/**
 * Parse an entire binary message from the Kite WebSocket.
 * Returns an array of parsed ticks.
 */
export function parseBinaryMessage(data: ArrayBuffer): ParsedTick[] {
    // Heartbeat — 1 byte message
    if (data.byteLength <= 1) return [];

    const buffer = new DataView(data);
    const ticks: ParsedTick[] = [];

    // Need at least 2 bytes for the packet count header
    if (!safe(buffer, 0, 2)) return [];

    const numberOfPackets = buffer.getInt16(0);
    // Sanity check — Kite never sends > 500 packets in one message
    if (numberOfPackets <= 0 || numberOfPackets > 500) return [];

    let offset = 2;

    for (let i = 0; i < numberOfPackets; i++) {
        // Need 2 bytes for packet size field
        if (!safe(buffer, offset, 2)) break;
        const packetSize = buffer.getInt16(offset);
        offset += 2;

        if (packetSize > 0 && safe(buffer, offset, packetSize)) {
            const tick = parseSinglePacket(buffer, offset, packetSize);
            if (tick) ticks.push(tick);
        }

        offset += packetSize;
    }

    return ticks;
}
