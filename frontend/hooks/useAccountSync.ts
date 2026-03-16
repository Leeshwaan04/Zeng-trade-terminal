/**
 * useAccountSync
 * 
 * Holistic Hook for bridging backend REST accounts with frontend Ticker/Risk Engine.
 * Handles:
 * 1. Global Margin Poll (Syncs with Kite Web 'Funds')
 * 2. Position Sync (Later Phase)
 * 3. Session Watchdog (via apiClient Interceptor)
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from './useAuthStore';
import { useMarketStore } from './useMarketStore';
import { useOrderStore, Order, Position } from './useOrderStore';
import { apiClient } from '@/lib/api-client';
import { MARKET_INSTRUMENTS } from '@/lib/market-config';
import { useToast } from '@/hooks/use-toast';

export function useAccountSync() {
    const activeBroker = useAuthStore(s => s.activeBroker);
    const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const logout = useAuthStore(s => s.logout);
    const mtfPrewarmed = useRef(false);
    const snapshotLoaded = useRef(false);
    const sessionExpiredNotified = useRef(false);
    const updateUnifiedMargin = useMarketStore(s => s.updateUnifiedMargin);
    const updateTickers = useMarketStore(s => s.updateTickers);
    const { toast } = useToast();

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
                    // Kite API does not return a broker field — set it explicitly
                    broker: 'KITE',
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

        } catch (error: any) {
            // 401 means the Kite access token has expired (happens at 6 AM IST).
            // Detect it once and prompt the user to re-login — don't silently show stale data.
            if (error?.status === 401 || error?.message?.includes("401") || error?.message?.toLowerCase().includes("token")) {
                if (!sessionExpiredNotified.current) {
                    sessionExpiredNotified.current = true;
                    console.warn("[AccountSync] Kite session expired — prompting re-login");
                    toast({
                        title: "Session Expired",
                        description: "Your Kite session has expired. Please log in again to continue trading.",
                        variant: "destructive",
                    });
                    // Clear client-side auth state so login screen shows
                    await logout();
                }
                return;
            }
            console.warn("[AccountSync] Sync failed", error);
        }
    }, [isLoggedIn, activeBroker, updateUnifiedMargin, setOrders, setPositions, logout, toast]);

    // Fire MTF pre-warm + OHLC snapshot once immediately after Kite login
    useEffect(() => {
        if (!isLoggedIn || activeBroker !== 'KITE') return;

        // MTF history pre-warm (runs once)
        if (!mtfPrewarmed.current) {
            mtfPrewarmed.current = true;
            fetch('/api/kite/mtf-prewarm', { method: 'POST' })
                .then(r => r.json())
                .then(d => console.log('[AccountSync] MTF prewarm:', d.summary))
                .catch(e => console.warn('[AccountSync] MTF prewarm failed:', e));
        }

        // OHLC snapshot — pre-fills watchlist with real prices before WS connects (runs once)
        if (!snapshotLoaded.current) {
            snapshotLoaded.current = true;
            const tokens = MARKET_INSTRUMENTS.map(i => i.token).filter(Boolean).join(',');
            fetch(`/api/kite/snapshot?tokens=${tokens}`)
                .then(r => r.json())
                .then(json => {
                    if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
                        updateTickers(json.data);
                        console.log(`[AccountSync] Snapshot loaded ${json.data.length} instruments`);
                    }
                })
                .catch(e => console.warn('[AccountSync] Snapshot failed:', e));

            // Profile Sync — Refresh user metadata from Kite
            fetch('/api/kite/profile')
                .then(r => r.json())
                .then(json => {
                    if (json.status === 'success' && json.data) {
                        const kd = json.data;
                        // Partial update of profile data
                        useAuthStore.getState().setUser({
                            user_id: kd.user_id,
                            user_name: kd.user_name,
                            user_shortname: kd.user_shortname,
                            email: kd.email,
                            avatar_url: kd.avatar_url
                        } as any);
                        console.log('[AccountSync] Profile updated:', kd.user_name);
                    }
                })
                .catch(e => console.warn('[AccountSync] Profile fetch failed:', e));
        }
    }, [isLoggedIn, activeBroker, updateTickers]);

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
