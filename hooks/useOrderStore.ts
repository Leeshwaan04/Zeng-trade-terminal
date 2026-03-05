import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "./useAuthStore";
import { useMarketStore } from "./useMarketStore";
import { useSafetyStore } from "./useSafetyStore";

export type OrderType = 'LIMIT' | 'MARKET' | 'SL' | 'SL-M';
export type TransactionType = 'BUY' | 'SELL';
export type OrderStatus = 'OPEN' | 'EXECUTED' | 'REJECTED' | 'CANCELLED';
export type ProductType = 'MIS' | 'CNC' | 'NRML' | 'MTF';

export interface QueuedAction {
    id: string;
    action: 'PLACE_ORDER' | 'CANCEL_ORDER' | 'MODIFY_ORDER' | 'CLOSE_POSITION' | 'FLATTEN_ALL';
    payload?: any;
    timestamp: number;
}

export interface Order {
    id: string;
    symbol: string;
    transactionType: TransactionType;
    orderType: OrderType;
    productType: ProductType;
    qty: number;
    disclosedQty?: number;
    price: number;
    triggerPrice?: number;
    status: OrderStatus;
    timestamp: number;
    rejectionReason?: string;
    broker?: string;
}

// ─── On-Chart Order Lines ────────────────────────────────────
export type OrderLineType = 'entry' | 'target' | 'stopLoss';

export interface OrderLine {
    id: string;
    symbol: string;
    type: OrderLineType;
    side: TransactionType;
    price: number;
    qty: number;
    filledQty?: number;
    draggable: boolean;
    linkedOrderId: string;
    visible: boolean;
}

export interface Position {
    symbol: string;
    exchange: string;
    instrument_token: number;
    product: ProductType;
    quantity: number;
    overnight_quantity: number;
    multiplier: number;
    average_price: number;
    close_price: number;
    last_price: number;
    value: number;
    pnl: number;
    m2m: number;
    unrealised: number;
    realised: number;
    buy_quantity: number;
    buy_price: number;
    buy_value: number;
    sell_quantity: number;
    sell_price: number;
    sell_value: number;
    broker?: string;
}

export interface Holding {
    tradingsymbol: string;
    exchange: string;
    instrument_token: number;
    isin: string;
    t1_quantity: number;
    realised_quantity: number;
    quantity: number;
    used_quantity: number;
    authorised_quantity: number;
    average_price: number;
    last_price: number;
    close_price: number;
    pnl: number;
    day_change: number;
    day_change_percentage: number;
}

interface OrderState {
    orders: Order[];
    positions: Position[];
    activeOrderLines: OrderLine[];
    marginAvailable: number;
    marginUsed: number;
    dailyPnL: number;
    overallPnL: number;
    lastOrderTime: number;
    actionQueue: QueuedAction[];

    // Actions
    placeOrder: (order: Omit<Order, 'id' | 'status' | 'timestamp'>) => void;
    cancelOrder: (orderId: string) => void;
    removeOrderLine: (lineId: string) => void;
    removeOrderLinesForOrder: (orderId: string) => void;
    setOrders: (orders: Order[]) => void;
    setPositions: (positions: Position[]) => void;
    updatePositionLTP: (symbol: string, ltp: number) => void;
    closePosition: (symbol: string, price: number) => void;
    updateOrderLinePrice: (lineId: string, newPrice: number) => void;
    commitOrderLinePrice: (lineId: string) => Promise<void>;
    // Advanced Execution
    placeBracketOrder: (order: Omit<Order, 'id' | 'status' | 'timestamp'>, slPrice: number, tpPrice: number) => void;
    updateOrder: (orderId: string, updates: Partial<Order>) => void;
    modifyOrder: (orderId: string, updates: { price?: number; qty?: number; triggerPrice?: number }) => Promise<void>;
    // Institutional Blitz
    executeBlitz: (orderParams: Omit<Order, 'id' | 'status' | 'timestamp'>, config: BlitzConfig) => void;
    executeIceberg: (orderParams: Omit<Order, 'id' | 'status' | 'timestamp'>, disclosedQty: number) => void;
    flattenAll: () => Promise<void>;
    // Offline Queue
    enqueueAction: (action: Omit<QueuedAction, 'id' | 'timestamp'>) => void;
    processQueue: () => Promise<void>;
}

