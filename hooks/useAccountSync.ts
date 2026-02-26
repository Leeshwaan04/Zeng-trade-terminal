/**
 * useAccountSync
 * 
 * Holistic Hook for bridging backend REST accounts with frontend Ticker/Risk Engine.
 * Handles:
 * 1. Global Margin Poll (Syncs with Kite Web 'Funds')
 * 2. Position Sync (Later Phase)
 * 3. Session Watchdog (via apiClient Interceptor)
 */

import { useEffect } from 'react';
import { useAuthStore } from './useAuthStore';
import { useMarketStore } from './useMarketStore';
import { useOrderStore } from './useOrderStore';
import { apiClient } from '@/lib/api-client';

export function useAccountSync() {
    const activeBroker = useAuthStore(s => s.activeBroker);
    const isLoggedIn = useAuthStore(s => s.isLoggedIn);
    const updateUnifiedMargin = useMarketStore(s => s.updateUnifiedMargin);
    const lastOrderTime = useOrderStore(s => s.lastOrderTime);

    // Sync Logic
    useEffect(() => {
        // Only run for KITE/LIVE or if user specifically wants Real Data
        // For PAPER, we might want to simulate (or just show 0 margin used for now)
        if (!isLoggedIn) return;

        const syncMargins = async () => {
            if (activeBroker !== 'KITE') return; // Only Kite supported for now

            try {
                // Fetch Unified Margins
                // Expects { status: 'success', data: { totalAvailable: number, netUsed: number, ... } }
                const isMock = typeof window !== 'undefined' && window.location.search.includes("mock=true");
                const url = isMock ? '/api/user/margins?mock=true' : '/api/user/margins';

                const data: any = await apiClient(url);

                if (data && typeof data.totalAvailable === 'number') {
                    updateUnifiedMargin({
                        totalMargin: data.totalAvailable,
                        brokers: {
                            [activeBroker]: {
                                available: data.totalAvailable,
                                used: data.netUsed,
                                util_percent: data.util_percent
                            }
                        }
                    });
                }
            } catch (error) {
                console.warn("[AccountSync] Margin fetch failed", error);
            }
        };

        // Initial Sync
        syncMargins();

        // Event-Driven Sync (On Order Completion)
        if (lastOrderTime > 0) {
            syncMargins();
        }

        // Polling (Every 30s as per plan)
        const interval = setInterval(syncMargins, 30000);

        return () => clearInterval(interval);
    }, [isLoggedIn, activeBroker, lastOrderTime, updateUnifiedMargin]);
}
