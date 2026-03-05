/**
 * ZenG Trade — Kite WebSocket Proxy Server
 * ==========================================
 * Runs persistently on EC2. Maintains one Kite WebSocket connection
 * per user session and broadcasts ticks to all connected browser clients.
 *
 * Architecture:
 *   Browser WS → EC2 Proxy → Kite WS (1 per access token)
 *
 * Ports:
 *   8080 — WebSocket server (browser connections)
 *   8081 — HTTP REST (health, quotes, instruments)
 *
 * Usage:
 *   node ws-proxy.js
 *   OR via PM2: pm2 start ecosystem.config.js
 */

const WebSocket = require("ws");
const http = require("http");
const https = require("https");
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// ── Config ────────────────────────────────────────────────────
const WS_PORT = process.env.WS_PORT || 8080;
const API_PORT = process.env.API_PORT || 8081;
const KITE_WS_URL = "wss://ws.kite.trade";
const KITE_API_URL = "https://api.kite.trade";
const KITE_API_KEY = process.env.KITE_API_KEY || "";

if (!KITE_API_KEY) {
    console.error("[Proxy] KITE_API_KEY env var is required. Set it in .env or PM2 env.");
    process.exit(1);
}

// ── Session Registry ──────────────────────────────────────────
// Map of accessToken → KiteSession
const sessions = new Map();

class KiteSession {
    constructor(accessToken) {
        this.accessToken = accessToken;
        this.clients = new Set();         // Browser WS clients
        this.kiteWS = null;
        this.subscribedTokens = new Set();
        this.reconnectTimer = null;
        this.lastTickAt = Date.now();
        this.pingTimer = null;
        this.isConnecting = false;
    }

    addClient(ws) {
        this.clients.add(ws);
        console.log(`[Session] Client added. Total clients: ${this.clients.size}`);

        // If Kite WS is alive, re-subscribe with current tokens for this new client
        if (this.kiteWS && this.kiteWS.readyState === WebSocket.OPEN && this.subscribedTokens.size > 0) {
            ws.send(JSON.stringify({ type: "status", data: { connected: true, source: "ec2-proxy" } }));
        }

        // Cleanup on disconnect
        ws.on("close", () => {
            this.clients.delete(ws);
            console.log(`[Session] Client removed. Remaining: ${this.clients.size}`);
            // If no clients, schedule cleanup after 5 min (keep alive briefly)
            if (this.clients.size === 0) {
                setTimeout(() => {
                    if (this.clients.size === 0) {
                        this.disconnect();
                        sessions.delete(this.accessToken);
                        console.log(`[Session] Cleaned up idle session.`);
                    }
                }, 5 * 60 * 1000);
            }
        });
    }

    subscribe(tokens) {
        tokens.forEach(t => this.subscribedTokens.add(t));
        if (this.kiteWS && this.kiteWS.readyState === WebSocket.OPEN) {
            this._sendSubscribe(tokens);
        } else {
            this.connect();
        }
    }

    unsubscribe(tokens) {
        tokens.forEach(t => this.subscribedTokens.delete(t));
        if (this.kiteWS && this.kiteWS.readyState === WebSocket.OPEN) {
            this.kiteWS.send(JSON.stringify({
                a: "unsubscribe",
                v: tokens,
            }));
        }
    }

    connect() {
        if (this.isConnecting) return;
        this.isConnecting = true;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        console.log(`[Session] Connecting to Kite WS...`);
        const wsUrl = `${KITE_WS_URL}?api_key=${KITE_API_KEY}&access_token=${this.accessToken}`;

        try {
            this.kiteWS = new WebSocket(wsUrl);
            this.kiteWS.binaryType = "nodebuffer";
        } catch (err) {
            console.error("[Session] WS creation error:", err.message);
            this.isConnecting = false;
            this._scheduleReconnect();
            return;
        }

        this.kiteWS.on("open", () => {
            this.isConnecting = false;
            console.log(`[Session] Connected to Kite WS.`);
            this.broadcast({ type: "status", data: { connected: true, source: "ec2-kite-ws" } });

            // Subscribe to all pending tokens
            if (this.subscribedTokens.size > 0) {
                this._sendSubscribe([...this.subscribedTokens]);
            }

            // Ping every 5s to keep alive (Kite closes idle connections)
            this.pingTimer = setInterval(() => {
                if (this.kiteWS.readyState === WebSocket.OPEN) {
                    this.kiteWS.ping();
                }
            }, 5000);
        });

        this.kiteWS.on("message", (data) => {
            this.lastTickAt = Date.now();
            try {
                const parsed = parseBinary(data);
                if (parsed && parsed.length > 0) {
                    this.broadcast({ type: "tick", data: parsed });
                }
            } catch (err) {
                // Text message (e.g., status)
                try {
                    const msg = JSON.parse(data.toString());
                    if (msg.type === "order") {
                        this.broadcast({ type: "order_update", data: msg });
                    }
                } catch (_) {
                    // Ignore non-JSON text frames
                }
            }
        });

        this.kiteWS.on("error", (err) => {
            console.error("[Session] Kite WS error:", err.message);
            this.isConnecting = false;
        });

        this.kiteWS.on("close", (code, reason) => {
            this.isConnecting = false;
            clearInterval(this.pingTimer);
            console.warn(`[Session] Kite WS closed: ${code} ${reason}`);
            this.broadcast({ type: "status", data: { connected: false, code } });
            this._scheduleReconnect();
        });
    }