export interface BlitzConfig {
    enabled: boolean;
    slices: number;
    interval: number; // seconds
    randomizeSizing: boolean; // Anti-detect
    participationMode: 'FIXED' | 'VWAP_SYNC'; // Participation strategy
}

export const useOrderStore = create<OrderState>()(
    persist(
        (set, get) => ({
            orders: [],
            positions: [],
            activeOrderLines: [],
            marginAvailable: 0,
            marginUsed: 0,
            dailyPnL: 0,
            overallPnL: 0,
            lastOrderTime: 0,
            actionQueue: [],
            setOrders: (orders) => set({ orders }),
            setPositions: (positions) => set({ positions }),

            placeOrder: async (orderParams) => {
                const { activeBroker } = useAuthStore.getState();
                const { unifiedMargin } = useMarketStore.getState();
                const { isArmed } = useSafetyStore.getState();
                const { enqueueAction } = get();

                if (!isArmed) {
                    console.warn("⚠️ EXECUTION PREVENTED: Safety Trigger is ACTIVE (SAFE MODE).");
                    alert("⚠️ SAFETY LOCK ENGAGED\n\nDisarm the 'Nuclear Toggle' in the header to execute trades.");
                    return;
                }

                if (typeof window !== 'undefined' && !navigator.onLine) {
                    console.warn("[OFFLINE] Network disconnected. Queueing Order Placement.");
                    enqueueAction({ action: 'PLACE_ORDER', payload: orderParams });
                    return;
                }

                // --- OPTIMISTIC UI: Generate Temp ID and add to State Immediately ---
                const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

                const pendingOrder: Order = {
                    ...orderParams,
                    id: tempId,
                    status: 'OPEN', // Render as locally open while network resolves
                    timestamp: Date.now(),
                };

                const newOrderLines: OrderLine[] = [];
                if (orderParams.orderType !== 'MARKET') {
                    newOrderLines.push({
                        id: `${tempId}-entry`,
                        symbol: orderParams.symbol,
                        type: 'entry',
                        side: orderParams.transactionType,
                        price: orderParams.price,
                        qty: orderParams.qty,
                        draggable: true,
                        linkedOrderId: tempId,
                        visible: true,
                    });
                }

                // Push optimistic pending state
                set((state: OrderState) => ({
                    orders: [pendingOrder, ...state.orders],
                    activeOrderLines: [...state.activeOrderLines, ...newOrderLines],
                    lastOrderTime: Date.now()
                }));

                try {
                    console.info(`[BLITZ] Executing ${orderParams.transactionType} ${orderParams.qty} ${orderParams.symbol} across ${activeBroker} gateway via Cyber-Pipes.`);

                    const payload = {
                        tradingsymbol: orderParams.symbol,
                        exchange: orderParams.symbol.includes('FUT') || orderParams.symbol.includes('CE') || orderParams.symbol.includes('PE') ? 'NFO' : 'NSE',
                        transaction_type: orderParams.transactionType,
                        order_type: orderParams.orderType,
                        quantity: orderParams.qty,
                        product: orderParams.productType,
                        price: orderParams.price,
                        validity: 'DAY'
                    };

                    const response = await fetch('/api/orders/place', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const json = await response.json();

                    if (!response.ok || json.status !== 'success') {
                        throw new Error(json.error || json.message || 'Order placement failed');
                    }

                    // --- SUCCESS: Commit state to Real ID and calculate positions ---
                    const realId = json.data?.order_id || Math.random().toString(36).substring(7);
                    const marginReq = orderParams.qty * orderParams.price * (orderParams.productType === 'MIS' ? 0.2 : 1);

                    set((state: OrderState) => {
                        const newOrders = state.orders.map(o => o.id === tempId ? { ...o, id: realId, status: 'EXECUTED' as OrderStatus } : o);
                        const newActiveLines = state.activeOrderLines.map(l => l.linkedOrderId === tempId ? { ...l, id: `${realId}-entry`, linkedOrderId: realId } : l);

                        const existingPosIndex = state.positions.findIndex(
                            p => p.symbol === orderParams.symbol && p.product === orderParams.productType
                        );

                        let newPositions = [...state.positions];
                        let pos: Position;

                        if (existingPosIndex > -1) {
                            pos = { ...newPositions[existingPosIndex] };
                        } else {
                            pos = {
                                symbol: orderParams.symbol,
                                exchange: 'NSE',
                                instrument_token: 0,
                                product: orderParams.productType,
                                quantity: 0,
                                overnight_quantity: 0,
                                multiplier: 1,
                                average_price: 0,
                                close_price: 0,
                                last_price: orderParams.price,
                                value: 0,
                                pnl: 0,
                                m2m: 0,
                                unrealised: 0,
                                realised: 0,
                                buy_quantity: 0,
                                buy_price: 0,
                                buy_value: 0,
                                sell_quantity: 0,
                                sell_price: 0,
                                sell_value: 0,
                            };
                        }

                        if (orderParams.transactionType === 'BUY') {
                            const totalBuyValue = (pos.buy_quantity * pos.buy_price) + (orderParams.qty * orderParams.price);
                            pos.buy_quantity += orderParams.qty;
                            pos.buy_price = totalBuyValue / pos.buy_quantity;
                            pos.buy_value = pos.buy_quantity * pos.buy_price;
                        } else {
                            const totalSellValue = (pos.sell_quantity * pos.sell_price) + (orderParams.qty * orderParams.price);
                            pos.sell_quantity += orderParams.qty;
                            pos.sell_price = totalSellValue / pos.sell_quantity;
                            pos.sell_value = pos.sell_quantity * pos.sell_price;
                        }

                        pos.quantity = pos.buy_quantity - pos.sell_quantity;
                        pos.last_price = orderParams.price;

                        if (pos.quantity > 0) {
                            pos.average_price = pos.buy_price;
                        } else if (pos.quantity < 0) {
                            pos.average_price = pos.sell_price;
                        } else {
                            pos.average_price = 0;
                        }

                        const closedQty = Math.min(pos.buy_quantity, pos.sell_quantity);
                        pos.realised = (pos.sell_price - pos.buy_price) * closedQty;
                        pos.unrealised = (pos.last_price - pos.average_price) * pos.quantity;
                        pos.pnl = pos.realised + pos.unrealised;
                        pos.m2m = pos.pnl;
                        pos.value = pos.quantity * pos.last_price;

                        if (existingPosIndex > -1) {
                            newPositions[existingPosIndex] = pos;
                        } else {
                            newPositions.push(pos);
                        }

                        const totalPnL = newPositions.reduce((acc, p) => acc + p.pnl, 0);
                        const newMarginUsed = state.marginUsed + marginReq;
                        const available = (unifiedMargin.totalMargin || 500000) - newMarginUsed + totalPnL;

                        return {
                            orders: newOrders,
                            positions: newPositions,
                            activeOrderLines: newActiveLines,
                            marginUsed: newMarginUsed,
                            marginAvailable: available,
                            dailyPnL: totalPnL,
                            overallPnL: totalPnL,
                        };
                    });
                } catch (error: any) {
                    console.error("Order Execution Failed:", error);
                    // --- FAIL: Revert State ---
                    set((state: OrderState) => ({
                        orders: state.orders.map(o => o.id === tempId ? { ...o, status: 'REJECTED' as OrderStatus, rejectionReason: error.message } : o),
                        activeOrderLines: state.activeOrderLines.filter(l => l.linkedOrderId !== tempId)
                    }));
                }
            },

            placeBracketOrder: async (orderParams, slPrice, tpPrice) => {
                const { activeBroker } = useAuthStore.getState();
                const { isArmed } = useSafetyStore.getState();

                if (!isArmed) {
                    alert("⚠️ SAFETY LOCK ENGAGED\n\nDisarm the 'Nuclear Toggle' in the header to execute Bracket Orders.");
                    return;
                }

                try {
                    console.info(`[BRACKET] Executing ${orderParams.transactionType} ${orderParams.qty} ${orderParams.symbol} [SL: ${slPrice}, TP: ${tpPrice}]`);

                    // 1. Execute Main Entry (Mocking API response for now, assuming success like placeOrder)
                    const orderId = Math.random().toString(36).substring(7);

                    const newOrder: Order = {
                        ...orderParams,
                        id: orderId,
                        status: orderParams.orderType === 'MARKET' ? 'EXECUTED' : 'OPEN',
                        timestamp: Date.now(),
                    };

                    // 2. Create Order Lines for Bracket
                    const isBuy = orderParams.transactionType === 'BUY';
                    const oppositeSide = isBuy ? 'SELL' : 'BUY';

                    const lines: OrderLine[] = [
                        {
                            id: `${orderId}-entry`,
                            symbol: orderParams.symbol,
                            type: 'entry',
                            side: orderParams.transactionType,
                            price: orderParams.price,
                            qty: orderParams.qty,
                            draggable: orderParams.orderType !== 'MARKET',
                            linkedOrderId: orderId,
                            visible: true,
                        },
                        {
                            id: `${orderId}-sl`,
                            symbol: orderParams.symbol,
                            type: 'stopLoss',
                            side: oppositeSide,
                            price: slPrice,
                            qty: orderParams.qty,
                            draggable: true,
                            linkedOrderId: orderId,
                            visible: true,
                        },
                        {
                            id: `${orderId}-tp`,
                            symbol: orderParams.symbol,
                            type: 'target',
                            side: oppositeSide,
                            price: tpPrice,
                            qty: orderParams.qty,
                            draggable: true,
                            linkedOrderId: orderId,
                            visible: true,
                        }
                    ];

                    set((state) => ({
                        orders: [newOrder, ...state.orders],
                        activeOrderLines: [...state.activeOrderLines, ...lines],
                        lastOrderTime: Date.now()
                    }));

                    // Note: We bypass full position updates here for simplicity of the UI mock,
                    // but in a real scenario, this would trigger similar logic to `placeOrder`.

                } catch (error: any) {
                    console.error("Bracket Order Failed:", error);
                }
            },

            updateOrder: (orderId, updates) => set((state) => ({
                orders: state.orders.map(o => o.id === orderId ? { ...o, ...updates } : o)
            })),

            executeBlitz: (orderParams, config) => {
                const { placeOrder } = get();

                if (!config.enabled) {
                    placeOrder(orderParams);
                    return;
                }

                console.info(`[BLITZ] Initiating Institutional Blitz: ${orderParams.qty} Qty over ${config.slices} slices`);
                console.info(`[BLITZ] Mode: ${config.participationMode}, Anti-Detect: ${config.randomizeSizing ? 'ENABLED' : 'DISABLED'}`);

                let totalExecuted = 0;
                let currentSlice = 0;
                const totalTargetQty = orderParams.qty;

                const executeSlice = () => {
                    currentSlice++;

                    let sliceQty = 0;

                    if (currentSlice === config.slices) {
                        // Last slice takes everything remaining
                        sliceQty = totalTargetQty - totalExecuted;
                    } else {
                        // Base slice size
                        const baseQty = totalTargetQty / config.slices;

                        // Apply Participation Logic (VWAP Simulator)
                        // In VWAP_SYNC mode, we simulate a bell curve of participation
                        let participationFactor = 1.0;
                        if (config.participationMode === 'VWAP_SYNC') {
                            const progress = currentSlice / config.slices;
                            // Simple sine curve for intensity (0 to 1 back to 0)
                            participationFactor = 0.5 + Math.sin(progress * Math.PI) * 1.0;
                        }

                        sliceQty = Math.floor(baseQty * participationFactor);

                        // Apply Anti-Detect Randomization (+/- 15%)
                        if (config.randomizeSizing) {
                            const variance = 0.85 + (Math.random() * 0.3); // 0.85 to 1.15
                            sliceQty = Math.floor(sliceQty * variance);
                        }

                        // Sanity check
                        if (sliceQty < 1) sliceQty = 1;
                        if (totalExecuted + sliceQty >= totalTargetQty) {
                            sliceQty = totalTargetQty - totalExecuted - 1; // Leave 1 for last slice
                        }
                    }

                    if (sliceQty > 0) {
                        placeOrder({
                            ...orderParams,
                            qty: sliceQty
                        });
                        totalExecuted += sliceQty;
                        console.info(`[BLITZ] Slice ${currentSlice}/${config.slices} executed: ${sliceQty} Qty (Total: ${totalExecuted}/${totalTargetQty})`);
                    }

                    if (currentSlice < config.slices && totalExecuted < totalTargetQty) {
                        // Randomize interval slightly for anti-detect as well
                        const intervalMs = config.interval * 1000;
                        const jitter = config.randomizeSizing ? (Math.random() * 200 - 100) : 0;
                        setTimeout(executeSlice, Math.max(500, intervalMs + jitter));
                    } else {
                        console.info("[BLITZ] Institutional Multi-Slice Execution Complete.");
                        if (totalExecuted < totalTargetQty) {
                            console.warn(`[BLITZ] Under-filled by ${totalTargetQty - totalExecuted} qty due to rounding/logic. Finalizing...`);
                            placeOrder({ ...orderParams, qty: totalTargetQty - totalExecuted });
                        }
                    }
                };

                // Execute first slice
                executeSlice();
            },

            executeIceberg: (orderParams, disclosedQty) => {
                const { placeOrder } = get();
                const totalQty = orderParams.qty;
                let remainingQty = totalQty;

                console.info(`[ICEBERG] Initiating Simulated Iceberg: ${totalQty} Total Qty with ${disclosedQty} Disclosed Leg.`);

                const executeLeg = () => {
                    const currentLegQty = Math.min(disclosedQty, remainingQty);
                    if (currentLegQty <= 0) {
                        console.info("[ICEBERG] Strategy Complete.");
                        return;
                    }

                    console.info(`[ICEBERG] Placing disclosed leg: ${currentLegQty} Qty. (Remaining: ${remainingQty - currentLegQty})`);

                    placeOrder({
                        ...orderParams,
                        qty: currentLegQty,
                        disclosedQty: currentLegQty
                    });

                    remainingQty -= currentLegQty;

                    if (remainingQty > 0) {
                        // In a real scenario, we'd wait for the fill event.
                        // Here we simulate a fill after a randomized delay (3-8s)
                        const randomFillDelay = 3000 + Math.random() * 5000;
                        setTimeout(() => {
                            console.info(`[ICEBERG] Leg filled. Next leg incoming in 1s...`);
                            setTimeout(executeLeg, 1000);
                        }, randomFillDelay);
                    } else {
                        console.info("[ICEBERG] Final leg placed. Execution finished.");
                    }
                };

                executeLeg();
            },

            cancelOrder: async (orderId) => {
                const stateSnapshot = get();
                const { enqueueAction } = get();

                const order = stateSnapshot.orders.find(o => o.id === orderId);
                if (!order) return;

                if (typeof window !== 'undefined' && !navigator.onLine) {
                    console.warn("[OFFLINE] API disconnected. Queueing Order Cancel.");
                    enqueueAction({ action: 'CANCEL_ORDER', payload: { orderId } });
                    // We still do optimistic update below
                }

                // --- OPTIMISTIC UI: Update immediately ---
                const prevOrder = { ...order };
                const prevLines = stateSnapshot.activeOrderLines.filter(l => l.linkedOrderId === orderId).map(l => ({ ...l }));

                set((state) => ({
                    orders: state.orders.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o),
                    activeOrderLines: state.activeOrderLines.filter(l => l.linkedOrderId !== orderId),
                }));

                try {
                    console.info(`[EXECUTION] Attempting to cancel Order ID: ${orderId} via API bridge`);
                    const response = await fetch(`/api/orders/cancel?order_id=${orderId}`, {
                        method: 'DELETE',
                    });

                    const json = await response.json();

                    if (!response.ok || json.status !== 'success') {
                        throw new Error(json.error || 'Failed to cancel order on broker');
                    }

                    console.info(`[EXECUTION] Order ${orderId} successfully cancelled.`);
                } catch (error: any) {
                    console.error("Order Cancel Failed:", error);
                    // --- FAIL: Revert to Snapshot ---
                    set((state) => ({
                        orders: state.orders.map(o => o.id === orderId ? prevOrder : o),
                        activeOrderLines: [...state.activeOrderLines, ...prevLines],
                    }));
                    alert(`🚨 Order Cancellation Failed\n\nReason: ${error.message}\nYour order might still be live on the exchange.`);
                }
            },

            modifyOrder: async (orderId, updates) => {
                const stateSnapshot = get();
                const { enqueueAction } = get();

                const order = stateSnapshot.orders.find(o => o.id === orderId);
                if (!order) return;

                if (typeof window !== 'undefined' && !navigator.onLine) {
                    console.warn("[OFFLINE] Network disconnected. Queueing Order Modification.");
                    enqueueAction({ action: 'MODIFY_ORDER', payload: { orderId, updates } });
                }

                // --- OPTIMISTIC UI: Update immediately ---
                const prevOrder = { ...order };
                const prevLines = stateSnapshot.activeOrderLines.filter(l => l.linkedOrderId === orderId).map(l => ({ ...l }));

                set((state) => ({
                    orders: state.orders.map(o => o.id === orderId ? { ...o, ...updates } : o),
                    activeOrderLines: state.activeOrderLines.map(l =>
                        l.linkedOrderId === orderId ? { ...l, price: updates.price ?? l.price, qty: updates.qty ?? l.qty } : l
                    )
                }));

                try {
                    console.info(`[EXECUTION] Modifying Order ${orderId} -> Price: ${updates.price}, Qty: ${updates.qty}`);

                    const response = await fetch('/api/orders/modify', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            order_id: orderId,
                            price: updates.price,
                            quantity: updates.qty,
                            trigger_price: updates.triggerPrice,
                            order_type: order.orderType
                        })
                    });

                    const json = await response.json();
                    if (!response.ok || json.status !== 'success') {
                        throw new Error(json.error || json.message || 'Modification failed');
                    }
                    // Success, state already reflects this
                } catch (error: any) {
                    console.error("Order Modification Failed:", error);
                    // --- FAIL: Revert to Snapshot ---
                    set((state) => ({
                        orders: state.orders.map(o => o.id === orderId ? prevOrder : o),
                        activeOrderLines: state.activeOrderLines.map(l => {
                            if (l.linkedOrderId === orderId) {
                                const orig = prevLines.find(pl => pl.id === l.id);
                                return orig ? orig : l;
                            }
                            return l;
                        })
                    }));
                }
            },

            updatePositionLTP: (symbol: string, ltp: number) => set((state) => {
                const newPositions = state.positions.map(p => {
                    if (p.symbol === symbol) {
                        const unrealised = (ltp - p.average_price) * p.quantity;
                        const pnl = p.realised + unrealised;
                        return { ...p, last_price: ltp, unrealised, pnl, m2m: pnl };
                    }
                    return p;
                });

                const totalPnL = newPositions.reduce((acc, p) => acc + p.pnl, 0);

                return {
                    positions: newPositions,
                    dailyPnL: totalPnL,
                    overallPnL: totalPnL,
                    marginAvailable: 500000 - state.marginUsed + totalPnL
                };
            }),

            closePosition: async (symbol: string, price: number) => {
                const { enqueueAction } = get();
                if (typeof window !== 'undefined' && !navigator.onLine) {
                    console.warn(`[OFFLINE] Connection dropping. Queueing position close for ${symbol}`);
                    enqueueAction({ action: 'CLOSE_POSITION', payload: { symbol, price } });
                    return;
                }

                try {
                    console.info(`[EXECUTION] Attempting to close position for ${symbol}`);
                    const state = get();
                    const position = state.positions.find(p => p.symbol === symbol);
                    if (!position || position.quantity === 0) return;

                    const isNFO = symbol.includes('CE') || symbol.includes('PE') || symbol.includes('FUT');

                    const payload = {
                        tradingsymbol: symbol,
                        exchange: isNFO ? 'NFO' : 'NSE',
                        product: position.product
                    };

                    const response = await fetch('/api/portfolio/close', {
                        method: 'POST',
                        body: JSON.stringify(payload),
                        headers: { 'Content-Type': 'application/json' }
                    });

                    const json = await response.json();

                    if (!response.ok || json.status !== 'success') {
                        throw new Error(json.error || 'Failed to close the position on Broker');
                    }

                    // Broker accepted the close, now optimistic UI update & cleanup
                    set((s) => ({
                        positions: s.positions.filter(p => p.symbol !== symbol),
                        activeOrderLines: s.activeOrderLines.filter(l => l.symbol !== symbol)
                    }));

                    console.info(`[EXECUTION] Flattened position for ${symbol}`);
                } catch (error: any) {
                    console.error("Position Close Failed:", error);
                    alert(`🚨 Failed to close position\n\nReason: ${error.message}`);
                }
            },

            updateOrderLinePrice: (lineId: string, newPrice: number) => set((state) => ({
                activeOrderLines: state.activeOrderLines.map(l =>
                    l.id === lineId ? { ...l, price: Math.round(newPrice * 100) / 100 } : l
                ),
            })),

            commitOrderLinePrice: async (lineId) => {
                const { activeOrderLines, modifyOrder } = get();
                const line = activeOrderLines.find(l => l.id === lineId);
                if (line && line.draggable && line.linkedOrderId) {
                    await modifyOrder(line.linkedOrderId, { price: line.price });
                }
            },

            removeOrderLine: (lineId: string) => set((state) => ({
                activeOrderLines: state.activeOrderLines.filter(l => l.id !== lineId),
            })),

            removeOrderLinesForOrder: (orderId: string) => set((state) => ({
                activeOrderLines: state.activeOrderLines.filter(l => l.linkedOrderId !== orderId),
            })),

            flattenAll: async () => {
                const { positions, closePosition, orders, cancelOrder, enqueueAction } = get();

                if (typeof window !== 'undefined' && !navigator.onLine) {
                    console.warn("🆘 PANIC TRIGGERED OFFLINE. Queueing global flatten.");
                    enqueueAction({ action: 'FLATTEN_ALL' });
                    // Provide optimistic feedback
                    alert("⚠️ Disconnected! Panic command queued and will fire instantly upon reconnection.");
                    return;
                }

                console.warn("🆘 PANIC TRIGGERED: Flattening all positions and cancelling all orders.");

                // 1. Cancel all open orders
                const openOrders = orders.filter(o => o.status === 'OPEN');
                await Promise.all(openOrders.map(o => cancelOrder(o.id)));

                // 2. Close all positions
                await Promise.all(positions.map(p => closePosition(p.symbol, p.last_price)));

                console.info("🏁 PANIC EXECUTION COMPLETE. Account is safe.");
            },

            enqueueAction: (action) => set((state) => ({
                actionQueue: [
                    ...state.actionQueue,
                    { ...action, id: Math.random().toString(36).substring(7), timestamp: Date.now() }
                ]
            })),

            processQueue: async () => {
                const { actionQueue, placeOrder, cancelOrder, modifyOrder, closePosition, flattenAll } = get();
                if (actionQueue.length === 0) return;

                console.info(`[QUEUE] Processing ${actionQueue.length} offline actions...`);

                // Clear queue immediately to prevent infinite loops if they fail again
                set({ actionQueue: [] });

                for (const action of actionQueue) {
                    try {
                        switch (action.action) {
                            case 'PLACE_ORDER':
                                await placeOrder(action.payload);
                                break;
                            case 'CANCEL_ORDER':
                                await cancelOrder(action.payload.orderId);
                                break;
                            case 'MODIFY_ORDER':
                                await modifyOrder(action.payload.orderId, action.payload.updates);
                                break;
                            case 'CLOSE_POSITION':
                                await closePosition(action.payload.symbol, action.payload.price);
                                break;
                            case 'FLATTEN_ALL':
                                await flattenAll();
                                break;
                        }
                    } catch (e) {
                        console.error(`[QUEUE] Failed to process queued action ${action.action}:`, e);
                        // Re-add to queue if it fundamentally failed due to network? 
                        // For simplicity, we discard it if it fails on replay.
                    }
                }
            },
        }),
        {
            name: "pro-terminal-orders",
        }
    )
);
