/**
 * ZenG Trade — WebSocket Relay Server
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs on EC2 (persistent process, no serverless timeout).
 * Bridges browser clients ↔ Kite Connect WebSocket.
 *
 * Problem it solves:
 *   Vercel terminates server-sent event connections after 5 minutes (maxDuration).
 *   This relay maintains a permanent Kite WS connection and forwards parsed ticks
 *   to any number of browser tabs over standard WebSocket.
 *
 * Client protocol (after WS handshake):
 *   1. Client → Relay: { type: "AUTH", access_token: "xxx", api_key: "xxx" }
 *   2. Client → Relay: { type: "SUBSCRIBE", tokens: [256265, 260105], mode: "full" }
 *   3. Relay → Client: { type: "status", connected: true }
 *   4. Relay → Client: { type: "tick", data: [{ instrument_token, last_price, ... }] }
 *   5. Relay → Client: { type: "heartbeat", t: 1234567890 }
 *
 * Session model:
 *   One KiteSession per (apiKey + accessToken) pair.
 *   All browser tabs for the same user share ONE Kite WS connection.
 *   Subscriptions are unioned across clients.
 *   Kite limit: 3 WS connections per API key — this relay uses just 1.
 *
 * Deploy on EC2:
 *   npm install && npm run build
 *   PORT=8080 ALLOWED_ORIGINS=https://zengtrade.in,https://www.zengtrade.in pm2 start dist/index.js --name zeng-relay
 *
 * Nginx TLS termination:
 *   proxy_pass http://localhost:8080;
 *   proxy_http_version 1.1;
 *   proxy_set_header Upgrade $http_upgrade;
 *   proxy_set_header Connection "upgrade";
 */

import { WebSocketServer, WebSocket } from "ws";
import { createServer, IncomingMessage } from "http";
import { parseBinaryMessage, ParsedTick } from "./parser";

const PORT = parseInt(process.env.PORT ?? "8080", 10);
const KITE_WS_BASE = "wss://ws.kite.trade";
const AUTH_TIMEOUT_MS = 10_000;     // Client must authenticate within 10s
const HEARTBEAT_INTERVAL_MS = 5_000;
const KITE_RECONNECT_DELAY_MS = 5_000;