    _sendSubscribe(tokens) {
        const tokenArray = [...new Set(tokens)].filter(t => Number.isInteger(t) && t > 0);
        if (tokenArray.length === 0) return;

        this.kiteWS.send(JSON.stringify({ a: "subscribe", v: tokenArray }));
        this.kiteWS.send(JSON.stringify({ a: "mode", v: ["full", tokenArray] }));
        console.log(`[Session] Subscribed to ${tokenArray.length} tokens.`);
    }

    _scheduleReconnect() {
        if (this.reconnectTimer) return;
        console.log("[Session] Reconnecting in 3s...");
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.clients.size > 0) {
                this.connect();
            }
        }, 3000);
    }

    broadcast(msg) {
        const payload = JSON.stringify(msg);
        this.clients.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(payload);
            }
        });
    }

    disconnect() {
        clearInterval(this.pingTimer);
        clearTimeout(this.reconnectTimer);
        if (this.kiteWS) {
            this.kiteWS.removeAllListeners();
            this.kiteWS.terminate();
            this.kiteWS = null;
        }
    }
}

// ── Kite Binary Parser ────────────────────────────────────────
// Parses the compact binary format Kite sends for market data
function parseBinary(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 2) return null;

    const tickCount = buffer.readInt16BE(0);
    const ticks = [];

    let offset = 2;
    for (let i = 0; i < tickCount; i++) {
        if (offset + 2 > buffer.length) break;
        const tickLength = buffer.readInt16BE(offset);
        offset += 2;

        if (offset + tickLength > buffer.length) break;
        const tickData = buffer.slice(offset, offset + tickLength);
        offset += tickLength;

        try {
            const tick = parseTick(tickData, tickLength);
            if (tick) ticks.push(tick);
        } catch (e) {
            // Skip malformed ticks
        }
    }

    return ticks;
}

function parseTick(data, length) {
    const token = data.readInt32BE(0);
    const tradeable = (token & 0xFF000000) !== 0xFF000000;
    const segment = token & 0xFF;
    const isDec2 = [2, 3, 4, 6, 7].includes(segment); // BSE, NFO, BFO, MCX, BSECDS
    const divisor = isDec2 ? 100.0 : tradeable ? 100.0 : 1.0;

    const tick = { instrument_token: token & 0xFFFFFF };

    if (length === 8) {
        // LTP mode
        tick.last_price = data.readInt32BE(4) / divisor;
        tick.mode = "ltp";
    } else if (length === 28) {
        // Quote mode
        tick.last_price = data.readInt32BE(4) / divisor;
        tick.ohlc = {
            high: data.readInt32BE(8) / divisor,
            low: data.readInt32BE(12) / divisor,
            open: data.readInt32BE(16) / divisor,
            close: data.readInt32BE(20) / divisor,
        };
        tick.volume = data.readInt32BE(24);
        tick.net_change = tick.last_price - tick.ohlc.close;
        tick.change_percent = tick.ohlc.close > 0
            ? ((tick.last_price - tick.ohlc.close) / tick.ohlc.close) * 100
            : 0;
        tick.mode = "quote";
    } else if (length === 44 || length === 184) {
        // Full mode
        tick.last_price = data.readInt32BE(4) / divisor;
        tick.last_quantity = data.readInt32BE(8);
        tick.average_price = data.readInt32BE(12) / divisor;
        tick.volume = data.readInt32BE(16);
        tick.buy_quantity = data.readInt32BE(20);
        tick.sell_quantity = data.readInt32BE(24);
        tick.ohlc = {
            open: data.readInt32BE(28) / divisor,
            high: data.readInt32BE(32) / divisor,
            low: data.readInt32BE(36) / divisor,
            close: data.readInt32BE(40) / divisor,
        };
        tick.net_change = tick.last_price - tick.ohlc.close;
        tick.change_percent = tick.ohlc.close > 0
            ? ((tick.last_price - tick.ohlc.close) / tick.ohlc.close) * 100
            : 0;

        if (length === 184) {
            // Parse market depth (20 levels)
            tick.depth = { buy: [], sell: [] };
            let dOffset = 44;
            for (let i = 0; i < 5; i++) {
                tick.depth.buy.push({
                    quantity: data.readInt32BE(dOffset),
                    price: data.readInt32BE(dOffset + 4) / divisor,
                    orders: data.readInt16BE(dOffset + 8),
                });
                dOffset += 12;
            }
            for (let i = 0; i < 5; i++) {
                tick.depth.sell.push({
                    quantity: data.readInt32BE(dOffset),
                    price: data.readInt32BE(dOffset + 4) / divisor,
                    orders: data.readInt16BE(dOffset + 8),
                });
                dOffset += 12;
            }
        }
        tick.mode = "full";
    }

    return tick;
}

