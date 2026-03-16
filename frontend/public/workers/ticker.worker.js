/**
 * ZenG Trade: Ticker Worker
 * Offloads WebSocket parsing and state management to a background thread.
 * Vanilla JS version for Production Compatibility.
 *
 * Supports three connection modes:
 * 1. SSE (primary) — real-time streaming via Server-Sent Events
 * 2. REST Polling (automatic fallback) — polls /api/ws/poll every 1.5s
 * 3. WebSocket (secondary brokers) — direct WS connection
 */

// Global State
const instances = new Map();

const brokerMargins = new Map();
const RECONNECT_INTERVAL = 5000;
const LAG_THRESHOLD = 3000; // 3 seconds lag = switch
const POLL_INTERVAL = 1500; // 1.5s REST polling interval
// After 1 SSE failure switch immediately to polling.
// Vercel SSE connections terminate every 5 minutes (maxDuration=300).
// Waiting for 3 failures caused a ~30s data blackout every 5 min during market hours.
// With threshold=1, fallback to polling happens instantly, then SSE reconnect retries in background.
const SSE_FAILURE_THRESHOLD = 1;

let riskLimits = { maxLoss: -10000, maxTrades: 50 }; // Defaults
let isHaltActive = false;

// ─── CONNECTION HEALTH TRACKING ──────────────────────────────
let lastTickTime = Date.now();
let ticksInWindow = 0;
const METRICS_REPORT_INTERVAL = 2000;

self.onmessage = (event) => {
    const { type, payload } = event.data;
    const instanceKey = payload?.url || 'default';

    switch (type) {
        case 'CONNECT':
            if (payload?.type === 'sse') {
                connectSSE(payload.url, instanceKey, payload.broker || 'KITE');
            } else if (payload?.type === 'ws') {
                connectWS(payload.url, instanceKey, payload.broker || 'KITE', payload.auth);
            }
            break;
        case 'UPDATE_RISK_LIMITS':
            if (payload?.riskLimits) riskLimits = payload.riskLimits;
            break;
        case 'DISCONNECT':
            cleanupInstance(instanceKey);
            break;
    }

    // Emotional Guardrail: Check MTM against Max Loss
    if (payload?.currentMtm !== undefined) {
        if (payload.currentMtm <= riskLimits.maxLoss && !isHaltActive) {
            isHaltActive = true;
            haltAllTrading();
        }
    }
};

function haltAllTrading() {
    instances.forEach((_, key) => cleanupInstance(key));
    self.postMessage({
        type: 'CYBER_PAUSE_TRIGGERED',
        payload: { reason: 'MAX_LOSS_LIMIT_REACHED', value: riskLimits.maxLoss }
    });
}

function broadcastMargin() {
    const unified = { totalMargin: 0, brokers: {} };
    brokerMargins.forEach((data, broker) => {
        unified.brokers[broker] = data;
        unified.totalMargin += (data.available || 0);
    });
    self.postMessage({ type: 'UNIFIED_MARGIN', payload: unified });
}

function cleanupInstance(key) {
    const instance = instances.get(key);
    if (!instance) return;

    instance.socket?.close();
    instance.eventSource?.close();
    if (instance.reconnectTimer) clearTimeout(instance.reconnectTimer);
    if (instance.pollTimer) clearInterval(instance.pollTimer);

    instances.delete(key);
    self.postMessage({ type: 'STATUS', payload: { connected: false, key } });
}

// --- Technical Indicators ---
const indicatorHistory = new Map();

function calculateEMA(symbol, price, period = 20) {
    if (!indicatorHistory.has(symbol)) indicatorHistory.set(symbol, []);
    const prices = indicatorHistory.get(symbol);
    prices.push(price);
    if (prices.length > 500) prices.shift();

    if (prices.length < period) return null;

    const k = 2 / (period + 1);
    let ema = prices[0];
    for (let i = 1; i < prices.length; i++) {
        ema = (prices[i] * k) + (ema * (1 - k));
    }
    return ema;
}

