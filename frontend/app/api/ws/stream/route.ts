/**
 * GET /api/ws/stream?tokens=256265,260105&mode=full
 *
 * Server-Sent Events endpoint: connects server-side to Kite Connect
 * WebSocket, parses binary packets, and streams JSON ticks to the browser.
 *
 * FALLBACK: If WebSocket disconnects or no data for 10s,
 * auto-switches to REST quote polling every 2s.
 * When WebSocket reconnects, REST stops.
 */
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { parseBinaryMessage } from "@/lib/kite-ws-parser";
import WebSocket from "ws";

const KITE_WS_BASE = "wss://ws.kite.trade";
const KITE_API_BASE = "https://api.kite.trade";
const GROWW_WS_BASE = "wss://api.groww.in/v1/market/feed";
import { MARKET_INSTRUMENTS } from "@/lib/market-config";

// Vercel Pro: extend serverless function timeout to 5 minutes for SSE streaming
export const maxDuration = 300;

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get("kite_access_token")?.value;
    const growwAccessToken = cookieStore.get("groww_access_token")?.value;
    const apiKey = process.env.KITE_API_KEY;

    const broker = req.nextUrl.searchParams.get("broker")?.toUpperCase() || "KITE";

    console.log(`[Stream] Request received for broker: ${broker}`);
    console.log(`[Stream] Kite Token: ${accessToken?.substring(0, 4)}***`);
    console.log(`[Stream] Groww Token: ${growwAccessToken?.substring(0, 4)}***`);

    const tokensParam = req.nextUrl.searchParams.get("tokens");
    const mode = req.nextUrl.searchParams.get("mode") || "quote";
    const isMock = req.nextUrl.searchParams.get("mock") === "true";

    const isConfigured = broker === "GROWW" ? !!growwAccessToken : (accessToken && apiKey);

    if (!tokensParam) {
        return new Response(
            "Missing tokens parameter. Format: 256265,260105",
            { status: 400 }
        );
    }

    const instrumentTokens = tokensParam
        .split(",")
        .map((t) => parseInt(t.trim(), 10))
        .filter((t) => !isNaN(t));

    if (instrumentTokens.length === 0) {
        return new Response("Invalid tokens format", { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        start(controller) {
            let ws: WebSocket | null = null;
            let restInterval: ReturnType<typeof setInterval> | null = null;
            let heartbeatInterval: ReturnType<typeof setInterval>;
            let watchdogInterval: ReturnType<typeof setInterval> | null = null;
            let lastTickTime = Date.now();
            let isClosed = false;
            let isWsConnected = false;

            const send = (event: string, data: any) => {
                if (isClosed) return;
                try {
                    controller.enqueue(
                        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
                    );
                } catch {
                    isClosed = true;
                }
            };

            // ─── REST Fallback Polling ───────────────────────────
            const startRestFallback = () => {
                if (restInterval || !isConfigured || isClosed) return;
                send("status", { source: "rest", connected: true, fallback: true });

                restInterval = setInterval(async () => {
                    if (isClosed || isWsConnected) {
                        stopRestFallback();
                        return;
                    }
                    try {
                        // Use Kite's quote API as fallback
                        const params = instrumentTokens
                            .map((t) => `i=${t}`)
                            .join("&");

                        const res = await fetch(
                            `${KITE_API_BASE}/quote?${params}`,
                            {
                                headers: {
                                    "X-Kite-Version": "3",
                                    Authorization: `token ${apiKey}:${accessToken}`,
                                },
                            }
                        );
                        const json = await res.json();

                        if (json.status === "success" && json.data) {
                            const ticks = Object.values(json.data).map(
                                (q: any) => ({
                                    instrument_token: q.instrument_token,
                                    last_price: q.last_price,
                                    last_quantity: q.last_quantity || 0,
                                    average_price: q.average_price || 0,
                                    volume: q.volume || 0,
                                    buy_quantity: q.buy_quantity || 0,
                                    sell_quantity: q.sell_quantity || 0,
                                    ohlc: q.ohlc || {
                                        open: 0,
                                        high: 0,
                                        low: 0,
                                        close: 0,
                                    },
                                    oi: q.oi || 0,
                                    change: q.net_change || 0,
                                    depth: q.depth || { buy: [], sell: [] },
                                    mode: "quote",
                                })
                            );
                            if (ticks.length > 0) {
                                send("tick", ticks);
                                lastTickTime = Date.now();
                            }
                        }
                    } catch {
                        /* retry next interval */
                    }
                }, 2000);
            };

            const stopRestFallback = () => {
                if (restInterval) {
                    clearInterval(restInterval);
                    restInterval = null;
                }
            };

            // ─── Groww WebSocket Connection ─────────────────────
            const connectGrowwWs = () => {
                if (!growwAccessToken || isClosed) return;

                const wsUrl = `${GROWW_WS_BASE}`;
                try {
                    ws = new WebSocket(wsUrl, {
                        headers: { "Authorization": `Bearer ${growwAccessToken}` }
                    });

                    ws.on('open', () => {
                        console.log("[Stream] Groww WS Connected");
                        isWsConnected = true;
                        send("status", { source: "ws", connected: true, broker: "GROWW" });

                        // Map internal tokens to Groww tokens
                        const growwTokens = instrumentTokens.map(t => {
                            const inst = MARKET_INSTRUMENTS.find(i => i.token === t);
                            return inst?.groww_token;
                        }).filter(Boolean);

                        ws?.send(JSON.stringify({
                            action: "subscribe",
                            mode: mode === "full" ? "quote" : "ltp",
                            instruments: growwTokens
                        }));
                    });

                    ws.on('message', (data: string) => {
                        lastTickTime = Date.now();
                        try {
                            const tick = JSON.parse(data);
                            // Normalize Groww tick to TickerData
                            const internalInst = MARKET_INSTRUMENTS.find(i => i.groww_token === tick.instrument_token);
                            if (internalInst) {
                                const normalized = [{
                                    instrument_token: internalInst.token,
                                    last_price: tick.last_price,
                                    net_change: tick.net_change || 0,
                                    change_percent: tick.change_percent || 0,
                                    ohlc: tick.ohlc || { open: 0, high: 0, low: 0, close: 0 },
                                    depth: tick.depth || { buy: [], sell: [] },
                                    volume: tick.volume || 0,
                                    mode: mode
                                }];
                                send("tick", normalized);
                            }
                        } catch (e) {
                            console.error("[GrowwWS] Parse error:", e);
                        }
                    });

                    ws.on('close', () => {
                        isWsConnected = false;
                        if (!isClosed) setTimeout(connectGrowwWs, 5000);
                    });
                } catch (e) {
                    console.error("[GrowwWS] Error:", e);
                }
            };
            const startMockStream = () => {
                console.log("[Stream] Initiating Local Mock Stream (No Broker).");
                send("status", { source: "mock", connected: true, broker: "MOCK" });

                // Generate a fake stream emitting every second
                const mockInterval = setInterval(() => {
                    if (isClosed) return;
                    const ticks = instrumentTokens.map(t => {
                        const inst = MARKET_INSTRUMENTS.find(i => i.token === t);
                        const basePrice = inst && inst.symbol.includes("NIFTY") ? (inst.symbol === "NIFTY 50" ? 25000 : 60000) : 1000;
                        const change = (Math.random() - 0.5) * 5;
                        return {
                            instrument_token: t,
                            last_price: basePrice + change,
                            net_change: change,
                            change_percent: change / basePrice * 100,
                            ohlc: { open: basePrice, high: basePrice + 10, low: basePrice - 10, close: basePrice },
                            depth: { buy: [], sell: [] },
                            volume: Math.floor(Math.random() * 500000),
                            oi: Math.floor(Math.random() * 800000),
                            mode: mode
                        };
                    });
                    send("tick", ticks);
                    lastTickTime = Date.now();
                }, 1000);

                req.signal.addEventListener("abort", () => {
                    clearInterval(mockInterval);
                });
            };

            const connectWs = () => {
                if (!isConfigured || isClosed) {
                    send("status", {
                        source: "demo",
                        connected: false,
                        message: "Not authenticated — please log in via Kite",
                    });
                    return;
                }

                const wsUrl = `${KITE_WS_BASE}/?api_key=${apiKey}&access_token=${accessToken}`;
                console.log(`[Stream] Connecting to ${KITE_WS_BASE}...`);

                try {
                    // Use 'ws' library
                    ws = new WebSocket(wsUrl);

                    ws.on('open', () => {
                        console.log("[Stream] Kite WS Connected");
                        isWsConnected = true;
                        lastTickTime = Date.now();
                        send("status", { source: "ws", connected: true });
                        stopRestFallback();

                        // Subscribe to instruments
                        const msg = JSON.stringify({
                            a: "subscribe",
                            v: instrumentTokens,
                        });
                        ws?.send(msg);

                        // Set mode
                        const modeMsg = JSON.stringify({
                            a: "mode",
                            v: [mode, instrumentTokens],
                        });
                        ws?.send(modeMsg);
                    });

                    ws.on('message', (data: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
                        lastTickTime = Date.now();

                        // Handle Binary Tick Data
                        if (Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
                            // Convert Buffer to ArrayBuffer if needed
                            const arrayBuffer = Buffer.isBuffer(data)
                                ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
                                : data as ArrayBuffer;

                            if (arrayBuffer.byteLength === 1) {
                                // Heartbeat
                                return;
                            }

                            try {
                                const ticks = parseBinaryMessage(arrayBuffer);
                                if (ticks.length > 0) {
                                    console.log(`[Stream] Sending ${ticks.length} ticks.`);
                                    send("tick", ticks);
                                }
                            } catch (e) {
                                console.error("[KiteWS] Binary parse error:", e);
                            }
                            return;
                        }

                        // Handle Text Data (Orders)
                        if (!isBinary) {
                            try {
                                const text = data.toString();
                                const msg = JSON.parse(text);
                                if (msg.type === "order") {
                                    send("order", msg.data);
                                }
                            } catch { }
                        }
                    });

                    ws.on('error', (err: Error) => {
                        console.error("[Stream] WS Error:", err);
                        isWsConnected = false;
                        send("status", {
                            source: "ws",
                            connected: false,
                            error: true,
                        });
                    });

                    ws.on('close', (code: number, reason: Buffer) => {
                        console.log(`[Stream] WS Closed: ${code}`);
                        isWsConnected = false;
                        send("status", {
                            source: "ws",
                            connected: false,
                            code: code,
                        });

                        if (!isClosed) {
                            startRestFallback();
                            // Reconnect after 5s
                            setTimeout(() => {
                                if (!isClosed) connectWs();
                            }, 5000);
                        }
                    });

                } catch (e) {
                    console.error("[Stream] Exception:", e);
                    send("status", {
                        source: "ws",
                        connected: false,
                        error: String(e),
                    });
                    startRestFallback();
                }
            };

            // ─── Watchdog: detect stale WS ──────────────────────
            watchdogInterval = setInterval(() => {
                if (isClosed) return;
                if (
                    Date.now() - lastTickTime > 10000 &&
                    isWsConnected &&
                    !restInterval
                ) {
                    send("status", {
                        source: "ws",
                        stale: true,
                        fallback: true,
                    });
                    startRestFallback();
                }
            }, 5000);

            // ─── SSE Heartbeat ──────────────────────────────────
            heartbeatInterval = setInterval(() => {
                send("heartbeat", { t: Date.now() });
            }, 5000);

            // ─── Start ──────────────────────────────────────────
            if (isMock || !isConfigured) {
                startMockStream();
            } else if (broker === "GROWW") {
                connectGrowwWs();
            } else {
                connectWs();
            }

            // ─── Cleanup ────────────────────────────────────────
            req.signal.addEventListener("abort", () => {
                isClosed = true;
                stopRestFallback();
                if (heartbeatInterval) clearInterval(heartbeatInterval);
                if (watchdogInterval) clearInterval(watchdogInterval);
                if (ws && ws.readyState === WebSocket.OPEN) {
                    try {
                        ws.send(
                            JSON.stringify({
                                a: "unsubscribe",
                                v: instrumentTokens,
                            })
                        );
                    } catch { }
                    ws.close(1000);
                }
            });
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        },
    });
}
