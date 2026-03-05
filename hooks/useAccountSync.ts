/**
 * useAccountSync
 * 
 * Holistic Hook for bridging backend REST accounts with frontend Ticker/Risk Engine.
 * Handles:
 * 1. Global Margin Poll (Syncs with Kite Web 'Funds')
 * 2. Position Sync (Later Phase)
 * 3. Session Watchdog (via apiClient Interceptor)
 */

import { useEffect, useCallback } from 'react';
import { useAuthStore } from './useAuthStore';
import { useMarketStore } from './useMarketStore';
import { useOrderStore, Order, Position } from './useOrderStore';
import { apiClient } from '@/lib/api-client';

export function useAccountSync() {
    const activeBroker = useAuthStore(s => s.activeBroker);
    const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const updateUnifiedMargin = useMarketStore(s => s.updateUnifiedMargin);

    const lastOrderTime = useOrderStore(s => s.lastOrderTime);
    const setOrders = useOrderStore(s => s.setOrders);
    const setPositions = useOrderStore(s => s.setPositions);

    const syncAccounts = useCallback(async () => {
        if (!isLoggedIn || activeBroker !== 'KITE') return;

        try {
            const isMock = typeof window !== 'undefined' && window.location.search.includes("mock=true");

            const [marginRes, ordersRes, positionsRes] = await Promise.all([
                apiClient(isMock ? '/api/user/margins?mock=true' : '/api/user/margins').catch(() => null),
                apiClient(isMock ? '/api/orders/list?mock=true' : '/api/orders/list').catch(() => null),
                apiClient(isMock ? '/api/portfolio/positions?mock=true' : '/api/portfolio/positions').catch(() => null),
            ]);

            // Sync Margins
            if (marginRes && (marginRes.totalAvailable !== undefined || marginRes.brokers)) {
                updateUnifiedMargin({
                    totalMargin: marginRes.totalAvailable,
                    brokers: marginRes.brokers || {
                        [activeBroker]: {
                            available: marginRes.totalAvailable,
                            used: marginRes.netUsed,
                            util_percent: marginRes.util_percent
                        }
                    }
                });
            }

            // Sync Orders
            if (ordersRes && Array.isArray(ordersRes)) {
                const mappedOrders: Order[] = ordersRes.map((ko: any) => ({
                    id: ko.order_id,
                    symbol: ko.tradingsymbol,
                    transactionType: ko.transaction_type,
                    orderType: ko.order_type,
                    productType: ko.product,
                    qty: ko.quantity,
                    price: ko.price || ko.average_price || 0,
                    triggerPrice: ko.trigger_price,
                    status: (ko.status === 'COMPLETE' ? 'EXECUTED' : ko.status) as any,
                    timestamp: ko.order_timestamp ? new Date(ko.order_timestamp).getTime() : Date.now(),
                    rejectionReason: ko.status_message,
                    broker: ko.broker
                }));

                // Keep only today's relevant orders naturally managed by Kite
                // Exclude the 'UPDATE' historical filler if possible, but Kite natively returns today's orders
                setOrders(mappedOrders.reverse()); // Reverse to show latest first
            }

            // Sync Positions
            if (positionsRes && positionsRes.net && Array.isArray(positionsRes.net)) {
                const mappedPositions: Position[] = positionsRes.net.map((kp: any) => ({
                    ...kp,
                    symbol: kp.tradingsymbol, // Map tradingsymbol -> symbol
                    broker: kp.broker
                }));
                // We overwrite our local dummy positions with the true backend positions
                setPositions(mappedPositions);
            }

        } catch (error) {
            console.warn("[AccountSync] Sync failed", error);
        }
    }, [isLoggedIn, activeBroker, updateUnifiedMargin, setOrders, setPositions]);

    // Fast-Sync interval loop
    useEffect(() => {
        syncAccounts();
        const interval = setInterval(syncAccounts, 5000); // Poll every 5 seconds for snappier UI
        return () => clearInterval(interval);
    }, [syncAccounts]);

    // Force sync immediately when a local interaction (e.g., placeOrder button hit) triggers
    useEffect(() => {
        if (lastOrderTime > 0) {
            syncAccounts();
        }
    }, [lastOrderTime, syncAccounts]);
}