// ── WebSocket Server (Browser → Proxy) ───────────────────────
const wss = new WebSocket.Server({ port: WS_PORT }, () => {
    console.log(`[ZenG Proxy] WebSocket server listening on :${WS_PORT}`);
});

wss.on("connection", (ws, req) => {
    const params = new URLSearchParams(req.url.split("?")[1] || "");
    const accessToken = params.get("access_token") || params.get("token");
    const tokensStr = params.get("tokens") || "";
    const tokens = tokensStr.split(",").map(t => parseInt(t)).filter(t => !isNaN(t) && t > 0);

    if (!accessToken) {
        ws.send(JSON.stringify({ type: "error", data: { message: "access_token required" } }));
        ws.close(4001, "Unauthorized");
        return;
    }

    console.log(`[Proxy] New client | tokens: ${tokens.length}`);

    // Get or create session for this access token
    if (!sessions.has(accessToken)) {
        const session = new KiteSession(accessToken);
        sessions.set(accessToken, session);
    }

    const session = sessions.get(accessToken);
    session.addClient(ws);
    session.subscribe(tokens);

    // Handle messages from browser (subscribe/unsubscribe)
    ws.on("message", (rawMsg) => {
        try {
            const msg = JSON.parse(rawMsg.toString());
            if (msg.type === "subscribe" && Array.isArray(msg.tokens)) {
                session.subscribe(msg.tokens.filter(t => Number.isInteger(t)));
            }
            if (msg.type === "unsubscribe" && Array.isArray(msg.tokens)) {
                session.unsubscribe(msg.tokens);
            }
        } catch (_) { }
    });
});

// ── REST API Server ───────────────────────────────────────────
const ALLOWED_ORIGINS = [
    "https://zengtrade.in",
    "https://www.zengtrade.in",
    "http://localhost:3000",
];

const apiServer = http.createServer(async (req, res) => {
    const origin = req.headers.origin || "";
    const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    res.setHeader("Access-Control-Allow-Origin", allowOrigin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Access-Token");
    res.setHeader("Content-Type", "application/json");
    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

    const url = new URL(req.url, `http://localhost:${API_PORT}`);

    // Health Check
    if (url.pathname === "/health") {
        return res.end(JSON.stringify({
            status: "ok",
            sessions: sessions.size,
            clients: [...sessions.values()].reduce((n, s) => n + s.clients.size, 0),
            uptime: Math.floor(process.uptime()),
            memory: process.memoryUsage().heapUsed,
        }));
    }

    // Quotes endpoint — fetches from Kite REST API
    if (url.pathname === "/quotes") {
        const tokensParam = url.searchParams.get("tokens");
        const accessToken = req.headers["x-access-token"] || url.searchParams.get("token");

        if (!tokensParam || !accessToken) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: "tokens and x-access-token required" }));
        }

        try {
            const params = tokensParam.split(",").map(t => `i=${t.trim()}`).join("&");
            const kiteRes = await kiteGet(`/quote?${params}`, accessToken);
            return res.end(JSON.stringify(kiteRes));
        } catch (err) {
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: err.message }));
        }
    }

    // Instruments endpoint — serves cached symbol→token lookup
    if (url.pathname === "/instruments/lookup") {
        const symbol = url.searchParams.get("symbol");
        if (!symbol) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: "symbol required" }));
        }

        const cached = instrumentsCache.get(symbol.toUpperCase());
        if (cached) {
            return res.end(JSON.stringify({ status: "success", token: cached.instrument_token, ...cached }));
        }

        res.statusCode = 404;
        return res.end(JSON.stringify({ error: "Symbol not found", symbol }));
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Not found" }));
});