// ─── CORS: allowed browser origins ───────────────────────────
const ALLOWED_ORIGINS = new Set(
    (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
        .split(",")
        .map(o => o.trim())
);

// ─── Types ────────────────────────────────────────────────────
interface RelayClient {
    ws: WebSocket;
    sessionKey: string | null;
    tokens: Set<number>;
    mode: string;
    authed: boolean;
    authTimer: ReturnType<typeof setTimeout> | null;
}

interface KiteSession {
    apiKey: string;
    accessToken: string;
    kiteWs: WebSocket | null;
    clients: Set<RelayClient>;
    subscribedTokens: Set<number>;
    mode: string;
    reconnectTimer: ReturnType<typeof setTimeout> | null;
    isConnecting: boolean;
}

// ─── Session registry ─────────────────────────────────────────
const sessions = new Map<string, KiteSession>(); // key: `${apiKey}:${accessToken}`

function sessionKey(apiKey: string, accessToken: string): string {
    return `${apiKey}:${accessToken}`;
}

// ─── Kite Session Manager ─────────────────────────────────────
function getOrCreateSession(apiKey: string, accessToken: string): KiteSession {
    const key = sessionKey(apiKey, accessToken);
    const existing = sessions.get(key);
    if (existing) return existing;

    const session: KiteSession = {
        apiKey,
        accessToken,
        kiteWs: null,
        clients: new Set(),
        subscribedTokens: new Set(),
        mode: "quote",
        reconnectTimer: null,
        isConnecting: false,
    };
    sessions.set(key, session);
    return session;
}

function connectKite(session: KiteSession): void {
    if (session.isConnecting || session.kiteWs?.readyState === WebSocket.OPEN) return;
    session.isConnecting = true;

    const url = `${KITE_WS_BASE}/?api_key=${session.apiKey}&access_token=${session.accessToken}`;
    console.log(`[Relay] Connecting to Kite WS for ${session.apiKey.slice(0, 4)}***`);

    const kiteWs = new WebSocket(url);
    session.kiteWs = kiteWs;

    kiteWs.on("open", () => {
        console.log(`[Relay] Kite WS connected`);
        session.isConnecting = false;
        broadcastStatus(session, true);
        resubscribe(session);
    });

    kiteWs.on("message", (data: Buffer | ArrayBuffer | Buffer[]) => {
        const buf = Buffer.isBuffer(data) ? data : Buffer.concat(data as Buffer[]);

        // 1-byte heartbeat from Kite
        if (buf.byteLength === 1) return;

        // Binary ticks
        if (buf.byteLength > 1) {
            try {
                const ticks = parseBinaryMessage(buf);
                if (ticks.length > 0) {
                    broadcastTicks(session, ticks);
                }
            } catch {
                // Malformed packet — skip
            }
            return;
        }

        // Text (order update)
        try {
            const msg = JSON.parse(buf.toString());
            if (msg.type === "order") {
                broadcastToClients(session, JSON.stringify({ type: "order", data: msg.data }));
            }
        } catch { /* ignore */ }
    });

    kiteWs.on("error", (err) => {
        console.error(`[Relay] Kite WS error: ${err.message}`);
        session.isConnecting = false;
        broadcastStatus(session, false, err.message);
    });

    kiteWs.on("close", (code) => {
        console.log(`[Relay] Kite WS closed (${code})`);
        session.isConnecting = false;
        session.kiteWs = null;

        if (session.clients.size > 0) {
            broadcastStatus(session, false);
            console.log(`[Relay] Reconnecting in ${KITE_RECONNECT_DELAY_MS}ms...`);
            session.reconnectTimer = setTimeout(() => connectKite(session), KITE_RECONNECT_DELAY_MS);
        } else {
            // No clients left — clean up session
            cleanupSession(session);
        }
    });
}

function resubscribe(session: KiteSession): void {
    const kiteWs = session.kiteWs;
    if (!kiteWs || kiteWs.readyState !== WebSocket.OPEN) return;

    const tokens = Array.from(session.subscribedTokens);
    if (tokens.length === 0) return;

    kiteWs.send(JSON.stringify({ a: "subscribe", v: tokens }));
    kiteWs.send(JSON.stringify({ a: "mode", v: [session.mode, tokens] }));
    console.log(`[Relay] Subscribed ${tokens.length} tokens in ${session.mode} mode`);
}

function broadcastTicks(session: KiteSession, ticks: ParsedTick[]): void {
    const msg = JSON.stringify({ type: "tick", data: ticks });
    broadcastToClients(session, msg);
}

function broadcastStatus(session: KiteSession, connected: boolean, error?: string): void {
    const msg = JSON.stringify({ type: "status", connected, error });
    broadcastToClients(session, msg);
}

function broadcastToClients(session: KiteSession, msg: string): void {
    for (const client of session.clients) {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(msg);
        }
    }
}

function cleanupSession(session: KiteSession): void {
    if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
    session.kiteWs?.close();
    session.kiteWs = null;
    const key = sessionKey(session.apiKey, session.accessToken);
    sessions.delete(key);
    console.log(`[Relay] Session cleaned up: ${session.apiKey.slice(0, 4)}***`);
}

function removeClient(client: RelayClient): void {
    if (client.authTimer) clearTimeout(client.authTimer);
    if (!client.sessionKey) return;

    const session = sessions.get(client.sessionKey);
    if (!session) return;

    session.clients.delete(client);

    if (session.clients.size === 0) {
        console.log(`[Relay] Last client disconnected — closing Kite WS`);
        cleanupSession(session);
    } else {
        // Recompute union of subscribed tokens across remaining clients
        session.subscribedTokens.clear();
        session.mode = "quote";
        for (const c of session.clients) {
            c.tokens.forEach(t => session.subscribedTokens.add(t));
            if (c.mode === "full") session.mode = "full";
        }
        resubscribe(session);
    }
}

// ─── HTTP + WebSocket Server ──────────────────────────────────
const httpServer = createServer((req, res) => {
    // Health check endpoint for load balancer / uptime monitors
    if (req.url === "/health") {
        const stats = {
            sessions: sessions.size,
            total_clients: Array.from(sessions.values()).reduce((s, sess) => s + sess.clients.size, 0),
            uptime_seconds: Math.floor(process.uptime()),
        };
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", ...stats }));
    } else {
        res.writeHead(404);
        res.end();
    }
});

const wss = new WebSocketServer({ server: httpServer });

wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    // ── CORS check ───────────────────────────────────────────
    const origin = req.headers.origin ?? "";
    if (ALLOWED_ORIGINS.size > 0 && !ALLOWED_ORIGINS.has(origin)) {
        console.warn(`[Relay] Rejected connection from origin: ${origin}`);
        ws.close(1008, "Origin not allowed");
        return;
    }

    const client: RelayClient = {
        ws,
        sessionKey: null,
        tokens: new Set(),
        mode: "quote",
        authed: false,
        authTimer: null,
    };

    // Close unauthenticated clients after AUTH_TIMEOUT_MS
    client.authTimer = setTimeout(() => {
        if (!client.authed) {
            ws.close(4001, "Authentication timeout");
        }
    }, AUTH_TIMEOUT_MS);

    ws.on("message", (raw: Buffer) => {
        let msg: any;
        try {
            msg = JSON.parse(raw.toString());
        } catch {
            return;
        }

        // ── AUTH ─────────────────────────────────────────────
        if (msg.type === "AUTH") {
            const { access_token, api_key, tokens, mode } = msg;
            if (!access_token || !api_key) {
                ws.send(JSON.stringify({ type: "error", message: "Missing access_token or api_key" }));
                ws.close(4001, "Auth failed");
                return;
            }

            if (client.authTimer) {
                clearTimeout(client.authTimer);
                client.authTimer = null;
            }

            const key = sessionKey(api_key, access_token);
            const session = getOrCreateSession(api_key, access_token);

            client.authed = true;
            client.sessionKey = key;
            session.clients.add(client);

            // Subscribe initial tokens if provided with AUTH
            if (Array.isArray(tokens) && tokens.length > 0) {
                const mode_ = mode ?? "quote";
                tokens.forEach((t: number) => {
                    client.tokens.add(t);
                    session.subscribedTokens.add(t);
                });
                client.mode = mode_;
                if (mode_ === "full") session.mode = "full";
            }

            ws.send(JSON.stringify({ type: "status", connected: false, message: "Authenticated — connecting to Kite..." }));
            connectKite(session);
            return;
        }

        // Require auth for all other messages
        if (!client.authed || !client.sessionKey) {
            ws.send(JSON.stringify({ type: "error", message: "Not authenticated" }));
            return;
        }

        const session = sessions.get(client.sessionKey);
        if (!session) return;

        // ── SUBSCRIBE ────────────────────────────────────────
        if (msg.type === "SUBSCRIBE") {
            const newTokens: number[] = msg.tokens ?? [];
            const mode: string = msg.mode ?? "quote";

            newTokens.forEach(t => {
                client.tokens.add(t);
                session.subscribedTokens.add(t);
            });
            if (mode === "full") session.mode = "full";
            client.mode = mode;

            resubscribe(session);
            ws.send(JSON.stringify({ type: "status", subscribed: newTokens.length, total: session.subscribedTokens.size }));
            return;
        }

        // ── UNSUBSCRIBE ──────────────────────────────────────
        if (msg.type === "UNSUBSCRIBE") {
            const removeTokens: number[] = msg.tokens ?? [];
            removeTokens.forEach(t => client.tokens.delete(t));

            // Recompute union — a token stays in the Kite subscription as long as any client wants it
            session.subscribedTokens.clear();
            for (const c of session.clients) {
                c.tokens.forEach(t => session.subscribedTokens.add(t));
            }
            resubscribe(session);
        }
    });

    ws.on("close", () => {
        removeClient(client);
    });

    ws.on("error", (err) => {
        console.error(`[Relay] Client WS error: ${err.message}`);
        removeClient(client);
    });
});

// ─── Heartbeat (keep browser WS alive through proxies) ───────
setInterval(() => {
    const msg = JSON.stringify({ type: "heartbeat", t: Date.now() });
    sessions.forEach(session => {
        broadcastToClients(session, msg);
    });
}, HEARTBEAT_INTERVAL_MS);

// ─── Start ────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
    console.log(`[Relay] ZenG Trade WS Relay running on port ${PORT}`);
    console.log(`[Relay] Allowed origins: ${Array.from(ALLOWED_ORIGINS).join(", ")}`);
    console.log(`[Relay] Health: http://localhost:${PORT}/health`);
});

// ─── Graceful shutdown ────────────────────────────────────────
process.on("SIGTERM", () => {
    console.log("[Relay] SIGTERM — shutting down gracefully...");
    sessions.forEach(cleanupSession);
    wss.close(() => {
        httpServer.close(() => process.exit(0));
    });
});
