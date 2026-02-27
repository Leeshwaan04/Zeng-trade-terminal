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
const SSE_FAILURE_THRESHOLD = 3; // After 3 SSE failures, switch to polling

let riskLimits = { maxLoss: -10000, maxTrades: 50 }; // Defaults
let isHaltActive = false;

self.onmessage = (event) => {
    const { type, payload } = event.data;
    const instanceKey = payload?.url || 'default';

    switch (type) {
        case 'CONNECT':
            if (payload?.type === 'sse') {
                connectSSE(payload.url, instanceKey, payload.broker || 'KITE');
            } else if (payload?.type === 'ws') {
                connectWS(payload.url, instanceKey, payload.broker || 'UPSTOX');
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

// ─── OPTIMIZATION: Tick Batching ─────────────────────────────
// Instead of spamming the main thread on every single tick (which causes React to freeze),
// we accumulate them in this buffer and flush them every 250ms.
const TICK_FLUSH_INTERVAL = 250;
const tickBuffer = new Map(); // key -> current map of token -> tick
let isTickFlushRunning = false;

function startTickFlush() {
    if (isTickFlushRunning) return;
    isTickFlushRunning = true;
    setInterval(() => {
        if (tickBuffer.size === 0) return;

        tickBuffer.forEach((ticksMap, key) => {
            const ticksArray = Array.from(ticksMap.values());
            if (ticksArray.length > 0) {
                self.postMessage({ type: 'TICK', payload: { data: ticksArray, key } });
                ticksMap.clear(); // Clear after flushing
            }
        });
    }, TICK_FLUSH_INTERVAL);
}

// Start immediately
startTickFlush();

function broadcast(type, key, payload) {
    const instance = instances.get(key);
    if (instance) instance.lastTickAt = Date.now();

    if (type === 'TICK' && payload.data) {
        const ticks = Array.isArray(payload.data) ? payload.data : [payload.data];

        // Ensure map exists for this key
        if (!tickBuffer.has(key)) tickBuffer.set(key, new Map());
        const instanceBuffer = tickBuffer.get(key);

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

                // Aggregate into buffer (latest tick per instrument overwrites older ones in same batch)
                const uid = tick.instrument_token || symbol;
                // Merge with existing tick in buffer to preserve fields (e.g. ohlc + depth from different packets)
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
                scheduleReconnect(instance.url, 'ws', key, instance.broker);
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
                broadcast('TICK', key, { data: JSON.parse(e.data) });
                // SSE is delivering ticks — reset failure count
                instance.sseFailureCount = 0;
            } catch (err) { }
        });

        eventSource.onerror = () => {
            instance.sseFailureCount = (instance.sseFailureCount || 0) + 1;
            console.warn(`[Worker] SSE error #${instance.sseFailureCount} for ${key}`);

            // After threshold failures, switch to polling fallback
            if (instance.sseFailureCount >= SSE_FAILURE_THRESHOLD) {
                console.warn(`[Worker] SSE failed ${SSE_FAILURE_THRESHOLD}x. Switching to REST polling.`);
                // Close the broken SSE connection
                eventSource.close();
                instance.eventSource = null;
                // Start polling
                startPolling(key);
            } else {
                // Let EventSource auto-reconnect for a few tries
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

        if (!res.ok) {
            if (res.status === 401) {
                broadcast('ERROR', key, { message: 'Not authenticated — please log in via Kite' });
                stopPolling(key);
            }
            return;
        }

        const json = await res.json();
        if (json.status === 'success' && json.data && json.data.length > 0) {
            broadcast('TICK', key, { data: json.data });
        }
    } catch (err) {
        // Network error — keep polling, it may recover
        console.warn('[Worker] Poll error:', err.message);
    }
}

// ─── WebSocket Connection (Secondary Brokers) ─────────────────
function connectWS(url, key, broker) {
    cleanupInstance(key);

    try {
        const socket = new WebSocket(url);
        socket.binaryType = 'arraybuffer';
        instances.set(key, { socket, type: 'ws', lastTickAt: Date.now(), broker, url });

        socket.onopen = () => {
            broadcast('STATUS', key, { connected: true });
        };

        socket.onmessage = (event) => {
            broadcast('TICK', key, {
                data: event.data,
                isBinary: event.data instanceof ArrayBuffer
            });
        };

        socket.onerror = () => {
            broadcast('ERROR', key, { message: 'WS Connection Failed' });
            scheduleReconnect(url, 'ws', key, broker);
        };

        socket.onclose = () => {
            broadcast('STATUS', key, { connected: false });
        };
    } catch (err) {
        console.error('Worker WS Error:', err);
    }
}

function scheduleReconnect(url, type, key, broker) {
    const instance = instances.get(key);
    if (instance?.reconnectTimer) clearTimeout(instance.reconnectTimer);

    const timer = setTimeout(() => {
        if (type === 'sse') connectSSE(url, key, broker);
        else connectWS(url, key, broker);
    }, RECONNECT_INTERVAL);

    if (instance) instance.reconnectTimer = timer;
    else instances.set(key, { reconnectTimer: timer, type, lastTickAt: 0, broker });
}