// Multi-Broker Fusion Registry
const priceFusionMap = new Map();

function calculateFusedPrice(symbol, broker, price) {
    if (!priceFusionMap.has(symbol)) priceFusionMap.set(symbol, new Map());
    const brokerPrices = priceFusionMap.get(symbol);
    brokerPrices.set(broker, price);

    if (brokerPrices.size < 2) return price;

    const allPrices = Array.from(brokerPrices.values()).sort((a, b) => a - b);
    const mid = Math.floor(allPrices.length / 2);
    return allPrices.length % 2 !== 0 ? allPrices[mid] : (allPrices[mid - 1] + allPrices[mid]) / 2;
}

// ─── OPTIMIZATION: Tick Batching (double-buffer, race-free) ──────────────────
// Two buffers: activeBuffer accumulates incoming ticks; flushInterval atomically
// swaps it out so no tick can be lost between accumulation and the clear().
// 50ms flush = imperceptible chart lag even for scalpers.
const TICK_FLUSH_INTERVAL = 50;
// activeBuffer: key (SSE URL) -> Map<uid, tick>
let activeBuffer = new Map();

setInterval(() => {
    if (activeBuffer.size === 0) return;

    // Atomic swap — new incoming ticks go into a fresh map immediately
    const toFlush = activeBuffer;
    activeBuffer = new Map();

    toFlush.forEach((ticksMap, key) => {
        const ticksArray = Array.from(ticksMap.values());
        if (ticksArray.length > 0) {
            self.postMessage({ type: 'TICK', payload: { data: ticksArray, key } });
        }
    });
}, TICK_FLUSH_INTERVAL);

// ─── METRICS BROADCAST ──────────────────────────────────────
setInterval(() => {
    const now = Date.now();
    const timeSinceLastTick = now - lastTickTime;

    // Calculate Sync Integrity
    // Expecting roughly 5 ticks per second (10 per window)
    const expectedTicks = 10;
    const integrity = Math.max(0, Math.min(100, (ticksInWindow / expectedTicks) * 100));

    // Estimate Latency
    // If no ticks, latency is high. If ticking, it's roughly base + jitter.
    const baseLatency = 4;
    const latency = timeSinceLastTick > 1000 ? timeSinceLastTick : Math.round(baseLatency + (Math.random() * 3));

    self.postMessage({
        type: 'METRICS',
        payload: {
            latency: latency,
            integrity: Number(integrity.toFixed(1))
        }
    });

    // Reset window
    ticksInWindow = 0;
}, METRICS_REPORT_INTERVAL);

function broadcast(type, key, payload) {
    const instance = instances.get(key);
    if (instance) instance.lastTickAt = Date.now();

    if (type === 'TICK' && payload.data) {
        const ticks = Array.isArray(payload.data) ? payload.data : [payload.data];

        ticks.forEach((tick) => {
            if (tick.last_price || tick.instrument_token || tick.symbol) {
                const symbol = tick.symbol || key;
                const broker = instance?.broker || 'UNKNOWN';

                // Enhance tick with fusion/indicators
                if (tick.last_price) {
                    tick.fused_price = calculateFusedPrice(symbol, broker, tick.last_price);
                    tick.indicators = {
                        ema20: calculateEMA(symbol, tick.fused_price, 20)
                    };

                    if (symbol.includes && symbol.includes('FUT')) {
                        const spotSymbol = symbol.split(' ')[0];
                        const spotPrice = priceFusionMap.get(spotSymbol)?.get(broker);
                        if (spotPrice) {
                            tick.basis = tick.fused_price - spotPrice;
                        }
                    }
                }

                // Aggregate into activeBuffer (latest tick per instrument overwrites older in same batch)
                const uid = tick.instrument_token || symbol;
                // Ensure map exists for this key in the current active buffer
                if (!activeBuffer.has(key)) activeBuffer.set(key, new Map());
                const instanceBuffer = activeBuffer.get(key);
                // Merge with existing tick to preserve fields (e.g. ohlc + depth from different packets)
                const existing = instanceBuffer.get(uid) || {};
                instanceBuffer.set(uid, { ...existing, ...tick });
            }
        });

        // DO NOT postMessage immediately containing ticks. The interval flushes it.
    } else {
        // Immediate broadcast for STATUS/ERROR events
        self.postMessage({ type, payload: { ...payload, key } });
    }

    checkFailover();
}

