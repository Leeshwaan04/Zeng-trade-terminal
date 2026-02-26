import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useAuthStore } from "./useAuthStore";
import { useMarketStore } from "./useMarketStore";
import { useSafetyStore } from "./useSafetyStore";

export type OrderType = 'LIMIT' | 'MARKET' | 'SL' | 'SL-M';
export type TransactionType = 'BUY' | 'SELL';
export type OrderStatus = 'OPEN' | 'EXECUTED' | 'REJECTED' | 'CANCELLED';
export type ProductType = 'MIS' | 'CNC' | 'NRML' | 'MTF';

export interface Order {
    id: string;
    symbol: string;
    transactionType: TransactionType;
    orderType: OrderType;
    productType: ProductType;
    qty: number;
    price: number;
    triggerPrice?: number;
    status: OrderStatus;
    timestamp: number;
    rejectionReason?: string;
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

    // Actions
    placeOrder: (order: Omit<Order, 'id' | 'status' | 'timestamp'>) => void;
    cancelOrder: (orderId: string) => void;
    updatePositionLTP: (symbol: string, ltp: number) => void;
    closePosition: (symbol: string, price: number) => void;
    updateOrderLinePrice: (lineId: string, newPrice: number) => void;
    removeOrderLine: (lineId: string) => void;
    removeOrderLinesForOrder: (orderId: string) => void;
    // Institutional Blitz
    executeBlitz: (orderParams: Omit<Order, 'id' | 'status' | 'timestamp'>, config: BlitzConfig) => void;
}

export interface BlitzConfig {
    enabled: boolean;
    slices: number;
    interval: number; // seconds
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

            placeOrder: (orderParams) => {
                const { activeBroker } = useAuthStore.getState();
                const { unifiedMargin } = useMarketStore.getState();
                const { isArmed } = useSafetyStore.getState();

                if (!isArmed) {
                    console.warn("⚠️ EXECUTION PREVENTED: Safety Trigger is ACTIVE (SAFE MODE).");
                    alert("⚠️ SAFETY LOCK ENGAGED\n\nDisarm the 'Nuclear Toggle' in the header to execute trades.");
                    return;
                }

                const orderId = Math.random().toString(36).substring(7);
                const newOrder: Order = {
                    ...orderParams,
                    id: orderId,
                    status: 'EXECUTED',
                    timestamp: Date.now(),
                };

                const marginReq = orderParams.qty * orderParams.price * (orderParams.productType === 'MIS' ? 0.2 : 1);

                // ─── Create Order Lines ──────────────────────
                const slPercent = 0.005; // 0.5% default SL
                const tpPercent = 0.01;  // 1.0% default TP
                const isBuy = orderParams.transactionType === 'BUY';

                const entryLine: OrderLine = {
                    id: `${orderId}-entry`,
                    symbol: orderParams.symbol,
                    type: 'entry',
                    side: orderParams.transactionType,
                    price: orderParams.price,
                    qty: orderParams.qty,
                    draggable: false,
                    linkedOrderId: orderId,
                    visible: true,
                };

                const slLine: OrderLine = {
                    id: `${orderId}-sl`,
                    symbol: orderParams.symbol,
                    type: 'stopLoss',
                    side: orderParams.transactionType,
                    price: isBuy
                        ? Math.round((orderParams.price * (1 - slPercent)) * 100) / 100
                        : Math.round((orderParams.price * (1 + slPercent)) * 100) / 100,
                    qty: orderParams.qty,
                    draggable: true,
                    linkedOrderId: orderId,
                    visible: true,
                };

                const tpLine: OrderLine = {
                    id: `${orderId}-tp`,
                    symbol: orderParams.symbol,
                    type: 'target',
                    side: orderParams.transactionType,
                    price: isBuy
                        ? Math.round((orderParams.price * (1 + tpPercent)) * 100) / 100
                        : Math.round((orderParams.price * (1 - tpPercent)) * 100) / 100,
                    qty: orderParams.qty,
                    draggable: true,
                    linkedOrderId: orderId,
                    visible: true,
                };

                set((state) => {
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
                        orders: [newOrder, ...state.orders],
                        positions: newPositions,
                        activeOrderLines: [...state.activeOrderLines, entryLine, slLine, tpLine],
                        marginUsed: newMarginUsed,
                        marginAvailable: available,
                        dailyPnL: totalPnL,
                        overallPnL: totalPnL,
                        lastOrderTime: Date.now()
                    };
                });

                console.info(`[BLITZ] Executing across ${activeBroker} gateway via Cyber-Pipes.`);
            },

            executeBlitz: (orderParams, config) => {
                const { placeOrder } = get();

                if (!config.enabled) {
                    placeOrder(orderParams);
                    return;
                }

                console.info(`[BLITZ] Initiating Institutional Blitz: ${orderParams.qty} Qty over ${config.slices} slices every ${config.interval}s`);

                const qtyPerSlice = Math.floor(orderParams.qty / config.slices);
                const remainder = orderParams.qty % config.slices;

                let currentSlice = 0;

                const executeSlice = () => {
                    currentSlice++;

                    // Add remainder to last slice to ensure total qty match
                    const sliceQty = currentSlice === config.slices ? qtyPerSlice + remainder : qtyPerSlice;

                    placeOrder({
                        ...orderParams,
                        qty: sliceQty
                    });

                    console.info(`[BLITZ] Slice ${currentSlice}/${config.slices} executed: ${sliceQty} Qty`);

                    if (currentSlice < config.slices) {
                        setTimeout(executeSlice, config.interval * 1000);
                    } else {
                        console.info("[BLITZ] Execution Complete.");
                    }
                };

                // Execute first slice immediately
                executeSlice();
            },

            cancelOrder: (orderId) => set((state) => ({
                orders: state.orders.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o),
                activeOrderLines: state.activeOrderLines.filter(l => l.linkedOrderId !== orderId),
            })),

            updatePositionLTP: (symbol, ltp) => set((state) => {
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

            closePosition: (symbol, price) => {
                const state = get();
                const position = state.positions.find(p => p.symbol === symbol);
                if (!position || position.quantity === 0) return;

                // Remove all order lines for this symbol
                set(s => ({
                    activeOrderLines: s.activeOrderLines.filter(l => l.symbol !== symbol)
                }));

                get().placeOrder({
                    symbol: position.symbol,
                    transactionType: position.quantity > 0 ? 'SELL' : 'BUY',
                    orderType: 'MARKET',
                    productType: position.product,
                    qty: Math.abs(position.quantity),
                    price: price
                });
            },

            // ─── Order Line Management ───────────────────────
            updateOrderLinePrice: (lineId, newPrice) => set((state) => ({
                activeOrderLines: state.activeOrderLines.map(l =>
                    l.id === lineId ? { ...l, price: Math.round(newPrice * 100) / 100 } : l
                ),
            })),

            removeOrderLine: (lineId) => set((state) => ({
                activeOrderLines: state.activeOrderLines.filter(l => l.id !== lineId),
            })),

            removeOrderLinesForOrder: (orderId) => set((state) => ({
                activeOrderLines: state.activeOrderLines.filter(l => l.linkedOrderId !== orderId),
            })),
        }),
        {
            name: "pro-terminal-orders",
        }
    )
);