apiServer.listen(API_PORT, () => {
    console.log(`[ZenG Proxy] REST API listening on :${API_PORT}`);
});

// ── Instruments Cache ─────────────────────────────────────────
const instrumentsCache = new Map(); // symbol → { instrument_token, exchange, ... }

async function refreshInstruments(accessToken) {
    if (!accessToken) {
        console.warn("[Instruments] No access token available. Skipping refresh.");
        return;
    }

    try {
        console.log("[Instruments] Refreshing NSE instruments from Kite...");
        const data = await kiteGetRaw("/instruments/NSE", accessToken);
        const lines = data.split("\n").slice(1); // Skip CSV header

        let count = 0;
        for (const line of lines) {
            const cols = line.split(",");
            if (cols.length < 9) continue;
            const [instrument_token, , , tradingsymbol, , , , exchange, , , lot_size] = cols;
            const token = parseInt(instrument_token);
            if (isNaN(token)) continue;

            instrumentsCache.set(tradingsymbol.trim().toUpperCase(), {
                instrument_token: token,
                tradingsymbol: tradingsymbol.trim(),
                exchange: exchange.trim(),
                lot_size: parseInt(lot_size) || 1,
            });
            count++;
        }
        console.log(`[Instruments] Loaded ${count} NSE instruments.`);
    } catch (err) {
        console.error("[Instruments] Refresh failed:", err.message);
    }
}

// Refresh instruments at startup (if token exists) and daily at 8:15 AM IST
function scheduleInstrumentsRefresh() {
    // Attempt startup load using first live session token
    function tryInitialLoad() {
        const firstSession = [...sessions.values()][0];
        if (firstSession) {
            refreshInstruments(firstSession.accessToken);
        } else {
            setTimeout(tryInitialLoad, 30000); // Retry in 30s
        }
    }
    setTimeout(tryInitialLoad, 5000);

    // Daily refresh at 8:15 AM IST (02:45 UTC)
    function scheduleNext() {
        const now = new Date();
        const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
        const target = new Date(istNow);
        target.setHours(8, 15, 0, 0);
        if (istNow >= target) target.setDate(target.getDate() + 1);
        const msUntil = target - istNow;
        console.log(`[Instruments] Next refresh in ${Math.floor(msUntil / 60000)}m`);
        setTimeout(() => {
            const sess = [...sessions.values()][0];
            if (sess) refreshInstruments(sess.accessToken);
            scheduleNext();
        }, msUntil);
    }
    scheduleNext();
}

scheduleInstrumentsRefresh();

// ── HTTP Helper ───────────────────────────────────────────────
function kiteGet(path, accessToken) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: "api.kite.trade",
            path,
            headers: {
                "X-Kite-Version": "3",
                "Authorization": `token ${KITE_API_KEY}:${accessToken}`,
            },
        };
        https.get(options, res => {
            let body = "";
            res.on("data", d => body += d);
            res.on("end", () => {
                try { resolve(JSON.parse(body)); }
                catch (e) { reject(new Error("Invalid JSON")); }
            });
        }).on("error", reject);
    });
}

function kiteGetRaw(path, accessToken) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: "api.kite.trade",
            path,
            headers: {
                "X-Kite-Version": "3",
                "Authorization": `token ${KITE_API_KEY}:${accessToken}`,
                "Accept-Encoding": "gzip",
            },
        };
        https.get(options, res => {
            const chunks = [];
            const stream = res.headers["content-encoding"] === "gzip"
                ? res.pipe(zlib.createGunzip())
                : res;
            stream.on("data", d => chunks.push(d));
            stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        }).on("error", reject);
    });
}

// ── Graceful Shutdown ─────────────────────────────────────────
process.on("SIGTERM", () => {
    console.log("[Proxy] SIGTERM received. Shutting down gracefully...");
    sessions.forEach(s => s.disconnect());
    wss.close(() => process.exit(0));
});

process.on("uncaughtException", (err) => {
    console.error("[Proxy] Uncaught exception:", err.message, err.stack);
    // Don't exit — PM2 will restart if needed
});

process.on("unhandledRejection", (reason) => {
    console.error("[Proxy] Unhandled rejection:", reason);
});

console.log("[ZenG Proxy] Starting up...");
