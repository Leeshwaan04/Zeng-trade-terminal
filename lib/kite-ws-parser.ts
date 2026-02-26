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

/**
 * Parse a single binary packet from the Kite WebSocket.
 */
function parseSinglePacket(buffer: DataView, offset: number, size: number): ParsedTick {
    const instrumentToken = buffer.getInt32(offset);
    const divisor = 100; // Prices are in paisa (×100)

    // Segment detection (for indices, divisor is different)
    const segment = instrumentToken & 0xff;
    const isIndex = segment === 0; // NSE Indices

    const priceDivisor = isIndex ? 100 : 100;

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
    if (size >= 28) {
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
    if (!isIndex && size >= 44) {
        tick.change = buffer.getInt32(offset + 44) / priceDivisor;
    }

    // Full mode — includes market depth
    if (size >= 184) {
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
            tick.depth.buy.push({
                quantity: buffer.getInt32(buyOffset),
                price: buffer.getInt32(buyOffset + 4) / priceDivisor,
                orders: buffer.getInt16(buyOffset + 8),
            });
        }

        for (let i = 0; i < 5; i++) {
            const sellOffset = depthOffset + 60 + i * 12;
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
    const buffer = new DataView(data);
    const ticks: ParsedTick[] = [];

    // Heartbeat — 1 byte message
    if (data.byteLength === 1) {
        return [];
    }

    // Number of packets (first 2 bytes)
    const numberOfPackets = buffer.getInt16(0);
    let offset = 2;

    for (let i = 0; i < numberOfPackets; i++) {
        // Packet size (2 bytes)
        const packetSize = buffer.getInt16(offset);
        offset += 2;

        if (packetSize > 0 && offset + packetSize <= data.byteLength) {
            const tick = parseSinglePacket(buffer, offset, packetSize);
            ticks.push(tick);
        }

        offset += packetSize;
    }

    return ticks;
}