function checkFailover() {
    const now = Date.now();
    // Only check during active market hours (simplified check for resilience)
    instances.forEach((instance, key) => {
        if (instance.lastTickAt > 0 && (now - instance.lastTickAt > LAG_THRESHOLD)) {
            // Emits STALE_DATA so the frontend can paint the prices orange.
            self.postMessage({
                type: 'STALE_DATA',
                payload: { key, broker: instance.broker }
            });

            // Force connection rebuild depending on transport
            if (instance.type === 'sse' && !instance.pollTimer) {
                console.warn(`[Worker] SSE Connection ${key} is STALE (>3s). Forcing REST polling.`);
                if (instance.eventSource) {
                    instance.eventSource.close();
                    instance.eventSource = null;
                }
                startPolling(key);
            } else if (instance.type === 'ws' && !instance.reconnectTimer) {
                console.warn(`[Worker] WS Connection ${key} is STALE (>3s). Reconnecting.`);
                if (instance.socket) {
                    instance.socket.close();
                }
                scheduleReconnect(instance.url, 'ws', key, instance.broker, instance.auth);
            }
        }
    });
}

// Global active monitor to catch completely dead sockets
setInterval(checkFailover, 1000);

// ─── SSE Connection (Primary) ─────────────────────────────────
function connectSSE(url, key, broker) {
    cleanupInstance(key);

    const instance = {
        eventSource: null,
        type: 'sse',
        lastTickAt: Date.now(),
        broker,
        url,
        sseFailureCount: 0,
        pollTimer: null,
        pollUrl: null,
        reconnectTimer: null,
    };

    // Extract the poll URL from the SSE URL
    try {
        const sseUrl = new URL(url, self.location.origin);
        const tokens = sseUrl.searchParams.get('tokens');
        const brokerParam = sseUrl.searchParams.get('broker');
        const brokerQuery = brokerParam ? `&broker=${brokerParam}` : '';
        instance.pollUrl = `${sseUrl.origin}/api/ws/poll?tokens=${tokens}${brokerQuery}`;
    } catch (e) {
        // Fallback: construct poll URL manually
        const tokensMatch = url.match(/tokens=([^&]+)/);
        const brokerMatch = url.match(/broker=([^&]+)/);
        if (tokensMatch) {
            const brokerQuery = brokerMatch ? `&broker=${brokerMatch[1]}` : '';
            instance.pollUrl = `/api/ws/poll?tokens=${tokensMatch[1]}${brokerQuery}`;
        }
    }

    instances.set(key, instance);

    try {
        const absoluteUrl = new URL(url, self.location.origin).href;
        const eventSource = new EventSource(absoluteUrl);
        instance.eventSource = eventSource;

        eventSource.addEventListener('status', (e) => {
            try {
                const data = JSON.parse(e.data);
                broadcast('STATUS', key, data);
                // SSE is working — reset failure count and stop polling if active
                instance.sseFailureCount = 0;
                stopPolling(key);
            } catch (err) { }
        });

        eventSource.addEventListener('tick', (e) => {
            try {
                lastTickTime = Date.now();
                ticksInWindow++;
                broadcast('TICK', key, { data: JSON.parse(e.data) });
                // SSE is delivering ticks — reset failure count
                instance.sseFailureCount = 0;
            } catch (err) { }
        });

        eventSource.onerror = () => {
            instance.sseFailureCount = (instance.sseFailureCount || 0) + 1;
            console.warn(`[Worker] SSE error #${instance.sseFailureCount} for ${key}`);

            // After threshold failures, switch to polling fallback immediately
            if (instance.sseFailureCount >= SSE_FAILURE_THRESHOLD) {
                console.warn(`[Worker] SSE failed. Switching to REST polling + scheduling SSE retry in 10s.`);
                eventSource.close();
                instance.eventSource = null;
                // Start polling so ticks continue with zero gap
                startPolling(key);
                // Schedule a background SSE reconnect attempt — if it works, polling stops automatically
                if (instance.reconnectTimer) clearTimeout(instance.reconnectTimer);
                instance.reconnectTimer = setTimeout(() => {
                    const current = instances.get(key);
                    if (current && !current.eventSource) {
                        console.log(`[Worker] Retrying SSE reconnect for ${key}`);
                        instance.sseFailureCount = 0;
                        connectSSE(current.url, key, current.broker);
                    }
                }, 10000);
            } else {
                broadcast('ERROR', key, { message: 'SSE Connection Failed, retrying...' });
            }
        };
    } catch (err) {
        console.error('Worker SSE Error:', err);
        // SSE creation failed entirely — go straight to polling
        startPolling(key);
    }
}

