/**
 * Cyber Trade: Ticker Worker
 * Offloads WebSocket parsing and state management to a background thread.
 */

interface WorkerMessage {
    type: 'CONNECT' | 'SUBSCRIBE' | 'UNSUBSCRIBE' | 'DISCONNECT' | 'UPDATE_MARGIN' | 'UPDATE_RISK_LIMITS';
    payload?: {
        url: string;
        type: 'sse' | 'ws';
        tokens?: number[];
        broker?: string;
        marginData?: any;
        riskLimits?: { maxLoss: number; maxTrades: number };
        currentMtm?: number;
    };
}

// Global State
const instances = new Map<string, {
    socket?: WebSocket;
    eventSource?: EventSource;
    reconnectTimer?: any;
    type: 'sse' | 'ws';
    lastTickAt: number;
    broker: string;
}>();

const brokerMargins = new Map<string, any>();
const RECONNECT_INTERVAL = 5000;
const LAG_THRESHOLD = 3000; // 3 seconds lag = switch

let riskLimits = { maxLoss: -10000, maxTrades: 50 }; // Defaults
let isHaltActive = false;

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
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
    const unified: any = { totalMargin: 0, brokers: {} };
    brokerMargins.forEach((data, broker) => {
        unified.brokers[broker] = data;
        unified.totalMargin += (data.available || 0);
    });
    self.postMessage({ type: 'UNIFIED_MARGIN', payload: unified });
}

function cleanupInstance(key: string) {
    const instance = instances.get(key);
    if (!instance) return;

    instance.socket?.close();
    instance.eventSource?.close();
    if (instance.reconnectTimer) clearTimeout(instance.reconnectTimer);

    instances.delete(key);
    self.postMessage({ type: 'STATUS', payload: { connected: false, key } });
}

// --- Technical Indicators ---
const indicatorHistory = new Map<string, number[]>();

function calculateEMA(symbol: string, price: number, period: number = 20) {
    if (!indicatorHistory.has(symbol)) indicatorHistory.set(symbol, []);
    const prices = indicatorHistory.get(symbol)!;
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
const priceFusionMap = new Map<string, Map<string, number>>();

function calculateFusedPrice(symbol: string, broker: string, price: number) {
    if (!priceFusionMap.has(symbol)) priceFusionMap.set(symbol, new Map());
    const brokerPrices = priceFusionMap.get(symbol)!;
    brokerPrices.set(broker, price);

    if (brokerPrices.size < 2) return price;

    // Golden Price = Median or Mean of all sources to neutralize glitches
    const allPrices = Array.from(brokerPrices.values()).sort((a, b) => a - b);
    const mid = Math.floor(allPrices.length / 2);
    return allPrices.length % 2 !== 0 ? allPrices[mid] : (allPrices[mid - 1] + allPrices[mid]) / 2;
}

function broadcast(type: 'TICK' | 'STATUS' | 'ERROR', key: string, payload: any) {
    const instance = instances.get(key);
    if (instance) instance.lastTickAt = Date.now();

    if (type === 'TICK' && payload.data) {
        // Handle both single tick and array of ticks
        const ticks = Array.isArray(payload.data) ? payload.data : [payload.data];
        ticks.forEach((tick: any) => {
            if (tick.last_price) {
                const symbol = tick.symbol || key;
                const broker = instance?.broker || 'UNKNOWN';

                // 1. Fusion (Golden Price)
                tick.fused_price = calculateFusedPrice(symbol, broker, tick.last_price);

                // 2. Indicators
                tick.indicators = {
                    ema20: calculateEMA(symbol, tick.fused_price, 20)
                };

                // 3. Basis Intelligence (Spot-Futures Divergence)
                if (symbol.includes('FUT')) {
                    const spotSymbol = symbol.split(' ')[0]; // Basic heuristic
                    const spotPrice = priceFusionMap.get(spotSymbol)?.get(broker);
                    if (spotPrice) {
                        tick.basis = tick.fused_price - spotPrice;
                    }
                }
            }
        });
    }
    self.postMessage({ type, payload: { ...payload, key } });

    // Holistic Fail-Safe Logic
    checkFailover();
}

function checkFailover() {
    const now = Date.now();
    instances.forEach((instance, key) => {
        if (instance.type === 'sse' && instance.lastTickAt > 0 && (now - instance.lastTickAt > LAG_THRESHOLD)) {
            // Priority Failover: SSE is lagging, notify main thread to potential swap
            self.postMessage({
                type: 'FAILOVER_SUGGESTION',
                payload: { laggyKey: key, broker: instance.broker }
            });
        }
    });
}

function connectSSE(url: string, key: string, broker: string) {
    cleanupInstance(key);

    try {
        const absoluteUrl = new URL(url, self.location.origin).href;
        const eventSource = new EventSource(absoluteUrl);

        instances.set(key, { eventSource, type: 'sse', lastTickAt: Date.now(), broker });

        eventSource.addEventListener('status', (e) => {
            broadcast('STATUS', key, JSON.parse(e.data));
        });

        eventSource.addEventListener('tick', (e) => {
            broadcast('TICK', key, { data: JSON.parse(e.data) });
        });

        eventSource.onerror = () => {
            broadcast('ERROR', key, { message: 'SSE Connection Failed' });
            scheduleReconnect(url, 'sse', key, broker);
        };
    } catch (err) {
        console.error('Worker SSE Error:', err);
    }
}

function connectWS(url: string, key: string, broker: string) {
    cleanupInstance(key);

    try {
        const socket = new WebSocket(url);
        socket.binaryType = 'arraybuffer';
        instances.set(key, { socket, type: 'ws', lastTickAt: Date.now(), broker });

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

function scheduleReconnect(url: string, type: 'sse' | 'ws', key: string, broker: string) {
    const instance = instances.get(key);
    if (instance?.reconnectTimer) clearTimeout(instance.reconnectTimer);

    const timer = setTimeout(() => {
        if (type === 'sse') connectSSE(url, key, broker);
        else connectWS(url, key, broker);
    }, RECONNECT_INTERVAL);

    if (instance) instance.reconnectTimer = timer;
    else instances.set(key, { reconnectTimer: timer, type, lastTickAt: 0, broker });
}