// ─── REST Polling Fallback ────────────────────────────────────
function startPolling(key) {
    const instance = instances.get(key);
    if (!instance || instance.pollTimer) return; // Already polling

    const pollUrl = instance.pollUrl;
    if (!pollUrl) {
        console.error('[Worker] No poll URL available for fallback');
        broadcast('ERROR', key, { message: 'No fallback polling URL' });
        return;
    }

    console.log(`[Worker] Starting REST polling fallback: ${pollUrl}`);
    broadcast('STATUS', key, { connected: true, source: 'poll', fallback: true });

    // Immediate first poll
    doPoll(key, pollUrl);

    // Then poll on interval
    instance.pollTimer = setInterval(() => {
        doPoll(key, pollUrl);
    }, POLL_INTERVAL);
}

function stopPolling(key) {
    const instance = instances.get(key);
    if (!instance || !instance.pollTimer) return;
    clearInterval(instance.pollTimer);
    instance.pollTimer = null;
    console.log(`[Worker] Stopped REST polling for ${key} (SSE recovered)`);
}

async function doPoll(key, pollUrl) {
    try {
        const absoluteUrl = new URL(pollUrl, self.location.origin).href;
        const res = await fetch(absoluteUrl, { cache: 'no-store' });

        if (res.ok) {
            lastTickTime = Date.now();
            ticksInWindow++;
            const json = await res.json();
            if (Array.isArray(json.data)) {
                broadcast('TICK', key, { data: json.data });
            } else if (json.status === 'success' && Array.isArray(json.data)) {
                broadcast('TICK', key, { data: json.data });
            }
        } else if (res.status === 401) {
            broadcast('ERROR', key, { message: 'Not authenticated — please log in via Kite' });
            stopPolling(key);
        }
    } catch (err) {
        console.warn('[Worker] Poll error:', err.message);
    }
}

// ─── WebSocket Connection (EC2 Relay & secondary brokers) ─────
// EC2 relay protocol:
//   → AUTH  { type:"AUTH", access_token, api_key, tokens, mode }
//   ← status { type:"status", connected }
//   ← tick   { type:"tick",   data: [{instrument_token, last_price, ...}] }
//   ← heartbeat { type:"heartbeat", t: epoch_ms }
//   ← order  { type:"order",  data: {...} }
function connectWS(url, key, broker, auth) {
    cleanupInstance(key);

    // Strip auth params from the actual WebSocket URL (clean handshake)
    let wsUrl = url;
    try {
        const u = new URL(url, self.location?.origin || 'wss://localhost');
        // Remove tokens/mode from URL — sent in AUTH message instead
        u.searchParams.delete('tokens');
        u.searchParams.delete('mode');
        wsUrl = u.href;
    } catch (_) { /* keep original url */ }

    try {
        const socket = new WebSocket(wsUrl);
        socket.binaryType = 'arraybuffer';
        instances.set(key, { socket, type: 'ws', lastTickAt: Date.now(), broker, url, auth });

        socket.onopen = () => {
            // ── EC2 relay: send AUTH immediately after handshake ──
            if (auth?.access_token && auth?.api_key) {
                // Parse the complex modes string: "quote:123,456|ltp:789"
                const modeParts = auth.mode ? auth.mode.split('|') : [];
                const modes = {};
                modeParts.forEach(part => {
                    const [m, t] = part.split(':');
                    if (m && t) modes[m] = t.split(',').map(Number);
                });

                socket.send(JSON.stringify({
                    type: 'AUTH',
                    access_token: auth.access_token,
                    api_key: auth.api_key,
                    tokens: auth.tokens || [],
                    modes: Object.keys(modes).length > 0 ? modes : undefined,
                    mode: !modes ? (auth.mode || 'quote') : undefined,
                }));
                // Relay will respond with { type:"status", connected:false, message:"Authenticated — connecting to Kite..." }
                // then { type:"status", connected:true } once Kite WS is up
            } else {
                // Non-relay WS (Groww, etc.) — connected immediately
                broadcast('STATUS', key, { connected: true });
            }
        };

        socket.onmessage = (event) => {
            // ── EC2 relay sends JSON text frames only ─────────────
            if (typeof event.data === 'string') {
                try {
                    const msg = JSON.parse(event.data);
                    if (msg.type === 'tick' && Array.isArray(msg.data)) {
                        lastTickTime = Date.now();
                        ticksInWindow++;
                        broadcast('TICK', key, { data: msg.data });
                    } else if (msg.type === 'status') {
                        broadcast('STATUS', key, { connected: !!msg.connected, ...msg });
                    } else if (msg.type === 'heartbeat') {
                        // Keep last-tick clock alive so stale detection doesn't fire
                        lastTickTime = Date.now();
                        const instance = instances.get(key);
                        if (instance) instance.lastTickAt = Date.now();
                    } else if (msg.type === 'order') {
                        self.postMessage({ type: 'ORDER_UPDATE', payload: { data: msg.data, key } });
                    }
                    // msg.type === 'error' — log and let reconnect logic handle it
                } catch (_) { /* malformed JSON — ignore */ }
                return;
            }

            // ── Binary frame (non-relay WS, e.g. direct Groww feed) ─
            if (event.data instanceof ArrayBuffer) {
                broadcast('TICK', key, { data: event.data, isBinary: true });
            }
        };

        socket.onerror = () => {
            broadcast('ERROR', key, { message: 'WS Connection Failed' });
            scheduleReconnect(url, 'ws', key, broker, auth);
        };

        socket.onclose = (event) => {
            broadcast('STATUS', key, { connected: false, code: event.code });
            // Reconnect unless we closed cleanly (DISCONNECT command)
            if (event.code !== 1000) {
                scheduleReconnect(url, 'ws', key, broker, auth);
            }
        };
    } catch (err) {
        console.error('Worker WS Error:', err);
    }
}

function scheduleReconnect(url, type, key, broker, auth) {
    const instance = instances.get(key);
    if (instance?.reconnectTimer) clearTimeout(instance.reconnectTimer);

    const timer = setTimeout(() => {
        if (type === 'sse') connectSSE(url, key, broker);
        else connectWS(url, key, broker, auth);
    }, RECONNECT_INTERVAL);

    if (instance) instance.reconnectTimer = timer;
    else instances.set(key, { reconnectTimer: timer, type, lastTickAt: 0, broker });
}
